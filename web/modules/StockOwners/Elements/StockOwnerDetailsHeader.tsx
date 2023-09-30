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
import {
    ModeEnum,
    MutationSoftDeleteStockOwnerArgs,
    SoftDeleteStockOwnerMutation,
    SoftDeleteStockOwnerMutationVariables,
    useSoftDeleteStockOwnerMutation
} from 'generated/graphql';
import useTranslation from 'next-translate/useTranslation';
import configs from '../../../../common/configs.json';
import { FC } from 'react';
import { useRouter } from 'next/router';
import { HeaderContent } from '@components';
import { getModesFromPermissions, showError, showSuccess } from '@helpers';
import { useAppState } from 'context/AppContext';
import { ModelType } from 'models/ModelsV2';
import { useAuth } from 'context/AuthContext';
import { stockOwnerRoutes } from '../Static/stockOwnersRoutes';

export interface ISingleItemProps {
    id: string | any;
    name: string | any;
    dataModel: ModelType;
    status: any;
}

const StockOwnerDetailsHeader: FC<ISingleItemProps> = (props: ISingleItemProps) => {
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();

    const { t } = useTranslation();
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);
    const breadcrumb = [
        ...stockOwnerRoutes,
        {
            breadcrumbName: `${props.name}`
        }
    ];
    const { mutate: softDeleteMutate, isLoading: softDeleteLoading } =
        useSoftDeleteStockOwnerMutation<Error>(graphqlRequestClient, {
            onSuccess: (
                data: SoftDeleteStockOwnerMutation,
                _variables: SoftDeleteStockOwnerMutationVariables,
                _context: any
            ) => {
                if (!softDeleteLoading) {
                    router.push('/stock-owners');
                    showSuccess(t('messages:success-disabled'));
                }
            },
            onError: (error: any) => {
                if (error.response.errors) {
                    showError(t(`errors:${error.response.errors[0].extensions.code}`));
                } else {
                    showError(t('messages:error-disabling-data'));
                }
            }
        });

    const softDeleteStockOwner = ({ id }: MutationSoftDeleteStockOwnerArgs) => {
        Modal.confirm({
            title: t('messages:disable-confirm'),
            onOk: () => {
                softDeleteMutate({ id });
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    return (
        <HeaderContent
            title={`${t('common:stock-owner')} : ${props.name}`}
            routes={breadcrumb}
            onBack={() => router.push('/stock-owners')}
            actionsRight={
                props.status != configs.STOCK_OWNER_STATUS_CLOSED ? (
                    <Space>
                        {modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                            <>
                                <LinkButton
                                    title={t('actions:edit')}
                                    path={`/stock-owners/edit/${props.id}`}
                                    type="primary"
                                />
                                {
                                    //Disabled for the moment
                                    /* <Button
                                    loading={softDeleteLoading}
                                    onClick={() => softDeleteStockOwner({ id: props.id })}
                                    >
                                        {t('actions:disable')}
                                    </Button> */
                                }
                            </>
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

export { StockOwnerDetailsHeader };
