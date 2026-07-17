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
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { AppHead, ContentSpin, HeaderContent, PageContentWrapper } from '@components';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Button, Card, Divider, Empty, Segmented, Select, Space, Spin, Tag, Tooltip } from 'antd';
import { useAppState } from 'context/AppContext';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { FC, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { OccupancyFrontView } from '../Elements/OccupancyFrontView';
import { OccupancyTopView } from '../Elements/OccupancyTopView';
import { formatRate, OccupancyLabels } from '../Elements/occupancyTooltips';
import { useAisleDetail, useBlockOccupancy, useBlocksList } from '../hooks';
import {
    buildFrontViewData,
    buildTopViewData,
    CellAgg,
    naturalCompare,
    OCCUPANCY_COLORS,
    resolveStatusCodes
} from '../occupancyModel';
import { locationsOccupancyRoutes } from '../Static/locationsOccupancyRoutes';

// three.js stays in a dedicated chunk, fetched only when the 3D toggle is used
const Occupancy3DView = dynamic(() => import('../Elements/Occupancy3DView'), {
    ssr: false,
    loading: () => <ContentSpin />
});

const StatDot = styled.span<{ $color: string }>`
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 3px;
    background: ${({ $color }) => $color};
`;

const GradientBar = styled.span`
    display: inline-block;
    width: 80px;
    height: 10px;
    border-radius: 5px;
    background: linear-gradient(90deg, #fa8c16, #fa541c, #f5222d);
`;

const LoadingVeil = styled.div`
    position: absolute;
    inset: 0;
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.55);
`;

const LocationsOccupancy: FC = () => {
    const router = useRouter();
    const { t, lang } = useTranslation();
    const { configs } = useAppState();

    const blockId = typeof router.query.block === 'string' ? router.query.block : undefined;
    const aisle = typeof router.query.aisle === 'string' ? router.query.aisle : undefined;
    const highlightColumn =
        typeof router.query.column === 'string' ? router.query.column : undefined;
    const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D');

    const { blocks, isLoading: blocksLoading } = useBlocksList();
    const top = useBlockOccupancy();
    const front = useAisleDetail();

    const codes = useMemo(() => resolveStatusCodes(configs), [configs]);

    // status display labels come from the configs rows themselves ({fr, en, de} translations)
    const baseLang = (lang || 'en').split('-')[0];
    const statusLabel = useCallback(
        (value: 'available' | 'occupied' | 'disabled'): string => {
            const row = (configs ?? []).find(
                (config: any) =>
                    config.scope === 'location_status' &&
                    typeof config.value === 'string' &&
                    config.value.toLowerCase() === value
            );
            return row?.translation?.[baseLang] ?? row?.value ?? value;
        },
        [configs, baseLang]
    );

    const labels: OccupancyLabels = useMemo(
        () => ({
            aisle: t('d:aisle'),
            column: t('d:column'),
            level: t('d:level'),
            position: t('d:position'),
            total: t('common:total'),
            available: statusLabel('available'),
            occupied: statusLabel('occupied'),
            disabled: statusLabel('disabled'),
            occupancyRate: t('common:occupancy-rate')
        }),
        [t, statusLabel]
    );

    const lastFetchedBlockRef = useRef<string | undefined>(undefined);
    useEffect(() => {
        if (!router.isReady) return;
        if (!blockId) {
            lastFetchedBlockRef.current = undefined;
            top.reset();
            return;
        }
        // shallow pushes for aisle drill-down must not refetch the block aggregate
        if (lastFetchedBlockRef.current === blockId) return;
        lastFetchedBlockRef.current = blockId;
        top.fetchBlock(blockId);
    }, [router.isReady, blockId]);

    useEffect(() => {
        if (!router.isReady) return;
        if (!blockId || !aisle) {
            front.reset();
            return;
        }
        front.fetchAisle(blockId, aisle);
    }, [router.isReady, blockId, aisle]);

    const pushQuery = useCallback(
        (query: { [key: string]: string | undefined }) => {
            const clean: { [key: string]: string } = {};
            Object.entries(query).forEach(([key, value]) => {
                if (value) clean[key] = value;
            });
            router.push({ pathname: router.pathname, query: clean }, undefined, { shallow: true });
        },
        [router]
    );

    const handleBlockChange = useCallback((id: string) => pushQuery({ block: id }), [pushQuery]);
    const handleDrillDown = useCallback(
        (aisleValue: string, columnValue: string) =>
            pushQuery({ block: blockId, aisle: aisleValue, column: columnValue }),
        [blockId, pushQuery]
    );
    const handleBack = useCallback(() => pushQuery({ block: blockId }), [blockId, pushQuery]);

    const handleRefresh = useCallback(() => {
        if (!blockId) return;
        top.fetchBlock(blockId);
        front.clearCache();
        if (aisle) front.fetchAisle(blockId, aisle, true);
    }, [blockId, aisle, top.fetchBlock, front.clearCache, front.fetchAisle]);

    const topData = useMemo(
        () => (top.rows ? buildTopViewData(top.rows, codes) : undefined),
        [top.rows, codes]
    );
    const frontData = useMemo(
        () => (front.locations ? buildFrontViewData(front.locations, codes) : undefined),
        [front.locations, codes]
    );

    const blockOptions = useMemo(() => {
        const groups = new Map<string, { label: string; options: any[] }>();
        (blocks ?? []).forEach((block) => {
            const buildingName = block.building?.name ?? '-';
            let group = groups.get(buildingName);
            if (!group) {
                group = { label: buildingName, options: [] };
                groups.set(buildingName, group);
            }
            group.options.push({
                label: `${block.name} (${block.autocountLocation ?? 0})`,
                value: block.id
            });
        });
        return Array.from(groups.values()).sort((a, b) => naturalCompare(a.label, b.label));
    }, [blocks]);

    const blockName = useMemo(
        () => (blocks ?? []).find((block) => block.id === blockId)?.name,
        [blocks, blockId]
    );

    const currentTotals: CellAgg | undefined = aisle ? frontData?.totals : topData?.totals;

    const toolbar = (
        <Space wrap>
            <Select
                style={{ minWidth: 260 }}
                placeholder={t('d:block')}
                showSearch
                optionFilterProp="label"
                options={blockOptions}
                value={blockId}
                loading={blocksLoading}
                onChange={handleBlockChange}
                data-testid="occupancy-block-select"
            />
            <Segmented
                options={['2D', '3D']}
                value={viewMode}
                onChange={(value) => setViewMode(value as '2D' | '3D')}
                data-testid="occupancy-view-mode"
            />
            <Tooltip title={t('actions:refresh')}>
                <Button
                    icon={<ReloadOutlined />}
                    onClick={handleRefresh}
                    disabled={!blockId}
                    aria-label={t('actions:refresh')}
                    data-testid="occupancy-refresh"
                />
            </Tooltip>
        </Space>
    );

    let body: ReactNode;
    if (!blockId) {
        body = (
            <div data-testid="occupancy-empty">
                <Empty description={t('messages:select-block')} />
            </div>
        );
    } else if (aisle) {
        let content: ReactNode;
        if (front.locations === undefined) {
            content = <ContentSpin />;
        } else if (front.locations === null) {
            content = <Empty description={t('messages:error-getting-data')} />;
        } else if (!frontData || frontData.totals.total === 0) {
            content = <Empty description={t('messages:no-data')} />;
        } else if (viewMode === '3D') {
            content = (
                <Occupancy3DView kind="aisle" frontData={frontData} codes={codes} labels={labels} />
            );
        } else {
            content = (
                <OccupancyFrontView
                    data={frontData}
                    codes={codes}
                    labels={labels}
                    highlightColumn={highlightColumn}
                />
            );
        }
        body = (
            <div data-testid="occupancy-front-view" style={{ position: 'relative' }}>
                <Space style={{ marginBottom: 8 }} wrap>
                    <Button icon={<ArrowLeftOutlined />} onClick={handleBack} size="small">
                        {t('common:top-view')}
                    </Button>
                    <Tag color="geekblue">{`${t('d:block')}: ${blockName ?? blockId}`}</Tag>
                    <Tag color="blue">{`${labels.aisle}: ${aisle}`}</Tag>
                    <Tag>{t('common:front-view')}</Tag>
                </Space>
                {content}
                {front.isLoading && frontData ? (
                    <LoadingVeil>
                        <Spin />
                    </LoadingVeil>
                ) : null}
            </div>
        );
    } else {
        let content: ReactNode;
        if (top.rows === undefined) {
            content = <ContentSpin />;
        } else if (top.rows === null) {
            content = <Empty description={t('messages:error-getting-data')} />;
        } else if (!topData || topData.totals.total === 0) {
            content = <Empty description={t('messages:no-data')} />;
        } else if (viewMode === '3D') {
            content = (
                <Occupancy3DView
                    kind="block"
                    topData={topData}
                    codes={codes}
                    labels={labels}
                    onDrillDown={handleDrillDown}
                />
            );
        } else {
            content = (
                <OccupancyTopView data={topData} labels={labels} onDrillDown={handleDrillDown} />
            );
        }
        body = (
            <div data-testid="occupancy-top-view" style={{ position: 'relative' }}>
                {content}
                {top.isLoading && topData ? (
                    <LoadingVeil>
                        <Spin />
                    </LoadingVeil>
                ) : null}
            </div>
        );
    }

    return (
        <>
            <AppHead title={t('menu:locations-occupancy')} />
            <HeaderContent
                title={t('menu:locations-occupancy')}
                routes={locationsOccupancyRoutes}
                onBack={aisle ? handleBack : undefined}
                actionsRight={toolbar}
            />
            <PageContentWrapper>
                {currentTotals ? (
                    <Card size="small" style={{ marginBottom: 12 }}>
                        <Space split={<Divider type="vertical" />} wrap>
                            <span>{`${labels.total}: ${currentTotals.total}`}</span>
                            <Space size={6}>
                                <StatDot $color={OCCUPANCY_COLORS.available} />
                                <span>{`${labels.available}: ${currentTotals.available}`}</span>
                            </Space>
                            <Space size={6}>
                                <GradientBar />
                                <span>{`${labels.occupied}: ${currentTotals.occupied}`}</span>
                            </Space>
                            <Space size={6}>
                                <StatDot $color={OCCUPANCY_COLORS.disabled} />
                                <span>{`${labels.disabled}: ${currentTotals.disabled}`}</span>
                            </Space>
                            <span>{`${labels.occupancyRate}: ${formatRate(currentTotals)}`}</span>
                        </Space>
                    </Card>
                ) : null}
                {body}
            </PageContentWrapper>
        </>
    );
};

LocationsOccupancy.displayName = 'LocationsOccupancy';

export { LocationsOccupancy };
