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
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Card, Space, Tag } from 'antd';
import { FC } from 'react';
import styled from 'styled-components';
import { ROUTE_COLORS } from './RouteLayer';

const LegendDot = styled.span<{ $color: string; $dashed?: boolean }>`
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: ${({ $color }) => $color};
    border: 2px ${({ $dashed }) => ($dashed ? 'dashed' : 'solid')} #fff;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.2);
`;

const DashSample = styled.span`
    display: inline-block;
    width: 26px;
    border-top: 2.5px dashed #8c8c8c;
    vertical-align: middle;
`;

export interface IRouteLegendProps {
    noStockCount: number;
    unplacedCount: number;
}

const RouteLegend: FC<IRouteLegendProps> = ({ noStockCount, unplacedCount }: IRouteLegendProps) => {
    const { t } = useTranslation();

    return (
        <Card size="small" style={{ marginTop: 12 }}>
            <Space split="•" wrap>
                <Space size={6}>
                    <LegendDot $color={ROUTE_COLORS.start} />
                    <span>{t('common:start')}</span>
                </Space>
                <Space size={6}>
                    <LegendDot $color={ROUTE_COLORS.end} />
                    <span>{t('common:end')}</span>
                </Space>
                <Space size={6}>
                    <LegendDot $color={ROUTE_COLORS.picked} />
                    <span>{t('common:picked')}</span>
                </Space>
                <Space size={6}>
                    <LegendDot $color={ROUTE_COLORS.remaining} />
                    <span>{t('common:remaining')}</span>
                </Space>
                <Space size={6}>
                    <LegendDot $color={ROUTE_COLORS.unplaced} $dashed />
                    <span>{t('common:not-placed')}</span>
                </Space>
                <Space size={6}>
                    <DashSample />
                    <span>{t('common:zone-change')}</span>
                </Space>
                {noStockCount > 0 ? (
                    <Tag color="warning">{`${t('common:no-stock-lines')}: ${noStockCount}`}</Tag>
                ) : null}
                {unplacedCount > 0 ? (
                    <Tag color="orange">{`${t('common:not-placed')}: ${unplacedCount}`}</Tag>
                ) : null}
            </Space>
        </Card>
    );
};

RouteLegend.displayName = 'RouteLegend';

export { RouteLegend };
