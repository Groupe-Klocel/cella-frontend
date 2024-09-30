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
import { configurationsRoutes } from 'modules/Configurations/Static/configurationRoutes';
import useTranslation from 'next-translate/useTranslation';

import { FC } from 'react';
import { useRouter } from 'next/router';
import { HeaderContent } from '@components';
import { getModesFromPermissions, pathParams, showError, showSuccess } from '@helpers';
import { useAppState } from 'context/AppContext';
import { ModelType } from 'models/Models';
import {
    DeleteConfigMutation,
    DeleteConfigMutationVariables,
    DeleteParameterMutation,
    DeleteParameterMutationVariables,
    ModeEnum,
    useDeleteConfigMutation,
    useDeleteParameterMutation
} from 'generated/graphql';
import { useAuth } from 'context/AuthContext';

export interface ISingleItemProps {
    id: string | any;
    value: string | any;
    dataModel: ModelType;
    system: boolean | any;
    scope: string;
}

const ConfigurationDetailsHeader: FC<ISingleItemProps> = (props: ISingleItemProps) => {
    const router = useRouter();

    const { t } = useTranslation();
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);
    const { graphqlRequestClient } = useAuth();

    const breadsCrumb = [
        ...configurationsRoutes,
        {
            breadcrumbName: `${props.scope} - ${props.value}`
        }
    ];

    // DELETE
    const { mutate: DeleteMutate, isPending: deleteLoading } = useDeleteConfigMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: DeleteConfigMutation,
                _variables: DeleteConfigMutationVariables,
                _context: any
            ) => {
                if (!deleteLoading) {
                    if (data.deleteConfig) {
                        showSuccess(t('messages:success-deleted'));
                        router.push('/configurations');
                    } else {
                        showError(t('messages:error-delete-set-impossible'));
                    }
                }
            },
            onError: () => {
                showError(t('messages:error-deleting-data'));
            }
        }
    );

    const deleteConfig = ({ id }: DeleteConfigMutationVariables) => {
        Modal.confirm({
            title: t('messages:delete-confirm'),
            onOk: () => {
                DeleteMutate({ id });
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    return (
        <HeaderContent
            title={`${t('common:configuration')} ${props.scope} - ${props.value}`}
            routes={breadsCrumb}
            onBack={() => router.push('/configurations')}
            actionsRight={
                props.system == false ? (
                    <Space>
                        {modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                            <LinkButton
                                title={t('actions:edit')}
                                path={pathParams('/configurations/edit/[id]', props.id)}
                                type="primary"
                            />
                        ) : (
                            <></>
                        )}
                        {modes.length > 0 && modes.includes(ModeEnum.Delete) ? (
                            <Button onClick={() => deleteConfig({ id: props.id })}>
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

export { ConfigurationDetailsHeader };
