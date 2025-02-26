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
import {
    getModesFromPermissions,
    META_DEFAULTS,
    pathParams,
    showError,
    showSuccess
} from '@helpers';
import {
    EyeTwoTone,
    CaretDownOutlined,
    CaretUpOutlined,
    DeleteOutlined,
    EditTwoTone,
    LockTwoTone,
    UnlockTwoTone
} from '@ant-design/icons';
import { Button, Space, Modal } from 'antd';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import { ModeEnum, useListConfigsForAScopeQuery } from 'generated/graphql';
import { FormOptionType } from 'models/Models';
import { PatternPathModelV2 as model } from 'models/PatternPathModelV2';
import { patternPathsRoutes as itemRoutes } from 'modules/PatternPaths/Static/patternPathRoutes';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useEffect, useState } from 'react';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { gql } from 'graphql-request';
import configs from '../../../common/configs.json';

type PageComponent = FC & { layout: typeof MainLayout };

const PatternPathsPage: PageComponent = () => {
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const [statusTexts, setStatusTexts] = useState<Array<FormOptionType>>();
    const [refetch, setRefetch] = useState<boolean>(false);
    const rootPath = itemRoutes[itemRoutes.length - 1].path;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [reopenInfo, setReopenInfo] = useState<string | undefined>();

    const headerData: HeaderData = {
        title: t('common:pattern-paths'),
        routes: itemRoutes,
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Create) ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:pattern-path') })}
                    path="/pattern-paths/add"
                    type="primary"
                />
            ) : null
    };

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
    const confirmAction = (
        info: any | undefined,
        setInfo: any,
        action: 'delete' | 'disable' | 'enable'
    ) => {
        return () => {
            const titre =
                action == 'enable'
                    ? 'messages:enable-confirm'
                    : action == 'delete'
                      ? 'messages:delete-confirm'
                      : 'messages:disable-confirm';
            Modal.confirm({
                title: t(titre),
                onOk: () => {
                    setInfo(info);
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        };
    };

    const deletePatternPath = (patternPathId: string, isAssociatedPattern: boolean) => {
        Modal.confirm({
            title: isAssociatedPattern ? (
                <>
                    <span style={{ color: 'red' }}>{t('messages:associated-pattern-warning')}</span>
                    <br />
                    {t('messages:delete-confirm')}
                </>
            ) : (
                t('messages:delete-confirm')
            ),
            onOk: async () => {
                console.log('Deleting pattern path ID:', patternPathId, 'with its locations');

                const query = gql`
                    mutation executeFunction($functionName: String!, $event: JSON!) {
                        executeFunction(functionName: $functionName, event: $event) {
                            status
                            output
                        }
                    }
                `;

                const variables = {
                    functionName: 'pattern_path_delete',
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
                        setRefetch((prev: any) => !prev);
                        showSuccess(t('messages:success-deleted'));
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

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <ListComponent
                refetch={refetch}
                headerData={headerData}
                dataModel={model}
                routeDetailPage={'/pattern-paths/:id'}
                triggerDelete={undefined}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: {
                            id: string;
                            status: number;
                            patternPathLocations_id: string;
                            patternPathLinks_id: string;
                        }) => (
                            <Space>
                                {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                                    <LinkButton
                                        icon={<EyeTwoTone />}
                                        path={'/pattern-paths/:id'.replace(':id', record.id)}
                                    />
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Update) &&
                                model.isEditable &&
                                record.status !== configs.PATTERN_PATH_STATUS_CLOSED ? (
                                    <LinkButton
                                        icon={<EditTwoTone />}
                                        path={pathParams(`${rootPath}/edit/[id]`, record.id)}
                                    />
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Delete) &&
                                model.isSoftDeletable &&
                                !record.patternPathLocations_id &&
                                !record.patternPathLinks_id &&
                                record.status !== configs.PATTERN_PATH_STATUS_CLOSED ? (
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
                                            deletePatternPath(
                                                record.id,
                                                !!record.patternPathLinks_id
                                            )
                                        }
                                    ></Button>
                                ) : (
                                    <></>
                                )}
                                {record.status == configs.PATTERN_PATH_STATUS_CLOSED ? (
                                    <Button
                                        icon={<UnlockTwoTone twoToneColor="#b3cad6" />}
                                        onClick={() =>
                                            confirmAction(
                                                {
                                                    id: record.id,
                                                    status: configs.PATTERN_STATUS_IN_PROGRESS
                                                },
                                                setReopenInfo,
                                                'enable'
                                            )()
                                        }
                                    ></Button>
                                ) : (
                                    <></>
                                )}
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
