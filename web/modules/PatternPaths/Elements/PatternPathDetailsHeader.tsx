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
import { FC, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { HeaderContent } from '@components';
import {
    getModesFromPermissions,
    pathParamsFromDictionary,
    showError,
    showSuccess,
    useDelete
} from '@helpers';
import { useAppState } from 'context/AppContext';
import { ModelType } from 'models/Models';
import {
    GetListOfOrdersQuery,
    ModeEnum,
    SoftDeletePatternPathMutation,
    SoftDeletePatternPathMutationVariables,
    UpdatePatternPathMutation,
    UpdatePatternPathMutationVariables,
    useGetListOfOrdersQuery,
    useSoftDeletePatternPathMutation,
    useUpdatePatternPathMutation
} from 'generated/graphql';
import { patternPathsRoutes } from '../Static/patternPathRoutes';
import { useAuth } from 'context/AuthContext';

export interface ISingleItemProps {
    id: string | any;
    name: string | any;
    stockOwnerName: string | any;
    dataModel: ModelType;
    status: any;
    order: number;
}

const PatternPathDetailsHeader: FC<ISingleItemProps> = (props: ISingleItemProps) => {
    const router = useRouter();
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);
    const [, setMaxOrder] = useState<number>(0);
    const [patternPathWithOrder, setPatternPathWithOrder] = useState<any>();

    const breadsCrumb = [
        ...patternPathsRoutes,
        {
            breadcrumbName: `${props.name}`
        }
    ];

    const orderList = useGetListOfOrdersQuery<Partial<GetListOfOrdersQuery>, Error>(
        graphqlRequestClient
    );
    useEffect(() => {
        const receivedList = orderList?.data?.patternPaths?.results.map((e: any) => e.order);
        if (receivedList) {
            setMaxOrder(Math.max(...receivedList));
        }
        setPatternPathWithOrder(orderList?.data?.patternPaths?.results);
    }, [orderList]);

    //rework order list
    function compare(a: any, b: any) {
        if (a.order < b.order) {
            return -1;
        }
        if (a.order > b.order) {
            return 1;
        }
        return 0;
    }
    const inCoursePatternPath = patternPathWithOrder
        ?.filter((e: any) => e.order !== null)
        .sort(compare);

    //For order updates on Finish
    const { mutate: updateMutate, isLoading: updateLoading } = useUpdatePatternPathMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: UpdatePatternPathMutation,
                _variables: UpdatePatternPathMutationVariables,
                _context: any
            ) => {
                // showSuccess(t('messages:success-updated'));
            },
            onError: () => {
                showError(t('messages:error-update-data'));
            }
        }
    );

    const updatePatternPath = ({ id, input }: UpdatePatternPathMutationVariables) => {
        updateMutate({ id, input });
    };

    // DISABLE PATTERN PATH
    const { mutate: softDeleteMutate, isLoading: softDeleteLoading } =
        useSoftDeletePatternPathMutation<Error>(graphqlRequestClient, {
            onSuccess: (
                data: SoftDeletePatternPathMutation,
                _variables: SoftDeletePatternPathMutationVariables,
                _context: any
            ) => {
                if (!softDeleteLoading) {
                    router.push('/pattern-paths');
                    showSuccess(t('messages:success-disabled'));
                }
            },
            onError: (err) => {
                showError(t('messages:error-disabling-data'));
            }
        });

    const softDeletePatternPath = ({ id }: SoftDeletePatternPathMutationVariables) => {
        Modal.confirm({
            title: t('messages:disable-confirm'),
            onOk: () => {
                const patternPathToUpdate = inCoursePatternPath.filter(
                    (e: any) => e.order > props.order
                );
                if (patternPathToUpdate) {
                    patternPathToUpdate.forEach((e: any) =>
                        updatePatternPath({ id: e.id, input: { order: (e.order - 1) as any } })
                    );
                }
                softDeleteMutate({ id });
            },

            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    // ENABLE PATTERN PATH
    const { mutate: updatePatternPathMutate, isLoading: enableLoading } =
        useUpdatePatternPathMutation<Error>(graphqlRequestClient, {
            onSuccess: (
                data: UpdatePatternPathMutation,
                _variables: UpdatePatternPathMutationVariables,
                _context: any
            ) => {
                if (!enableLoading) {
                    if (data.updatePatternPath) {
                        router.push('edit/' + props.id);
                        showSuccess(t('messages:success-enabled'));
                    } else {
                        showError(t('messages:error-enabling-data'));
                    }
                }
            },
            onError: () => {
                showError(t('messages:error-enabling-data'));
            }
        });

    const enablePatternPath = ({ id, input: input }: UpdatePatternPathMutationVariables) => {
        Modal.confirm({
            title: t('messages:enable-confirm'),
            onOk: () => {
                updatePatternPathMutate({ id, input: input });
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    return (
        <HeaderContent
            title={`${t('common:pattern-path')} - ${props.name}`}
            routes={breadsCrumb}
            onBack={() => router.back()}
            actionsRight={
                modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                    props.status != configs.PATTERN_PATH_STATUS_CLOSED ? (
                        <Space>
                            <LinkButton
                                title={t('actions:manage-locations')}
                                path={pathParamsFromDictionary(
                                    `/pattern-paths/manage/${props.id}`,
                                    {
                                        patternId: props.id,
                                        patternName: props.name,
                                        stockOwnerName: props.stockOwnerName
                                    }
                                )}
                                type="primary"
                            />
                            <LinkButton
                                title={t('actions:edit')}
                                path={`/pattern-paths/edit/${props.id}`}
                                type="primary"
                            />

                            <Button
                                loading={softDeleteLoading}
                                onClick={() => softDeletePatternPath({ id: props.id })}
                            >
                                {t('actions:disable')}
                            </Button>
                        </Space>
                    ) : (
                        <Space>
                            <Button
                                loading={enableLoading}
                                onClick={() =>
                                    enablePatternPath({
                                        id: props.id,
                                        input: { status: configs.PATTERN_PATH_STATUS_IN_PROGRESS }
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

export { PatternPathDetailsHeader };
