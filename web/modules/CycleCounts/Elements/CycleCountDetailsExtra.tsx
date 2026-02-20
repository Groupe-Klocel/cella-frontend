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
import { EyeTwoTone } from '@ant-design/icons';
import { LinkButton } from '@components';
import { getModesFromPermissions, pathParams } from '@helpers';
import { Divider, Space } from 'antd';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';
import { CycleCountLineModelV2 } from '@helpers';
import { CycleCountMovementModelV2 } from '@helpers';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { CycleCountErrorModelV2 } from '@helpers';
import { useMemo } from 'react';

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
    const { permissions, configs } = useAppState();
    const { t } = useTranslation();
    const cycleCountLineModes = getModesFromPermissions(
        permissions,
        CycleCountLineModelV2.tableName
    );
    const cycleCountMovementModes = getModesFromPermissions(
        permissions,
        CycleCountMovementModelV2.tableName
    );
    const cycleCountErrorModes = getModesFromPermissions(
        permissions,
        CycleCountErrorModelV2.tableName
    );

    const configsParamsCodes = useMemo(() => {
        const findCodeByScopeAndValue = (items: any[], scope: string, value: string) => {
            return items.find(
                (item: any) =>
                    item.scope === scope && item.value.toLowerCase() === value.toLowerCase()
            )?.code;
        };

        const recommendedCycleCountModeCode = findCodeByScopeAndValue(
            configs,
            'cycle_count_model',
            'Recommended'
        );

        const createdCycleCountStatus = findCodeByScopeAndValue(
            configs,
            'cycle_count_status',
            'created'
        );

        return {
            recommendedCycleCountModeCode,
            createdCycleCountStatus
        };
    }, [configs]);

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

    const CycleCountErrorHeaderData: HeaderData = {
        title: t('common:associated', { name: t('common:cycle-count-errors') }),
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
            {cycleCountModel != parseInt(configsParamsCodes.recommendedCycleCountModeCode) &&
            cycleCountStatus != parseInt(configsParamsCodes.createdCycleCountStatus) &&
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
            {cycleCountModel != parseInt(configsParamsCodes.recommendedCycleCountModeCode) &&
            cycleCountErrorModes.length > 0 &&
            cycleCountErrorModes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <ListComponent
                        searchCriteria={{
                            cycleCountId: cycleCountId
                        }}
                        headerData={CycleCountErrorHeaderData}
                        dataModel={CycleCountErrorModelV2}
                        triggerDelete={{}}
                        triggerSoftDelete={{}}
                        actionColumns={[
                            {
                                title: 'actions:actions',
                                key: 'actions',
                                render: (record: { id: string }) => (
                                    <Space>
                                        {cycleCountErrorModes.length > 0 &&
                                        cycleCountErrorModes.includes(ModeEnum.Read) ? (
                                            <LinkButton
                                                icon={<EyeTwoTone />}
                                                path={pathParams(
                                                    '/cycle-counts/cycle-count-errors/[id]',
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
