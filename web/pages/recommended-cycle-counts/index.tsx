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
import { DeleteOutlined, EditTwoTone, EyeTwoTone, LockTwoTone } from '@ant-design/icons';
import { AppHead, LinkButton } from '@components';
import { getModesFromPermissions, pathParams, showError, showSuccess } from '@helpers';
import { Button, Modal, Space } from 'antd';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';
import { RecommendedCycleCountModelV2 as model } from '@helpers';
import { ActionButtons, HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useMemo, useState } from 'react';
import { recommendedCycleCountsRoutes as itemRoutes } from 'modules/CycleCounts/Static/recommendedCycleCountsRoutes';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';

type PageComponent = FC & { layout: typeof MainLayout };

const CycleCountPages: PageComponent = () => {
    const { permissions, configs } = useAppState();
    const { t } = useTranslation();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const rootPath = itemRoutes[itemRoutes.length - 1].path;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [selectedRowKeys, setSelectedRowKeys] = useState<any>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { graphqlRequestClient } = useAuth();

    const headerData: HeaderData = {
        title: t('common:recommended-cycle-counts'),
        routes: itemRoutes,
        actionsComponent: null
    };

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

        const closedCycleCountStatus = findCodeByScopeAndValue(
            configs,
            'cycle_count_status',
            'closed'
        );

        const cancelledCycleCountStatus = findCodeByScopeAndValue(
            configs,
            'cycle_count_status',
            'canceled'
        );

        return {
            recommendedCycleCountModeCode,
            closedCycleCountStatus,
            cancelledCycleCountStatus
        };
    }, [configs]);

    const confirmAction = (id: string | undefined, setId: any, action: 'delete' | 'disable') => {
        return () => {
            Modal.confirm({
                title: t('messages:delete-confirm'),
                onOk: () => {
                    setId(id);
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        };
    };

    const hasSelected = selectedRowKeys.length > 0;
    const [refetch, setRefetch] = useState<boolean>(false);

    const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
        setSelectedRowKeys(newSelectedRowKeys);
    };
    const rowSelection = {
        selectedRowKeys,
        onChange: onSelectChange,
        getCheckboxProps: (record: any) => ({
            disabled:
                record.status == parseInt(configsParamsCodes.closedCycleCountStatus) ||
                record.status == parseInt(configsParamsCodes.cancelledCycleCountStatus)
                    ? true
                    : false
        })
    };

    const generateCycleCount = async (selectedRowKeys: [String]) => {
        setIsLoading(true);
        const query = gql`
            mutation executeFunction($functionName: String!, $event: JSON!) {
                executeFunction(functionName: $functionName, event: $event) {
                    status
                    output
                }
            }
        `;

        const variables = {
            functionName: 'consolidate_recommended_cycle_counts',
            event: {
                input: { cycleCountIds: selectedRowKeys }
            }
        };

        try {
            const query_result = await graphqlRequestClient.request(query, variables);
            if (query_result.executeFunction.status === 'ERROR') {
                setSelectedRowKeys([]);
                showError(query_result.executeFunction.output);
            } else if (
                query_result.executeFunction.status === 'OK' &&
                query_result.executeFunction.output.status === 'KO'
            ) {
                showError(t(`errors:${query_result.executeFunction.output.output.code}`));
                console.log('Backend_message', query_result.executeFunction.output.output);
            } else {
                setSelectedRowKeys([]);
                showSuccess(t('messages:success-cycle-count-creation'));
            }
        } catch (error) {
            setSelectedRowKeys([]);
            showError(t('messages:error-executing-function'));
            console.log('executeFunctionError', error);
        } finally {
            setIsLoading(false);
        }
    };

    const actionButtons: ActionButtons = {
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                <>
                    <>
                        <span className="selected-span" style={{ marginLeft: 16 }}>
                            {hasSelected
                                ? `${t('messages:selected-items-number', {
                                      number: selectedRowKeys.length
                                  })}`
                                : ''}
                        </span>
                        <span style={{ marginLeft: 16 }}>
                            <Button
                                type="primary"
                                onClick={() => {
                                    Modal.confirm({
                                        title: t('messages:confirm-cycle-count-generation'),
                                        onOk: () => {
                                            generateCycleCount(selectedRowKeys);
                                            setRefetch((prev) => !prev);
                                        },
                                        okText: t('messages:confirm'),
                                        cancelText: t('messages:cancel')
                                    });
                                }}
                                disabled={!hasSelected}
                                loading={isLoading}
                            >
                                {t('actions:generate-cycle-count')}
                            </Button>
                        </span>
                    </>
                </>
            ) : null
    };

    return (
        <>
            <AppHead title={headerData.title} />
            <ListComponent
                searchCriteria={{
                    model: parseInt(configsParamsCodes.recommendedCycleCountModeCode)
                }}
                headerData={headerData}
                dataModel={model}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                rowSelection={rowSelection}
                refetch={refetch}
                checkbox={true}
                actionButtons={actionButtons}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: { id: string; status: number }) => (
                            <Space>
                                {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                                    <LinkButton
                                        icon={<EyeTwoTone />}
                                        path={pathParams(`${rootPath}/[id]`, record.id)}
                                    />
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Update) &&
                                model.isEditable ? (
                                    <LinkButton
                                        icon={<EditTwoTone />}
                                        path={pathParams(`${rootPath}/edit/[id]`, record.id)}
                                    />
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Delete) &&
                                model.isSoftDeletable ? (
                                    <Button
                                        icon={<LockTwoTone twoToneColor="#ffbbaf" />}
                                        onClick={() =>
                                            confirmAction(record.id, setIdToDisable, 'disable')()
                                        }
                                    ></Button>
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Delete) &&
                                model.isDeletable ? (
                                    <Button
                                        icon={<DeleteOutlined />}
                                        danger
                                        onClick={() =>
                                            confirmAction(record.id, setIdToDelete, 'delete')()
                                        }
                                    ></Button>
                                ) : (
                                    <></>
                                )}
                            </Space>
                        )
                    }
                ]}
                routeDetailPage={`${rootPath}/:id`}
            />
        </>
    );
};

CycleCountPages.layout = MainLayout;

export default CycleCountPages;
