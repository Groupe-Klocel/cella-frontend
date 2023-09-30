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
import { Space, Button, Modal } from 'antd';
import useTranslation from 'next-translate/useTranslation';

import { FC, useState } from 'react';
import { useRouter } from 'next/router';
import { HeaderContent, LinkButton, NumberOfPrintsModal } from '@components';
import { getModesFromPermissions, showError, showSuccess } from '@helpers';
import { useAppState } from 'context/AppContext';
import { ModelType } from 'models/Models';
import {
    DeleteLocationMutation,
    DeleteLocationMutationVariables,
    ModeEnum,
    useDeleteLocationMutation
} from 'generated/graphql';
import { locationsRoutes } from '../Static/locationsRoutes';
import { useAuth } from 'context/AuthContext';

export interface ISingleItemProps {
    id: string | any;
    name: string | any;
    dataModel: ModelType;
}

const LocationDetailsHeader: FC<ISingleItemProps> = (props: ISingleItemProps) => {
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();

    const { t } = useTranslation();
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);
    const [showNumberOfPrintsModal, setShowNumberOfPrintsModal] = useState(false);

    const breadsCrumb = [
        ...locationsRoutes,
        {
            breadcrumbName: `${props.name}`
        }
    ];

    // DELETE
    const { mutate: DeleteMutate, isLoading: deleteLoading } = useDeleteLocationMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: DeleteLocationMutation,
                _variables: DeleteLocationMutationVariables,
                _context: any
            ) => {
                if (!deleteLoading) {
                    if (data.deleteLocation) {
                        router.push('/locations');
                        showSuccess(t('messages:success-deleted'));
                    } else {
                        showError(t('messages:error-delete-location-impossible'));
                    }
                }
            },
            onError: (err) => {
                showError(t('messages:error-deleting-data'));
            }
        }
    );

    const deleteLocation = ({ id }: DeleteLocationMutationVariables) => {
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
        <>
            <HeaderContent
                title={`${t('common:locations')} ${props.name}`}
                routes={breadsCrumb}
                onBack={() => router.push('/locations')}
                actionsRight={
                    <Space>
                        {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                            <>
                                <Button
                                    type="primary"
                                    onClick={() => setShowNumberOfPrintsModal(true)}
                                >
                                    {t('actions:print-label')}
                                </Button>
                            </>
                        ) : (
                            <></>
                        )}
                        {modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                            <LinkButton
                                title={t('actions:edit')}
                                path={`/locations/edit/${props.id}`}
                                type="primary"
                            />
                        ) : (
                            <></>
                        )}
                        {modes.length > 0 && modes.includes(ModeEnum.Delete) ? (
                            <Button
                                loading={deleteLoading}
                                onClick={() => deleteLocation({ id: props.id })}
                            >
                                {t('actions:delete')}
                            </Button>
                        ) : (
                            <></>
                        )}
                    </Space>
                }
            />
            <NumberOfPrintsModal
                showModal={{
                    showNumberOfPrintsModal,
                    setShowNumberOfPrintsModal
                }}
                id={props.id}
                path="/api/locations/print/label"
            />
        </>
    );
};

export { LocationDetailsHeader };
