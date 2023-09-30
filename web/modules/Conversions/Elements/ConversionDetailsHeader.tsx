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
import { conversionsRoutes } from 'modules/Conversions/Static/conversionsRoutes';
import useTranslation from 'next-translate/useTranslation';
import configs from '../../../../common/configs.json';

import { FC } from 'react';
import { useRouter } from 'next/router';
import { HeaderContent } from '@components';
import { getModesFromPermissions, showError, showSuccess } from '@helpers';
import { useAppState } from 'context/AppContext';
import { ModelType } from 'models/Models';
import {
    ModeEnum,
    SoftDeleteConversionMutation,
    SoftDeleteConversionMutationVariables,
    useSoftDeleteConversionMutation
} from 'generated/graphql';
import { useAuth } from 'context/AuthContext';

export interface ISingleItemProps {
    id: string | any;
    name: string | any;
    dataModel: ModelType;
    status: any;
}

const ConversionDetailsHeader: FC<ISingleItemProps> = (props: ISingleItemProps) => {
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();

    const { t } = useTranslation();
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);

    const breadsCrumb = [
        ...conversionsRoutes,
        {
            breadcrumbName: `${props.name}`
        }
    ];

    // DISABLE CONVERSION
    const { mutate: softDeleteMutate, isLoading: softDeleteLoading } =
        useSoftDeleteConversionMutation<Error>(graphqlRequestClient, {
            onSuccess: (
                data: SoftDeleteConversionMutation,
                _variables: SoftDeleteConversionMutationVariables,
                _context: any
            ) => {
                if (!softDeleteLoading) {
                    router.push('/conversions');
                    showSuccess(t('messages:success-disabled'));
                }
            },
            onError: (err) => {
                showError(t('messages:error-disabling-data'));
            }
        });

    const softDeleteConversion = ({ id }: SoftDeleteConversionMutationVariables) => {
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
            title={`${t('common:conversion')} ${props.name}`}
            routes={breadsCrumb}
            onBack={() => router.push('/conversions')}
            actionsRight={
                modes.length > 0 &&
                modes.includes(ModeEnum.Update) &&
                props.status != configs.CONVERSION_STATUS_CLOSED ? (
                    <Space>
                        <LinkButton
                            title={t('actions:edit')}
                            path={`/conversions/edit/${props.id}`}
                            type="primary"
                        />
                        <Button
                            loading={softDeleteLoading}
                            onClick={() => softDeleteConversion({ id: props.id })}
                        >
                            {t('actions:disable')}
                        </Button>
                    </Space>
                ) : (
                    <></>
                )
            }
        />
    );
};

export { ConversionDetailsHeader };
