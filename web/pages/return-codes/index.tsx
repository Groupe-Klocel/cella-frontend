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
import { DeleteOutlined, EditTwoTone, EyeTwoTone } from '@ant-design/icons';
import { AppHead, LinkButton } from '@components';
import {
    getModesFromPermissions,
    META_DEFAULTS,
    pathParams,
    showError,
    showSuccess
} from '@helpers';
import { Button, Space } from 'antd';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import {
    DeleteParameterMutation,
    DeleteParameterMutationVariables,
    ModeEnum,
    useDeleteParameterMutation
} from 'generated/graphql';
import { useAuth } from 'context/AuthContext';
import { ParameterModel } from 'models/ParameterModel';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponent';
import useTranslation from 'next-translate/useTranslation';
import { FC } from 'react';
import { FormDataType } from 'models/Models';
import router from 'next/router';
import { returnCodeRoutes } from 'modules/ReturnCodes/Static/ReturnCodeRoutes';
type PageComponent = FC & { layout: typeof MainLayout };

const ReturnCodePage: PageComponent = () => {
    const { graphqlRequestClient } = useAuth();
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const modes = getModesFromPermissions(permissions, ParameterModel.tableName);

    const headerData: HeaderData = {
        title: t('common:return-codes'),
        routes: returnCodeRoutes,
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Create) ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:return-code') })}
                    path="/return-codes/add"
                    type="primary"
                />
            ) : null
    };

    // delete

    const { mutate: deleteParameter, isPending: deleteLoading } = useDeleteParameterMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: DeleteParameterMutation,
                _variables: DeleteParameterMutationVariables,
                _context: unknown
            ) => {
                if (!deleteLoading) {
                    if (data.deleteParameter) {
                        showSuccess(t('messages:success-deleted'));
                        router.reload();
                    } else {
                        showError(t('messages:error-delete-feature-types-impossible'));
                    }
                }
            },

            onError: () => {
                showError(t('messages:error-deleting-data'));
            }
        }
    );

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />

            <ListComponent
                searchCriteria={{ scope: 'return_code' }}
                headerData={headerData}
                dataModel={ParameterModel}
                filterFields={[
                    {
                        name: 'value',
                        type: FormDataType.String
                    },
                    {
                        name: 'code',
                        type: FormDataType.String
                    }
                ]}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',

                        render: (record: { id: string; system: boolean }) => (
                            <Space>
                                <LinkButton
                                    icon={<EyeTwoTone />}
                                    path={pathParams('/return-codes/[id]', record.id)}
                                />

                                {record.system ? (
                                    <></>
                                ) : (
                                    <>
                                        {modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                                            <>
                                                <LinkButton
                                                    icon={<EditTwoTone />}
                                                    path={pathParams(
                                                        '/return-codes/edit/[id]',
                                                        record.id
                                                    )}
                                                />
                                            </>
                                        ) : (
                                            <></>
                                        )}

                                        {modes.length > 0 && modes.includes(ModeEnum.Delete) ? (
                                            <>
                                                <Button
                                                    loading={deleteLoading}
                                                    onClick={() =>
                                                        deleteParameter({
                                                            id: record.id
                                                        })
                                                    }
                                                    icon={<DeleteOutlined />}
                                                    danger
                                                />
                                            </>
                                        ) : (
                                            <></>
                                        )}
                                    </>
                                )}
                            </Space>
                        )
                    }
                ]}
                routeDetailPage={'/return-codes/:id'}
            />
        </>
    );
};

ReturnCodePage.layout = MainLayout;

export default ReturnCodePage;
