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
import { LinkButton } from '@components';
import { EyeTwoTone } from '@ant-design/icons';
import { pathParams, getModesFromPermissions } from '@helpers';
import useTranslation from 'next-translate/useTranslation';
import { Divider, Space, Typography } from 'antd';
import { useAppState } from 'context/AppContext';
import { ModeEnum, Table } from 'generated/graphql';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponent';
import { GoodsInLineModel } from 'models/GoodsInLineModel';
import { GoodsInMovementModel } from 'models/GoodsInMovementModel';

const { Title } = Typography;

export interface IItemDetailsProps {
    handlingUnitInboundId?: string | any;
    handlingUnitId?: string | any;
}

const GoodsInDetailsExtra = ({ handlingUnitInboundId, handlingUnitId }: IItemDetailsProps) => {
    const { t } = useTranslation();

    const { permissions } = useAppState();
    const HandlingUnitContentInboundModes = getModesFromPermissions(
        permissions,
        Table.HandlingUnitContentInbound
    );
    const MovementModes = getModesFromPermissions(permissions, Table.Movement);

    const goodsInLinesHeaderData: HeaderData = {
        title: t('common:related-goods-in-lines'),
        routes: [],
        actionsComponent: undefined
    };

    const goodsInMovementHeaderData: HeaderData = {
        title: t('common:related-movements'),
        routes: [],
        actionsComponent: undefined
    };
    return (
        <>
            {HandlingUnitContentInboundModes.length > 0 &&
            HandlingUnitContentInboundModes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <ListComponent
                        searchCriteria={{ handlingUnitInboundId: handlingUnitInboundId }}
                        dataModel={GoodsInLineModel}
                        headerData={goodsInLinesHeaderData}
                        routeDetailPage={'/goods-ins/lines/:id'}
                        actionColumns={[
                            {
                                title: 'actions:actions',
                                key: 'actions',
                                render: (record: {
                                    id: string;
                                    name: string;
                                    handlingUnitInboundId: string;
                                }) => (
                                    <Space>
                                        <LinkButton
                                            icon={<EyeTwoTone />}
                                            path={pathParams('/goods-ins/lines/[id]', record.id)}
                                        />
                                    </Space>
                                )
                            }
                        ]}
                        searchable={false}
                        sortDefault={[{ field: 'lineNumber', ascending: true }]}
                    />
                </>
            ) : (
                <></>
            )}
            {MovementModes.length > 0 && MovementModes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <ListComponent
                        searchCriteria={{ handlingUnitInboundId: handlingUnitInboundId }}
                        dataModel={GoodsInMovementModel}
                        headerData={goodsInMovementHeaderData}
                        routeDetailPage={'/goods-ins/movements/:id'}
                        actionColumns={[
                            {
                                title: 'actions:actions',
                                key: 'actions',
                                render: (record: {
                                    id: string;
                                    name: string;
                                    handlingUnitId: string;
                                }) => (
                                    <Space>
                                        <LinkButton
                                            icon={<EyeTwoTone />}
                                            path={pathParams('/movements', record.id)}
                                        />
                                    </Space>
                                )
                            }
                        ]}
                        searchable={false}
                        sortDefault={[{ field: 'created', ascending: true }]}
                    />
                </>
            ) : (
                <></>
            )}
        </>
    );
};
export { GoodsInDetailsExtra };
