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
// Header button of a parcel (outbound handling unit) detail: shown only when the parcel has a
// packing plan (`placementPlan`, written by the cubing function), it opens the plan in 3D.
// The plan is read by its own query rather than through the model: the detail component flattens
// its record, which would turn the plan into dozens of stray fields.
import { CodeSandboxOutlined } from '@ant-design/icons';
import { ContentSpin } from '@components';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Button, Modal } from 'antd';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import dynamic from 'next/dynamic';
import { FC, useEffect, useState } from 'react';
import type { PackInfo, PlacementPlan, PlanAxis } from './BoxPlacementPlan3D';

const BoxPlacementPlan3D = dynamic(() => import('./BoxPlacementPlan3D'), {
    ssr: false,
    loading: () => <ContentSpin />
});

const AXES = ['X', 'Y', 'Z'];

// the cubing function stores the `cube` output (camelCase); tolerate snake_case and a JSON string
const pick = (source: any, camel: string, snake: string) => source?.[camel] ?? source?.[snake];

export const normalizePlacementPlan = (raw: any): PlacementPlan | null => {
    let plan = raw;
    if (typeof plan === 'string') {
        try {
            plan = JSON.parse(plan);
        } catch {
            return null;
        }
    }
    if (!plan || typeof plan !== 'object' || !Array.isArray(plan.placements)) return null;
    const insideLength = Number(pick(plan, 'insideLength', 'inside_length'));
    const insideWidth = Number(pick(plan, 'insideWidth', 'inside_width'));
    const insideHeight = Number(pick(plan, 'insideHeight', 'inside_height'));
    if (!(insideLength > 0 && insideWidth > 0 && insideHeight > 0)) return null;
    const placements = plan.placements.map((placement: any) => ({
        contentId: String(pick(placement, 'contentId', 'content_id') ?? ''),
        contentConfigId: String(pick(placement, 'contentConfigId', 'content_config_id') ?? ''),
        pack: Number(placement.pack ?? 0),
        x: Number(placement.x ?? 0),
        y: Number(placement.y ?? 0),
        z: Number(placement.z ?? 0),
        length: Number(placement.length ?? 0),
        width: Number(placement.width ?? 0),
        height: Number(placement.height ?? 0),
        tilted: !!placement.tilted,
        rotation: Array.isArray(placement.rotation) ? placement.rotation.map(Number) : null
    }));
    if (placements.length === 0) return null;
    const upAxis = pick(plan, 'upAxis', 'up_axis');
    return {
        containerName: pick(plan, 'containerName', 'container_name') ?? null,
        insideLength,
        insideWidth,
        insideHeight,
        upAxis: AXES.includes(upAxis) ? (upAxis as PlanAxis) : null,
        placements
    };
};

const planQuery = gql`
    query BoxPlacementPlan($id: String!) {
        handlingUnitOutbound(id: $id) {
            id
            placementPlan
        }
    }
`;

// a placement's content config is an article LU, its content a delivery line
const packInfosQuery = gql`
    query BoxPlacementPlanPacks(
        $luFilters: ArticleLuSearchFilters
        $lineFilters: DeliveryLineSearchFilters
        $itemsPerPage: Int!
    ) {
        articleLus(filters: $luFilters, page: 1, itemsPerPage: $itemsPerPage) {
            results {
                id
                name
                quantity
                length
                width
                height
                article {
                    name
                    description
                }
            }
        }
        deliveryLines(filters: $lineFilters, page: 1, itemsPerPage: $itemsPerPage) {
            results {
                id
                article {
                    name
                    description
                }
            }
        }
    }
`;

export interface IBoxPlacementPlanButtonProps {
    boxId: string | string[] | undefined;
}

export const BoxPlacementPlanButton: FC<IBoxPlacementPlanButtonProps> = ({ boxId }) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const [plan, setPlan] = useState<PlacementPlan | null>(null);
    const [open, setOpen] = useState(false);
    const [packInfos, setPackInfos] = useState<(PackInfo | undefined)[] | null>(null);

    useEffect(() => {
        setPlan(null);
        setPackInfos(null);
        if (!boxId || Array.isArray(boxId)) return;
        let cancelled = false;
        graphqlRequestClient
            .request(planQuery, { id: boxId })
            .then((result: any) => {
                if (!cancelled) {
                    setPlan(normalizePlacementPlan(result?.handlingUnitOutbound?.placementPlan));
                }
            })
            .catch((error: any) => console.error('Error reading the packing plan:', error));
        return () => {
            cancelled = true;
        };
    }, [boxId]);

    // article details, read once the plan is opened
    useEffect(() => {
        if (!open || !plan || packInfos) return;
        const luIds = Array.from(new Set(plan.placements.map((p) => p.contentConfigId)));
        const lineIds = Array.from(new Set(plan.placements.map((p) => p.contentId)));
        graphqlRequestClient
            .request(packInfosQuery, {
                luFilters: { id: luIds },
                lineFilters: { id: lineIds },
                itemsPerPage: Math.max(luIds.length, lineIds.length)
            })
            .then((result: any) => {
                const lus = new Map<string, any>(
                    (result?.articleLus?.results ?? []).map((lu: any) => [lu.id, lu])
                );
                const lines = new Map<string, any>(
                    (result?.deliveryLines?.results ?? []).map((line: any) => [line.id, line])
                );
                setPackInfos(
                    plan.placements.map((placement) => {
                        const lu = lus.get(placement.contentConfigId);
                        const article = lu?.article ?? lines.get(placement.contentId)?.article;
                        return {
                            articleName: article?.name,
                            articleDescription: article?.description,
                            luName: lu?.name,
                            quantity: lu?.quantity,
                            length: lu?.length,
                            width: lu?.width,
                            height: lu?.height
                        };
                    })
                );
            })
            .catch((error: any) => {
                // the 3D view still works without the article details
                console.error('Error reading the packing plan articles:', error);
                setPackInfos(plan.placements.map(() => undefined));
            });
    }, [open, plan, packInfos]);

    if (!plan) return null;

    return (
        <>
            <Button icon={<CodeSandboxOutlined />} onClick={() => setOpen(true)}>
                {t('actions:view-3d')}
            </Button>
            <Modal
                open={open}
                title={`${t('common:packing-plan')}${plan.containerName ? ` - ${plan.containerName}` : ''} (${plan.insideLength} × ${plan.insideWidth} × ${plan.insideHeight} mm)`}
                width="90vw"
                style={{ top: 24 }}
                footer={null}
                destroyOnClose
                onCancel={() => setOpen(false)}
            >
                {packInfos ? (
                    <BoxPlacementPlan3D plan={plan} packInfos={packInfos} />
                ) : (
                    <ContentSpin />
                )}
            </Modal>
        </>
    );
};
