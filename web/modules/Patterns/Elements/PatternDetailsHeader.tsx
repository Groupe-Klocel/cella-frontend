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
import useTranslation from 'next-translate/useTranslation';
import configs from '../../../../common/configs.json';

import { FC, useEffect } from 'react';
import { useRouter } from 'next/router';
import { HeaderContent } from '@components';
import { getModesFromPermissions, showError, showSuccess, useDelete } from '@helpers';
import { useAppState } from 'context/AppContext';
import { ModelType } from 'models/ModelsV2';
import {
    ModeEnum,
    SoftDeletePatternMutation,
    SoftDeletePatternMutationVariables,
    UpdatePatternMutation,
    UpdatePatternMutationVariables,
    useSoftDeletePatternMutation,
    useUpdatePatternMutation
} from 'generated/graphql';
import { patternsRoutes } from '../Static/patternsRoutes';
import { useAuth } from 'context/AuthContext';

export interface ISingleItemProps {
    id: string | any;
    name: string | any;
    status: Number;
    dataModel: ModelType;
}

const PatternDetailsHeader: FC<ISingleItemProps> = (props: ISingleItemProps) => {
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();

    const { t } = useTranslation();
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);

    const breadsCrumb = [
        ...patternsRoutes,
        {
            breadcrumbName: `${props.name}`
        }
    ];

    // DISABLE PATTERN
    const { mutate: softDeleteMutate, isLoading: softDeleteLoading } =
        useSoftDeletePatternMutation<Error>(graphqlRequestClient, {
            onSuccess: (
                data: SoftDeletePatternMutation,
                _variables: SoftDeletePatternMutationVariables,
                _context: any
            ) => {
                if (!softDeleteLoading) {
                    if (data.softDeletePattern) {
                        showSuccess(t('messages:success-disabled'));
                        router.reload();
                    } else {
                        showError(t('messages:error-disabling-data'));
                    }
                }
            },
            onError: () => {
                showError(t('messages:error-disabling-data'));
            }
        });

    const softDeletePattern = ({ id }: SoftDeletePatternMutationVariables) => {
        Modal.confirm({
            title: t('messages:disable-confirm'),
            onOk: () => {
                softDeleteMutate({ id });
            },

            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    // ENABLE PATTERN
    const { mutate: updatePatternMutate, isLoading: enableLoading } =
        useUpdatePatternMutation<Error>(graphqlRequestClient, {
            onSuccess: (
                data: UpdatePatternMutation,
                _variables: UpdatePatternMutationVariables,
                _context: any
            ) => {
                if (!enableLoading) {
                    showSuccess(t('messages:success-enabled'));
                    router.reload();
                }
            },
            onError: () => {
                showError(t('messages:error-enabling-data'));
            }
        });
    const enablePattern = ({ id, input: input }: UpdatePatternMutationVariables) => {
        Modal.confirm({
            title: t('messages:enable-confirm'),
            onOk: () => {
                updatePatternMutate({ id, input: input });
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    return (
        <HeaderContent
            title={`${t('common:pattern')} ${props.name}`}
            routes={breadsCrumb}
            onBack={() => router.push('/patterns')}
            actionsRight={
                modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                    props.status != configs.PATTERN_STATUS_CLOSED ? (
                        <Space>
                            <LinkButton
                                title={t('actions:edit')}
                                path={`/patterns/edit/${props.id}`}
                                type="primary"
                            />
                            <Button
                                loading={softDeleteLoading}
                                onClick={() => softDeletePattern({ id: props.id })}
                            >
                                {t('actions:disable')}
                            </Button>
                        </Space>
                    ) : (
                        <Space>
                            <Button
                                loading={enableLoading}
                                onClick={() =>
                                    enablePattern({
                                        id: props.id,
                                        input: { status: configs.PATTERN_STATUS_IN_PROGRESS }
                                    })
                                }
                            >
                                {t('actions:enable')}
                            </Button>
                        </Space>
                    )
                ) : (
                    <></>
                )
            }
        />
    );
};

export { PatternDetailsHeader };
