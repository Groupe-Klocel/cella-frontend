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
import { EyeTwoTone } from '@ant-design/icons';
import { pathParams, getModesFromPermissions, showSuccess, showError } from '@helpers';
import useTranslation from 'next-translate/useTranslation';
import { Button, Divider, Form, Modal, Space, Typography } from 'antd';
import { useAppState } from 'context/AppContext';
import {
    ModeEnum,
    Table,
    UpdateRoundAdvisedAddressInput,
    UpdateRoundAdvisedAddressMutation,
    UpdateRoundAdvisedAddressMutationVariables,
    useUpdateRoundAdvisedAddressMutation
} from 'generated/graphql';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponent';
import { BoxModel } from 'models/BoxModel';
import { RoundAdvisedAddressModel } from 'models/RoundAdvisedAddressModel';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from 'context/AuthContext';

const { Title } = Typography;

export interface IItemDetailsProps {
    roundId?: string | any;
    roundName?: string | any;
    roundStatus?: number | any;
    stockOwnerId?: string | any;
    stockOwnerName?: string | any;
}

const RoundDetailsExtra = ({ roundId }: IItemDetailsProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const { permissions } = useAppState();
    const RoundAdvisedAddressModes = getModesFromPermissions(
        permissions,
        Table.RoundAdvisedAddress
    );
    const HandlingUnitOutboundModes = getModesFromPermissions(
        permissions,
        Table.HandlingUnitOutbound
    );
    const router = useRouter();
    const errorMessageUpdateData = t('messages:error-update-data');
    const successMessageUpdateData = t('messages:success-updated');

    const roundLineData: HeaderData = {
        title: t('common:associated', { name: t('common:round-lines') }),
        routes: [],
        actionsComponent: <></>
    };

    const boxHeaderData: HeaderData = {
        title: t('common:associated', { name: t('common:boxes') }),
        routes: [],
        actionsComponent: <></>
    };

    // To delete userTread
    const [form] = Form.useForm();
    form.setFieldsValue({ userTread: null });
    const formData = form.getFieldsValue(true);

    // UPDATE Round
    const {
        mutate: userMutate,
        isLoading: updateLoading,
        data
    } = useUpdateRoundAdvisedAddressMutation<Error>(graphqlRequestClient, {
        onSuccess: (
            data: UpdateRoundAdvisedAddressMutation,
            _variables: UpdateRoundAdvisedAddressMutationVariables,
            _context: any
        ) => {
            showSuccess(successMessageUpdateData);
            router.reload();
        },
        onError: () => {
            showError(errorMessageUpdateData);
        }
    });

    const UpdateRoundAdvisedAddress = ({
        id,
        input
    }: UpdateRoundAdvisedAddressMutationVariables) => {
        Modal.confirm({
            title: t('messages:reset-confirm'),
            onOk: () => {
                userMutate({ id: id, input: formData });
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    return (
        <>
            {RoundAdvisedAddressModes.length > 0 &&
            RoundAdvisedAddressModes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <ListComponent
                        searchCriteria={{ roundId: roundId }}
                        dataModel={RoundAdvisedAddressModel}
                        headerData={roundLineData}
                        actionColumns={[
                            {
                                title: 'actions:actions',
                                key: 'actions',
                                render: (record: {
                                    id: string;
                                    name: string;
                                    roundId: string;
                                    userTread: UpdateRoundAdvisedAddressInput;
                                }) => (
                                    <Space>
                                        {RoundAdvisedAddressModes.length != 0 &&
                                        RoundAdvisedAddressModes.includes(ModeEnum.Update) ? (
                                            <Space>
                                                {record.userTread != null ? (
                                                    <Button
                                                        loading={updateLoading}
                                                        onClick={() =>
                                                            UpdateRoundAdvisedAddress({
                                                                id: record.id,
                                                                input: record.userTread
                                                            })
                                                        }
                                                    >
                                                        {t('actions:reset_user')}
                                                    </Button>
                                                ) : (
                                                    <></>
                                                )}
                                            </Space>
                                        ) : null}
                                    </Space>
                                )
                            }
                        ]}
                        searchable={false}
                    />
                </>
            ) : (
                <></>
            )}
            {HandlingUnitOutboundModes.length > 0 &&
            HandlingUnitOutboundModes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <ListComponent
                        searchCriteria={{ roundId: roundId }}
                        dataModel={BoxModel}
                        headerData={boxHeaderData}
                        actionColumns={[
                            {
                                title: 'actions:actions',
                                key: 'actions',
                                render: (record: { id: string; name: string; roundId: string }) => (
                                    <Space>
                                        <LinkButton
                                            icon={<EyeTwoTone />}
                                            path={pathParams('/boxes/[id]', record.id)}
                                        />
                                    </Space>
                                )
                            }
                        ]}
                        searchable={false}
                    />
                </>
            ) : (
                <></>
            )}
        </>
    );
};

export { RoundDetailsExtra };
