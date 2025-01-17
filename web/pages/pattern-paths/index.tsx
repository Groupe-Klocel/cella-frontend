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
import { AppHead, LinkButton } from '@components';
import { getModesFromPermissions, META_DEFAULTS, showError, showSuccess } from '@helpers';
import { EyeTwoTone, CaretDownOutlined, CaretUpOutlined, DeleteOutlined } from '@ant-design/icons';
import { Button, Space, Modal } from 'antd';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import { ModeEnum, useListConfigsForAScopeQuery } from 'generated/graphql';
import { FormOptionType } from 'models/Models';
import { PatternPathModelV2 } from 'models/PatternPathModelV2';
import { patternPathsRoutes } from 'modules/PatternPaths/Static/patternPathRoutes';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useEffect, useState } from 'react';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { gql } from 'graphql-request';

type PageComponent = FC & { layout: typeof MainLayout };

const PatternPathsPage: PageComponent = () => {
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const modes = getModesFromPermissions(permissions, PatternPathModelV2.tableName);
    const [statusTexts, setStatusTexts] = useState<Array<FormOptionType>>();
    const [refetch, setRefetch] = useState<boolean>(false);
    const headerData: HeaderData = {
        title: t('common:pattern-paths'),
        routes: patternPathsRoutes,
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Create) ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:pattern-path') })}
                    path="/pattern-paths/add"
                    type="primary"
                />
            ) : null
    };
    const [priorityStatus, setPriorityStatus] = useState({
        id: '',
        type: ''
    });

    const { graphqlRequestClient } = useAuth();

    const statusPatternPathTextList = useListConfigsForAScopeQuery(graphqlRequestClient, {
        scope: 'pattern_path_status'
    });
    useEffect(() => {
        if (statusPatternPathTextList) {
            const newStatusTexts: Array<FormOptionType> = [];

            const cData = statusPatternPathTextList?.data?.listConfigsForAScope;
            if (cData) {
                cData.forEach((item) => {
                    newStatusTexts.push({ key: parseInt(item.code), text: item.text });
                });
                setStatusTexts(newStatusTexts);
            }
        }
    }, [statusPatternPathTextList.data]);

    //#region
    const deletePatternPath = (patternPathId: string) => {
        Modal.confirm({
            title: t('messages:delete-confirm'),
            onOk: async () => {
                console.log('Deleting pattern path with ID:', patternPathId);

                const query = gql`
                    mutation executeFunction($functionName: String!, $event: JSON!) {
                        executeFunction(functionName: $functionName, event: $event) {
                            status
                            output
                        }
                    }
                `;

                const variables = {
                    functionName: 'K_deletePatternPath',
                    event: {
                        input: {
                            patternPathId
                        }
                    }
                };
                try {
                    const patternResult = await graphqlRequestClient.request(query, variables);
                    if (patternResult.executeFunction.status === 'ERROR') {
                        showError(patternResult.executeFunction.output);
                    } else if (
                        patternResult.executeFunction.status === 'OK' &&
                        patternResult.executeFunction.output.status === 'KO'
                    ) {
                        showError(t(`errors:${patternResult.executeFunction.output.output.code}`));
                        console.log('Backend_message', patternResult.executeFunction.output.output);
                    } else {
                        showSuccess(t('messages:success-deleted'));
                        setRefetch(true);
                    }
                } catch (error) {
                    showError(t('messages:error-executing-function'));
                    console.log('executeFunctionError', error);
                }
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };
    //#endregion
    useEffect(() => {
        if (refetch) {
            setRefetch(false);
        }
    }, [refetch]);
    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <ListComponent
                refetch={refetch}
                headerData={headerData}
                dataModel={PatternPathModelV2}
                routeDetailPage={'/pattern-paths/:id'}
                triggerDelete={undefined}
                triggerSoftDelete={undefined}
                triggerPriorityChange={{
                    id: priorityStatus.id,
                    setId: setPriorityStatus,
                    type: priorityStatus.type,
                    orderingField: 'order'
                }}
                sortDefault={[{ ascending: true, field: 'order' }]}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: {
                            id: string;
                            name: string;
                            order: number;
                            status: number;
                        }) => (
                            <Space>
                                {record.order === null ? (
                                    <></>
                                ) : (
                                    <>
                                        <Button
                                            onClick={() =>
                                                setPriorityStatus({
                                                    type: 'up',
                                                    id: record.id
                                                })
                                            }
                                            icon={<CaretUpOutlined />}
                                        />
                                        <Button
                                            onClick={() =>
                                                setPriorityStatus({
                                                    type: 'down',
                                                    id: record.id
                                                })
                                            }
                                            icon={<CaretDownOutlined />}
                                        />
                                    </>
                                )}
                                <LinkButton
                                    icon={<EyeTwoTone />}
                                    path={'/pattern-paths/:id'.replace(':id', record.id)}
                                />
                                <Button
                                    icon={<DeleteOutlined />}
                                    danger
                                    onClick={() => deletePatternPath(record.id)}
                                ></Button>
                            </Space>
                        )
                    }
                ]}
            />
        </>
    );
};

PatternPathsPage.layout = MainLayout;

export default PatternPathsPage;
