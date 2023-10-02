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
import { DeleteOutlined, EditTwoTone, EyeTwoTone, StopOutlined } from '@ant-design/icons';
import { AppHead, LinkButton } from '@components';
import {
    getModesFromPermissions,
    META_DEFAULTS,
    pathParams,
    pathParamsFromDictionary
} from '@helpers';
import { Button, Divider, Modal, Space } from 'antd';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';
import { CycleCountLineModelV2 } from 'models/CycleCountLineModelV2';
import { CycleCountMovementModelV2 } from 'models/CycleCountMovementModelV2';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import useTranslation from 'next-translate/useTranslation';
import { useState } from 'react';
import configs from '../../../../common/configs.json';

export interface IItemDetailsProps {
    cycleCountId?: string | any;
    cycleCountModel?: string | any;
    cycleCountStatus?: string | any;
}

const CycleCountDetailsExtra = ({
    cycleCountId,
    cycleCountModel,
    cycleCountStatus
}: IItemDetailsProps) => {
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const cycleCountLineModes = getModesFromPermissions(
        permissions,
        CycleCountLineModelV2.tableName
    );
    const cycleCountMovementModes = getModesFromPermissions(
        permissions,
        CycleCountMovementModelV2.tableName
    );

    const CycleCountLineHeaderData: HeaderData = {
        title: t('common:associated', { name: t('common:cycle-count-lines') }),
        routes: [],
        actionsComponent: null
    };

    const CycleCountMovementHeaderData: HeaderData = {
        title: t('common:associated', { name: t('common:cycle-count-movements') }),
        routes: [],
        actionsComponent: null
    };

    return (
        <>
            {cycleCountLineModes.length > 0 && cycleCountLineModes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <ListComponent
                        searchCriteria={{
                            cycleCountId: cycleCountId
                        }}
                        headerData={CycleCountLineHeaderData}
                        dataModel={CycleCountLineModelV2}
                        triggerDelete={{}}
                        triggerSoftDelete={{}}
                        actionColumns={[
                            {
                                title: 'actions:actions',
                                key: 'actions',
                                render: (record: { id: string }) => (
                                    <Space>
                                        {cycleCountLineModes.length > 0 &&
                                        cycleCountLineModes.includes(ModeEnum.Read) ? (
                                            <LinkButton
                                                icon={<EyeTwoTone />}
                                                path={pathParams(
                                                    '/cycle-counts/cycle-count-lines/[id]',
                                                    record.id
                                                )}
                                            />
                                        ) : (
                                            <></>
                                        )}
                                    </Space>
                                )
                            }
                        ]}
                    />
                </>
            ) : (
                <></>
            )}
            {cycleCountModel != configs.CYCLE_COUNT_MODEL_RECOMMANDED &&
            cycleCountStatus != configs.CYCLE_COUNT_STATUS_CREATED &&
            cycleCountMovementModes.length > 0 &&
            cycleCountMovementModes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <ListComponent
                        searchCriteria={{
                            cycleCountId: cycleCountId
                        }}
                        headerData={CycleCountMovementHeaderData}
                        dataModel={CycleCountMovementModelV2}
                        triggerDelete={{}}
                        triggerSoftDelete={{}}
                        actionColumns={[
                            {
                                title: 'actions:actions',
                                key: 'actions',
                                render: (record: { id: string }) => (
                                    <Space>
                                        {cycleCountMovementModes.length > 0 &&
                                        cycleCountMovementModes.includes(ModeEnum.Read) ? (
                                            <LinkButton
                                                icon={<EyeTwoTone />}
                                                path={pathParams(
                                                    '/cycle-counts/cycle-count-movements/[id]',
                                                    record.id
                                                )}
                                            />
                                        ) : (
                                            <></>
                                        )}
                                    </Space>
                                )
                            }
                        ]}
                    />
                </>
            ) : (
                <></>
            )}
        </>
    );
};

export { CycleCountDetailsExtra };
