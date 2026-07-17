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
// Loaded exclusively through next/dynamic (ssr: false) so three.js stays in its own chunk.
import { Canvas, extend, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { FC, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
    cellKey,
    FrontViewData,
    occupancyColor,
    positionColor,
    StatusCodes,
    TopViewData
} from '../occupancyModel';
import { buildAggTooltip, buildLocationsTooltip, OccupancyLabels } from './occupancyTooltips';

extend({ OrbitControls });

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace JSX {
        interface IntrinsicElements {
            orbitControls: any;
        }
    }
}

export interface IOccupancy3DViewProps {
    kind: 'block' | 'aisle';
    topData?: TopViewData;
    frontData?: FrontViewData;
    codes: StatusCodes;
    labels: OccupancyLabels;
    onDrillDown?: (aisle: string, column: string) => void;
}

// z-distance between two aisle rows in block mode: with 0.86-deep racks this leaves a
// walkable ~1.1-unit corridor the camera can dive into (orbit/zoom/pan)
const AISLE_SPACING = 2;

type Instance3D = {
    x: number;
    y: number;
    z: number;
    sx: number;
    sy: number;
    sz: number;
    color: string;
    aisle?: string;
    column?: string;
    tooltip: () => ReactNode;
};

const Wrapper3D = styled.div`
    position: relative;
    overflow: hidden;
    height: 560px;
    border: 1px solid rgba(5, 5, 5, 0.08);
    border-radius: 8px;
    background: #f5f5f5;
`;

const Tooltip3D = styled.div`
    position: absolute;
    z-index: 10;
    max-width: 280px;
    padding: 8px 10px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.88);
    color: #fff;
    font-size: 12px;
    line-height: 1.6;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    pointer-events: none;
`;

const Controls: FC = () => {
    const { camera, gl } = useThree();
    const controlsRef = useRef<any>(null);
    useEffect(() => {
        const controls = controlsRef.current;
        return () => controls?.dispose?.();
    }, []);
    return (
        <orbitControls
            ref={controlsRef}
            args={[camera, gl.domElement]}
            enableDamping={false}
            maxPolarAngle={Math.PI / 2 - 0.02}
        />
    );
};

const InstancedCells: FC<{
    instances: Instance3D[];
    onHover: (index: number | null, event?: ThreeEvent<PointerEvent>) => void;
    onClickInstance?: (index: number) => void;
}> = ({ instances, onHover, onClickInstance }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);

    useEffect(() => {
        const mesh = meshRef.current;
        if (!mesh) return;
        const hadInstanceColor = mesh.instanceColor !== null;
        const dummy = new THREE.Object3D();
        const color = new THREE.Color();
        instances.forEach((instance, index) => {
            dummy.position.set(instance.x, instance.y, instance.z);
            dummy.scale.set(instance.sx, instance.sy, instance.sz);
            dummy.updateMatrix();
            mesh.setMatrixAt(index, dummy.matrix);
            mesh.setColorAt(index, color.set(instance.color));
        });
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        if (!hadInstanceColor) {
            // setColorAt just created instanceColor: recompile the material in case the
            // shader program was first built before the attribute existed
            (mesh.material as THREE.Material).needsUpdate = true;
        }
        mesh.computeBoundingSphere();
    }, [instances]);

    return (
        <instancedMesh
            // instanced meshes have a fixed capacity: remount when the count changes
            key={instances.length}
            ref={meshRef}
            args={[undefined as any, undefined as any, instances.length]}
            onPointerMove={(event) => {
                event.stopPropagation();
                onHover(event.instanceId ?? null, event);
            }}
            onPointerOut={() => onHover(null)}
            onClick={(event) => {
                event.stopPropagation();
                if (onClickInstance && event.instanceId !== undefined) {
                    onClickInstance(event.instanceId);
                }
            }}
        >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#ffffff" roughness={0.55} metalness={0.05} />
        </instancedMesh>
    );
};

const Occupancy3DView: FC<IOccupancy3DViewProps> = ({
    kind,
    topData,
    frontData,
    codes,
    labels,
    onDrillDown
}: IOccupancy3DViewProps) => {
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const [hovered, setHovered] = useState<{ index: number; x: number; y: number } | null>(null);

    const instances = useMemo<Instance3D[]>(() => {
        const result: Instance3D[] = [];
        if (kind === 'block' && topData) {
            let maxTotal = 1;
            topData.cells.forEach((agg) => {
                if (agg.total > maxTotal) maxTotal = agg.total;
            });
            topData.aisles.forEach((aisle, rowIndex) => {
                topData.columns.forEach((column, colIndex) => {
                    const agg = topData.cells.get(cellKey(aisle, column));
                    if (!agg) return;
                    // stack height reflects how many locations the (aisle, column) pile holds
                    const height = 0.25 + (agg.total / maxTotal) * 5.75;
                    result.push({
                        x: colIndex,
                        y: height / 2,
                        z: rowIndex * AISLE_SPACING,
                        sx: 0.86,
                        sy: height,
                        sz: 0.86,
                        color: occupancyColor(agg).fill,
                        aisle,
                        column,
                        tooltip: () =>
                            buildAggTooltip(
                                `${labels.aisle} ${aisle} / ${labels.column} ${column}`,
                                agg,
                                labels
                            )
                    });
                });
            });
        } else if (kind === 'aisle' && frontData) {
            frontData.columns.forEach((column, colIndex) => {
                frontData.levels.forEach((level, levelIndex) => {
                    const bucket = frontData.cells.get(cellKey(column, level));
                    if (!bucket) return;
                    // the tooltip lists the whole bucket: share one closure per (column, level)
                    const tooltip = () =>
                        buildLocationsTooltip(
                            `${labels.column} ${column} / ${labels.level} ${level}`,
                            bucket,
                            codes,
                            labels
                        );
                    // positions are side-by-side sections of the (column, level) bay, all
                    // visible from the front (same layout as the 2D front-view stripes) —
                    // they are NOT depth slots behind each other
                    const slotWidth = 0.86 / bucket.length;
                    bucket.forEach((location, positionIndex) => {
                        result.push({
                            x: colIndex - 0.43 + (positionIndex + 0.5) * slotWidth,
                            y: levelIndex + 0.5,
                            z: 0,
                            sx: bucket.length === 1 ? 0.86 : slotWidth * 0.82,
                            sy: 0.86,
                            sz: 0.86,
                            color: positionColor(location.status, codes),
                            tooltip
                        });
                    });
                });
            });
        }
        return result;
    }, [kind, topData, frontData, codes, labels]);

    const { width, depth } = useMemo(() => {
        if (kind === 'block' && topData) {
            // depth is the z-extent: aisle rows are spaced out to leave walkable corridors
            return {
                width: topData.columns.length,
                depth: (topData.aisles.length - 1) * AISLE_SPACING + 1
            };
        }
        if (kind === 'aisle' && frontData) {
            // the aisle renders as a single rack face: positions sit side by side, not in depth
            return { width: frontData.columns.length, depth: 1 };
        }
        return { width: 1, depth: 1 };
    }, [kind, topData, frontData]);

    const cameraDistance = Math.max(width, depth, 8) * 1.15;

    // pointer moves fire at pointer frequency: coalesce the hover state to one update
    // per animation frame (same pattern as the 2D grid) to keep render pressure low
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

    const handleClickInstance =
        kind === 'block' && onDrillDown
            ? (index: number) => {
                  const instance = instances[index];
                  if (instance?.aisle !== undefined && instance?.column !== undefined) {
                      onDrillDown(instance.aisle, instance.column);
                  }
              }
            : undefined;

    const hoveredInstance = hovered ? instances[hovered.index] : null;

    return (
        <Wrapper3D
            ref={wrapperRef}
            data-testid="occupancy-3d-view"
            style={{ cursor: hoveredInstance && handleClickInstance ? 'pointer' : 'default' }}
        >
            <Canvas
                dpr={[1, 2]}
                camera={{
                    position: [cameraDistance * 0.75, cameraDistance * 0.7, cameraDistance * 0.75],
                    fov: 45,
                    near: 0.1,
                    far: 4000
                }}
            >
                <color attach="background" args={['#f5f5f5']} />
                <ambientLight intensity={0.8} />
                <directionalLight
                    position={[width, Math.max(width, depth), depth]}
                    intensity={0.9}
                />
                <group position={[-(width - 1) / 2, 0, -(depth - 1) / 2]}>
                    <InstancedCells
                        instances={instances}
                        onHover={handleHover}
                        onClickInstance={handleClickInstance}
                    />
                    <mesh
                        rotation={[-Math.PI / 2, 0, 0]}
                        position={[(width - 1) / 2, -0.02, (depth - 1) / 2]}
                    >
                        <planeGeometry args={[width + 6, depth + 6]} />
                        <meshStandardMaterial color="#e8e8e8" />
                    </mesh>
                </group>
                <Controls />
            </Canvas>
            {hoveredInstance ? (
                <Tooltip3D style={{ left: hovered!.x + 14, top: hovered!.y + 14 }}>
                    {hoveredInstance.tooltip()}
                </Tooltip3D>
            ) : null}
        </Wrapper3D>
    );
};

Occupancy3DView.displayName = 'Occupancy3DView';

export default Occupancy3DView;
