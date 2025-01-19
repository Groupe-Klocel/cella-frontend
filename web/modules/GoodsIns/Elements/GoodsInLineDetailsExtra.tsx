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
import { useState } from 'react';
import { GoodsInLineDetailModelV2 } from 'models/GoodsInLineDetailModelV2';

export interface IItemDetailsProps {
    roundLineId?: string | any;
}

const GoodsInLineDetailsExtra = ({ roundLineId }: IItemDetailsProps) => {
    const { t } = useTranslation();
    const { permissions } = useAppState();
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const RoundLineModes = getModesFromPermissions(permissions, Table.RoundLine);

    const roundLineDetailData: HeaderData = {
        title: t('common:associated', { name: t('common:goods-in-line-details') }),
        routes: [],
        actionsComponent: <></>
    };

    return (
        <>
            {RoundLineModes.length > 0 && RoundLineModes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <ListComponent
                        searchCriteria={{ roundLineId: roundLineId }}
                        dataModel={GoodsInLineDetailModelV2}
                        headerData={roundLineDetailData}
                        triggerDelete={{ idToDelete, setIdToDelete }}
                        triggerSoftDelete={{ idToDisable, setIdToDisable }}
                        actionColumns={[
                            {
                                title: 'actions:actions',
                                key: 'actions',
                                render: (record: { id: string }) => (
                                    <Space>
                                        {RoundLineModes.length == 0 ||
                                        !RoundLineModes.includes(ModeEnum.Read) ? (
                                            <></>
                                        ) : (
                                            <>
                                                <LinkButton
                                                    icon={<EyeTwoTone />}
                                                    path={pathParamsFromDictionary('detail/[id]', {
                                                        id: record.id,
                                                        roundLineId
                                                    })}
                                                />
                                            </>
                                        )}
                                    </Space>
                                )
                            }
                        ]}
                        searchable={false}
                    />
                </>
            ) : (
                <></>
            )}
        </>
    );
};

export { GoodsInLineDetailsExtra };
