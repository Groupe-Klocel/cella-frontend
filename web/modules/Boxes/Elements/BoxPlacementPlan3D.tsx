/**
CELLA Frontend
Website and Mobile templates that can be used to communicate
with CELLA WMS APIs.
Copyright (C) 2023 KLOCEL <contact@klocel.com>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
**/
// 3D view of a parcel's packing plan (`handlingUnitOutbound.placementPlan`, written by the cubing
// function from what the `cube` mutation returned). Loaded exclusively through next/dynamic
// (ssr: false) so three.js stays in its own chunk.
//
// Plan frame (see `PlacementOutput` in the API): millimetres from the container's inner bottom
// corner, x along its length, y its width, z its height (up). Each placement gives the room the
// pack takes along x/y/z; the pack's centre is the centre of that room. A pack lying straight
// fills its room exactly; a tilted one is drawn with its declared dimensions turned by `rotation`
// (3x3, row by row, columns = directions of its declared length, width and height).
import { Canvas, extend, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

extend({ OrbitControls });

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace JSX {
        interface IntrinsicElements {
            orbitControls: any;
        }
    }
}

export type PlanAxis = 'X' | 'Y' | 'Z';

export type PlanPlacement = {
    contentId: string;
    contentConfigId: string;
    pack: number;
    x: number;
    y: number;
    z: number;
    length: number;
    width: number;
    height: number;
    tilted: boolean;
    rotation: number[] | null;
};

export type PlacementPlan = {
    containerName: string | null;
    insideLength: number;
    insideWidth: number;
    insideHeight: number;
    upAxis: PlanAxis | null;
    placements: PlanPlacement[];
};

// what the tooltip says about a pack: its article LU and article
export type PackInfo = {
    articleName?: string | null;
    articleDescription?: string | null;
    luName?: string | null;
    quantity?: number | null;
    length?: number | null;
    width?: number | null;
    height?: number | null;
};

export interface IBoxPlacementPlan3DProps {
    plan: PlacementPlan;
    // keyed by placement index
    packInfos: (PackInfo | undefined)[];
}

// distinct, readable on a light background; one colour per article LU of the parcel
const PALETTE = [
    '#4e79a7',
    '#f28e2b',
    '#59a14f',
    '#e15759',
    '#b07aa1',
    '#76b7b2',
    '#edc948',
    '#ff9da7',
    '#9c755f',
    '#86bcb6',
    '#d37295',
    '#a0cbe8'
];

const Wrapper3D = styled.div`
    position: relative;
    overflow: hidden;
    height: 62vh;
    min-height: 360px;
    border: 1px solid rgba(5, 5, 5, 0.08);
    border-radius: 8px;
    background: #f5f5f5;
`;

const Tooltip3D = styled.div`
    position: absolute;
    z-index: 10;
    max-width: 320px;
    padding: 8px 10px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.88);
    color: #fff;
    font-size: 12px;
    line-height: 1.6;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    pointer-events: none;
`;

const Legend = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    margin-top: 12px;
    font-size: 12px;

    span.swatch {
        display: inline-block;
        width: 12px;
        height: 12px;
        margin-right: 6px;
        border-radius: 2px;
        vertical-align: middle;
    }
`;

const Controls: FC<{ target: [number, number, number] }> = ({ target }) => {
    const { camera, gl } = useThree();
    const controlsRef = useRef<any>(null);
    useEffect(() => {
        const controls = controlsRef.current;
        if (controls) {
            controls.target.set(...target);
            controls.update();
        }
        return () => controls?.dispose?.();
    }, [target[0], target[1], target[2]]);
    return <orbitControls ref={controlsRef} args={[camera, gl.domElement]} enableDamping={false} />;
};

// a box outline, its geometry disposed with the component
const BoxEdges: FC<{ size: [number, number, number]; color: string }> = ({ size, color }) => {
    const geometry = useMemo(
        () => new THREE.EdgesGeometry(new THREE.BoxGeometry(...size)),
        [size[0], size[1], size[2]]
    );
    useEffect(() => () => geometry.dispose(), [geometry]);
    return (
        <lineSegments geometry={geometry}>
            <lineBasicMaterial color={color} />
        </lineSegments>
    );
};

type PackMesh = {
    index: number;
    center: [number, number, number];
    size: [number, number, number];
    quaternion: THREE.Quaternion | null;
    color: string;
};

const BoxPlacementPlan3D: FC<IBoxPlacementPlan3DProps> = ({ plan, packInfos }) => {
    const { t } = useTranslation();
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const [hovered, setHovered] = useState<{ index: number; x: number; y: number } | null>(null);

    const L = plan.insideLength;
    const W = plan.insideWidth;
    const H = plan.insideHeight;

    // one colour per article LU, in order of first appearance
    const colorOf = useMemo(() => {
        const map = new Map<string, string>();
        plan.placements.forEach((placement) => {
            if (!map.has(placement.contentConfigId)) {
                map.set(placement.contentConfigId, PALETTE[map.size % PALETTE.length]);
            }
        });
        return map;
    }, [plan]);

    const meshes = useMemo<PackMesh[]>(
        () =>
            plan.placements.map((placement, index) => {
                const center: [number, number, number] = [
                    placement.x + placement.length / 2,
                    placement.y + placement.width / 2,
                    placement.z + placement.height / 2
                ];
                const info = packInfos[index];
                const declared = [info?.length, info?.width, info?.height];
                const rotation = placement.rotation;
                // tilted: the declared box turned by `rotation`; otherwise the room is the pack
                if (
                    placement.tilted &&
                    rotation?.length === 9 &&
                    declared.every((value) => typeof value === 'number' && value > 0)
                ) {
                    const matrix = new THREE.Matrix4().set(
                        rotation[0],
                        rotation[1],
                        rotation[2],
                        0,
                        rotation[3],
                        rotation[4],
                        rotation[5],
                        0,
                        rotation[6],
                        rotation[7],
                        rotation[8],
                        0,
                        0,
                        0,
                        0,
                        1
                    );
                    return {
                        index,
                        center,
                        size: declared as [number, number, number],
                        quaternion: new THREE.Quaternion().setFromRotationMatrix(matrix),
                        color: colorOf.get(placement.contentConfigId)!
                    };
                }
                return {
                    index,
                    center,
                    size: [placement.length, placement.width, placement.height],
                    quaternion: null,
                    color: colorOf.get(placement.contentConfigId)!
                };
            }),
        [plan, packInfos, colorOf]
    );

    // the axis pointing up while packing: Z unless the parcel was packed with its container on
    // its side; turn the container so that axis is up (proper rotations, never a mirror)
    const upRotation: [number, number, number] =
        plan.upAxis === 'X'
            ? [0, -Math.PI / 2, 0]
            : plan.upAxis === 'Y'
              ? [Math.PI / 2, 0, 0]
              : [0, 0, 0];
    const upHeight = plan.upAxis === 'X' ? L : plan.upAxis === 'Y' ? W : H;

    // millimetres -> metres; camera framed on the container's bounding sphere, whatever its pose
    const size = Math.max(L, W, H) / 1000;
    const target: [number, number, number] = [0, upHeight / 2000, 0];
    const radius = Math.sqrt(L * L + W * W + H * H) / 2000;
    const distance = (radius / Math.sin((45 / 2) * (Math.PI / 180))) * 1.1;
    const direction = new THREE.Vector3(1.05, 0.95, 1.3).normalize().multiplyScalar(distance);
    const cameraPosition: [number, number, number] = [
        direction.x,
        target[1] + direction.y,
        direction.z
    ];

    // pointer moves fire at pointer frequency: coalesce the hover state to one update per frame
    const pendingHoverRef = useRef<{ index: number; x: number; y: number } | null>(null);
    const hoverRafRef = useRef(0);
    useEffect(() => {
        return () => {
            if (hoverRafRef.current) cancelAnimationFrame(hoverRafRef.current);
        };
    }, []);
    const handleHover = (index: number | null, event?: ThreeEvent<PointerEvent>) => {
        if (index === null || !event) {
            pendingHoverRef.current = null;
        } else {
            const rect = wrapperRef.current?.getBoundingClientRect();
            pendingHoverRef.current = {
                index,
                x: event.clientX - (rect?.left ?? 0),
                y: event.clientY - (rect?.top ?? 0)
            };
        }
        if (!hoverRafRef.current) {
            hoverRafRef.current = requestAnimationFrame(() => {
                hoverRafRef.current = 0;
                setHovered(pendingHoverRef.current);
            });
        }
    };

    const legend = useMemo(() => {
        const entries = new Map<string, { color: string; label: string; packs: number }>();
        plan.placements.forEach((placement, index) => {
            const entry = entries.get(placement.contentConfigId);
            if (entry) {
                entry.packs += 1;
                return;
            }
            const info = packInfos[index];
            entries.set(placement.contentConfigId, {
                color: colorOf.get(placement.contentConfigId)!,
                label: info?.articleName ?? placement.contentConfigId,
                packs: 1
            });
        });
        return Array.from(entries.values());
    }, [plan, packInfos, colorOf]);

    const hoveredPlacement = hovered ? plan.placements[hovered.index] : null;
    const hoveredInfo = hovered ? packInfos[hovered.index] : undefined;
    const dimensions = (info: PackInfo | undefined, placement: PlanPlacement) =>
        info?.length && info?.width && info?.height
            ? `${info.length} × ${info.width} × ${info.height} mm`
            : `${placement.length} × ${placement.width} × ${placement.height} mm`;

    return (
        <>
            <Wrapper3D ref={wrapperRef} data-testid="box-placement-plan-3d">
                <Canvas
                    dpr={[1, 2]}
                    camera={{ position: cameraPosition, fov: 45, near: 0.01, far: 100 }}
                >
                    <color attach="background" args={['#f5f5f5']} />
                    <ambientLight intensity={0.75} />
                    <directionalLight position={[size * 2, size * 3, size * 1.5]} intensity={0.9} />
                    <directionalLight position={[-size * 2, size, -size * 2]} intensity={0.3} />
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]}>
                        <planeGeometry args={[size * 4, size * 4]} />
                        <meshStandardMaterial color="#e8e8e8" />
                    </mesh>
                    {/* plan frame (z up) -> three.js frame (y up), then millimetres -> metres */}
                    <group rotation={[-Math.PI / 2, 0, 0]} scale={0.001}>
                        <group position={[0, 0, upHeight / 2]}>
                            <group rotation={upRotation}>
                                <group position={[-L / 2, -W / 2, -H / 2]}>
                                    <group position={[L / 2, W / 2, H / 2]}>
                                        <BoxEdges size={[L, W, H]} color="#595959" />
                                    </group>
                                    <mesh position={[L / 2, W / 2, 0.5]}>
                                        <boxGeometry args={[L, W, 1]} />
                                        <meshStandardMaterial
                                            color="#c8a165"
                                            transparent
                                            opacity={0.35}
                                        />
                                    </mesh>
                                    {meshes.map((pack) => {
                                        // a hairline gap so that neighbouring packs stay distinct
                                        const gap = Math.min(2, Math.min(...pack.size) * 0.04);
                                        const isHovered = hovered?.index === pack.index;
                                        return (
                                            <group
                                                key={pack.index}
                                                position={pack.center}
                                                quaternion={pack.quaternion ?? undefined}
                                            >
                                                <mesh
                                                    onPointerMove={(event) => {
                                                        event.stopPropagation();
                                                        handleHover(pack.index, event);
                                                    }}
                                                    onPointerOut={() => handleHover(null)}
                                                >
                                                    <boxGeometry
                                                        args={[
                                                            pack.size[0] - gap,
                                                            pack.size[1] - gap,
                                                            pack.size[2] - gap
                                                        ]}
                                                    />
                                                    <meshStandardMaterial
                                                        color={pack.color}
                                                        emissive={
                                                            isHovered ? pack.color : '#000000'
                                                        }
                                                        emissiveIntensity={isHovered ? 0.6 : 0}
                                                        roughness={0.6}
                                                        metalness={0.05}
                                                    />
                                                </mesh>
                                                <BoxEdges
                                                    size={[
                                                        pack.size[0] - gap,
                                                        pack.size[1] - gap,
                                                        pack.size[2] - gap
                                                    ]}
                                                    color={isHovered ? '#000000' : '#3a3a3a'}
                                                />
                                            </group>
                                        );
                                    })}
                                </group>
                            </group>
                        </group>
                    </group>
                    <Controls target={target} />
                </Canvas>
                {hovered && hoveredPlacement ? (
                    <Tooltip3D style={{ left: hovered.x + 14, top: hovered.y + 14 }}>
                        <div>
                            <b>{hoveredInfo?.articleName ?? hoveredPlacement.contentConfigId}</b>
                        </div>
                        {hoveredInfo?.articleDescription ? (
                            <div>{hoveredInfo.articleDescription}</div>
                        ) : null}
                        {hoveredInfo?.luName ? (
                            <div>
                                {t('common:logistic-unit')} : {hoveredInfo.luName}
                            </div>
                        ) : null}
                        {hoveredInfo?.quantity !== undefined && hoveredInfo?.quantity !== null ? (
                            <div>
                                {t('d:quantity')} : {hoveredInfo.quantity}
                            </div>
                        ) : null}
                        <div>
                            {t('common:dimensions')} : {dimensions(hoveredInfo, hoveredPlacement)}
                        </div>
                        <div>
                            {t('common:pack')} {hoveredPlacement.pack}
                        </div>
                    </Tooltip3D>
                ) : null}
            </Wrapper3D>
            <Legend>
                {legend.map((entry) => (
                    <div key={entry.label + entry.color}>
                        <span className="swatch" style={{ background: entry.color }} />
                        {entry.label} × {entry.packs}
                    </div>
                ))}
            </Legend>
        </>
    );
};

BoxPlacementPlan3D.displayName = 'BoxPlacementPlan3D';

export default BoxPlacementPlan3D;
