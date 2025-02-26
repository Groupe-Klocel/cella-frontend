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
import { PatternPathModelV2 as model } from 'models/PatternPathModelV2';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { useRouter } from 'next/router';
import { FC, useState } from 'react';
import MainLayout from '../../components/layouts/MainLayout';
import {
    META_DEFAULTS,
    getModesFromPermissions,
    pathParamsFromDictionary,
    showError,
    showSuccess
} from '@helpers';
import { useAppState } from 'context/AppContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { patternPathsRoutes as itemRoutes } from 'modules/PatternPaths/Static/patternPathRoutes';
import { Button, Modal, Space } from 'antd';
import { ModeEnum, Table } from 'generated/graphql';
import configs from '../../../common/configs.json';
import { PatternPathDetailsExtra } from 'modules/PatternPaths/Elements/PatternPathDetailsExtra';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';

type PageComponent = FC & { layout: typeof MainLayout };

const PatternPathPage: PageComponent = () => {
    const router = useRouter();
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const PPLmodes = getModesFromPermissions(permissions, Table.PatternPathLocation);
    const { id } = router.query;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [reopenInfo, setReopenInfo] = useState<any | undefined>();

    // #region to customize information
    const breadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.name}`
        }
    ];

    const pageTitle = `${t('common:pattern-path')} ${data?.name}`;
    // #endregions

    // #region handle standard buttons according to Model (can be customized when additional buttons are needed)
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;
    const { graphqlRequestClient } = useAuth();

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
                        showSuccess(t('messages:success-deleted'));
                        router.push(rootPath);
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

    const headerData: HeaderData = {
        title: pageTitle,
        routes: breadCrumb,
        onBackRoute: rootPath,
        actionsComponent:
            data?.status !== configs.PATTERN_PATH_STATUS_CLOSED ? (
                <Space>
                    {PPLmodes.length > 0 &&
                    PPLmodes.includes(ModeEnum.Update) &&
                    model.isEditable ? (
                        <LinkButton
                            title={t('actions:manage-locations')}
                            path={pathParamsFromDictionary(`/pattern-paths/manage/${data?.id}`, {
                                id: data?.id,
                                name: data?.name,
                                patternName: data?.pattern_name,
                                stockOwnerName: data?.stockOwner_name
                            })}
                            type="primary"
                        />
                    ) : (
                        <></>
                    )}
                    {modes.length > 0 && modes.includes(ModeEnum.Update) && model.isEditable ? (
                        <LinkButton
                            title={t('actions:edit')}
                            path={`${rootPath}/edit/${id}`}
                            type="primary"
                        />
                    ) : (
                        <></>
                    )}
                    {modes.length > 0 &&
                    modes.includes(ModeEnum.Delete) &&
                    model.isSoftDeletable ? (
                        <Button
                            onClick={() => confirmAction(id as string, setIdToDisable, 'disable')()}
                            type="primary"
                        >
                            {t('actions:disable')}
                        </Button>
                    ) : (
                        <></>
                    )}
                    {modes.length > 0 && modes.includes(ModeEnum.Delete) && model.isDeletable ? (
                        <Button
                            onClick={() => deletePatternPath(data.id, !!data.patternPathLinks_id)}
                        >
                            {t('actions:delete')}
                        </Button>
                    ) : (
                        <></>
                    )}
                </Space>
            ) : (
                <>
                    {data?.status == configs.PATTERN_PATH_STATUS_CLOSED ? (
                        <Button
                            onClick={() =>
                                confirmAction(
                                    { id, status: configs.ARTICLE_STATUS_IN_PROGRESS },
                                    setReopenInfo,
                                    'enable'
                                )()
                            }
                            type="primary"
                        >
                            {t('actions:enable')}
                        </Button>
                    ) : (
                        <></>
                    )}
                </>
            )
    };
    // #endregion

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <ItemDetailComponent
                extraDataComponent={<PatternPathDetailsExtra id={id!} />}
                id={id!}
                headerData={headerData}
                dataModel={model}
                setData={setData}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                triggerReopen={{ reopenInfo, setReopenInfo }}
            />
        </>
    );
};

PatternPathPage.layout = MainLayout;

export default PatternPathPage;

// extraDataComponent={<PatternPathDetailsExtra id={id!} />}
