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
import { featureTypesRoutes } from 'modules/FeatureTypes/Static/featureTypesRoutes';
import useTranslation from 'next-translate/useTranslation';

import { FC } from 'react';
import { useRouter } from 'next/router';
import { HeaderContent } from '@components';
import {
    getModesFromPermissions,
    pathParamsFromDictionary,
    showError,
    showSuccess
} from '@helpers';
import { useAppState } from 'context/AppContext';
import { ModelType } from 'models/Models';
import {
    DeleteFeatureTypeMutation,
    DeleteFeatureTypeMutationVariables,
    ModeEnum,
    useDeleteFeatureTypeMutation
} from 'generated/graphql';
import { useAuth } from 'context/AuthContext';

export interface ISingleItemProps {
    id: string | any;
    name: string | any;
    dataModel: ModelType;
    status: number | any;
    system: boolean | any;
}

const FeatureTypeDetailsHeader: FC<ISingleItemProps> = (props: ISingleItemProps) => {
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();

    const { t } = useTranslation();
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);

    const breadsCrumb = [
        ...featureTypesRoutes,
        {
            breadcrumbName: `${props.name}`
        }
    ];

    const { mutate: DeleteFeatureType, isPending: deleteLoading } =
        useDeleteFeatureTypeMutation<Error>(graphqlRequestClient, {
            onSuccess: (
                data: DeleteFeatureTypeMutation,
                _variables: DeleteFeatureTypeMutationVariables,
                _context: unknown
            ) => {
                if (!deleteLoading) {
                    if (data.deleteFeatureType) {
                        showSuccess(t('messages:success-deleted'));
                        router.push('/feature-types');
                    } else {
                        showError(t('messages:error-delete-feature-types-impossible'));
                    }
                }
            },

            onError: () => {
                showError(t('messages:error-deleting-data'));
            }
        });

    const deleteFeatureTypeHeader = ({ featureTypeId }: DeleteFeatureTypeMutationVariables) => {
        Modal.confirm({
            title: t('messages:delete-confirm'),

            onOk: () => {
                DeleteFeatureType({ featureTypeId });
            },

            okText: t('messages:confirm'),

            cancelText: t('messages:cancel')
        });
    };

    return (
        <HeaderContent
            title={`${t('common:features-types')} ${props.name}`}
            routes={breadsCrumb}
            onBack={() => router.back()}
            actionsRight={
                <Space>
                    {modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                        !props.system ? (
                            <LinkButton
                                title={t('actions:edit')}
                                path={pathParamsFromDictionary(`/feature-types/edit/[id]`, {
                                    id: props.id
                                })}
                                type="primary"
                            />
                        ) : (
                            <></>
                        )
                    ) : (
                        <></>
                    )}
                    {modes.length > 0 && modes.includes(ModeEnum.Delete) ? (
                        !props.system ? (
                            <Button
                                loading={deleteLoading}
                                onClick={() => deleteFeatureTypeHeader({ featureTypeId: props.id })}
                            >
                                {t('actions:delete')}
                            </Button>
                        ) : (
                            <></>
                        )
                    ) : (
                        <></>
                    )}
                </Space>
            }
        />
    );
};

export { FeatureTypeDetailsHeader };
