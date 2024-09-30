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
import { Space, Button, Modal } from 'antd';
import { actionCodeRoutes } from 'modules/ActionCodes/Static/ActionCodeRoutes';
import {
    DeleteParameterMutation,
    DeleteParameterMutationVariables,
    ModeEnum,
    useDeleteParameterMutation
} from 'generated/graphql';
import useTranslation from 'next-translate/useTranslation';
import { FC } from 'react';
import { useRouter } from 'next/router';
import { HeaderContent } from '@components';
import { getModesFromPermissions, showError, showSuccess } from '@helpers';
import { useAppState } from 'context/AppContext';
import { ModelType } from 'models/Models';
import { useAuth } from 'context/AuthContext';

export interface ISingleItemProps {
    id: string | any;
    name: string | any;
    dataModel: ModelType;
    system: any;
}

const ActionCodeDetailsHeader: FC<ISingleItemProps> = (props: ISingleItemProps) => {
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();

    const { t } = useTranslation();
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);

    const breadsCrumb = [
        ...actionCodeRoutes,
        {
            breadcrumbName: `${props.name}`
        }
    ];

    // Delete
    const { mutate: DeleteParameter, isPending: deleteLoading } = useDeleteParameterMutation<Error>(
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
                        router.push('/action-codes/');
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

    const deleteParameterHeader = ({ id }: DeleteParameterMutationVariables) => {
        Modal.confirm({
            title: t('messages:delete-confirm'),

            onOk: () => {
                DeleteParameter({ id });
            },

            okText: t('messages:confirm'),

            cancelText: t('messages:cancel')
        });
    };

    return (
        <HeaderContent
            title={`${t('common:code-action')} ${props.name}`}
            routes={breadsCrumb}
            onBack={() => router.push('/action-codes')}
            actionsRight={
                !props.system ? (
                    <Space>
                        {modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                            <LinkButton
                                title={t('actions:edit')}
                                path={`/action-codes/edit/${props.id}`}
                                type="primary"
                            />
                        ) : (
                            <></>
                        )}
                        {modes.length > 0 && modes.includes(ModeEnum.Delete) ? (
                            <Button
                                loading={deleteLoading}
                                onClick={() =>
                                    Modal.confirm({
                                        title: t('messages:delete-confirm'),
                                        onOk: () => {
                                            deleteParameterHeader({ id: props.id });
                                        },

                                        okText: t('messages:confirm'),
                                        cancelText: t('messages:cancel')
                                    })
                                }
                            >
                                {t('actions:delete')}
                            </Button>
                        ) : (
                            <></>
                        )}
                    </Space>
                ) : (
                    <></>
                )
            }
        />
    );
};

export { ActionCodeDetailsHeader };
