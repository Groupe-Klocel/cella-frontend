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
import { getModesFromPermissions, pathParamsFromDictionary } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Divider, Space } from 'antd';
import { useAppState } from 'context/AppContext';
import { ModeEnum, Table } from 'generated/graphql';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { HandlingUnitContentFeatureModelV2 } from 'models/HandlingUnitContentFeatureModelV2';
import { useState } from 'react';

export interface IItemDetailsProps {
    boxLineId?: string | any;
    contentId?: string | any;
    boxLineName?: string | any;
}

const ShippingUnitLineDetailsExtra = ({ contentId, boxLineName }: IItemDetailsProps) => {
    const { t } = useTranslation();

    const { permissions } = useAppState();
    const HandlingUnitContentFeatureModes = getModesFromPermissions(
        permissions,
        Table.HandlingUnitContentFeature
    );
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();

    const [, setHandlingUnitContentFeaturesData] = useState<any>();

    const boxLineFeatureHeaderData: HeaderData = {
        title: t('common:associated', { name: t('d:shippingUnitLineFeatures') }),
        routes: [],
        actionsComponent: null
    };

    return (
        <>
            {HandlingUnitContentFeatureModes.length > 0 &&
            HandlingUnitContentFeatureModes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <ListComponent
                        // search on contentId in spite of boxId (due to M2M relationship)
                        searchCriteria={{
                            handlingUnitContentId: contentId
                        }}
                        dataModel={HandlingUnitContentFeatureModelV2}
                        headerData={boxLineFeatureHeaderData}
                        triggerDelete={{ idToDelete, setIdToDelete }}
                        triggerSoftDelete={{ idToDisable, setIdToDisable }}
                        routeDetailPage={'/shipping-units/line/feature/:id'}
                        actionColumns={[
                            {
                                title: 'actions:actions',
                                key: 'actions',
                                render: (record: {
                                    id: string;
                                    name: string;
                                    boxLineId: string;
                                    boxLineName: string;
                                }) => (
                                    <Space>
                                        <LinkButton
                                            icon={<EyeTwoTone />}
                                            path={pathParamsFromDictionary('feature/[id]', {
                                                id: record.id,
                                                name: boxLineName
                                            })}
                                        />
                                    </Space>
                                )
                            }
                        ]}
                        searchable={false}
                        setData={setHandlingUnitContentFeaturesData}
                        sortDefault={[{ field: 'created', ascending: true }]}
                    />
                </>
            ) : (
                <></>
            )}
        </>
    );
};

export { ShippingUnitLineDetailsExtra };
