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
import { EyeTwoTone, CaretDownOutlined, CaretUpOutlined } from '@ant-design/icons';
import { pathParams, getModesFromPermissions, showSuccess, showError } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
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
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { HandlingUnitOutboundModelV2 } from '@helpers';
import { RoundAdvisedAddressModelV2 } from '@helpers';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from 'context/AuthContext';
import { RoundLineModelV2 } from '@helpers';
import { StatusHistoryDetailExtraModelV2 } from '@helpers';

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
    const { permissions, parameters } = useAppState();
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const RoundLineModes = getModesFromPermissions(permissions, Table.RoundLine);
    const RoundAdvisedAddressModes = getModesFromPermissions(
        permissions,
        Table.RoundAdvisedAddress
    );
    const [refetchAddresses, setRefetchAddresses] = useState<boolean>(false);
    const HandlingUnitOutboundModes = getModesFromPermissions(
        permissions,
        Table.HandlingUnitOutbound
    );
    const [priorityStatus, setPriorityStatus] = useState({
        id: null as string | null,
        newOrder: null as number | null
    });
    const [RoundAdvisedAddressData, setRoundAdvisedAddressData] = useState<any[]>([]);
    const router = useRouter();
    const [form] = Form.useForm();
    const errorMessageUpdateData = t('messages:error-update-data');
    const successMessageUpdateData = t('messages:success-updated');

    const configsParamsCodes = useMemo(() => {
        const findCodeByScope = (items: any[], scope: string) => {
            return items.filter((item: any) => item.scope === scope);
        };

        const huTypes = findCodeByScope(parameters, 'handling_unit_type');

        const nonEquipmentHuTypeCodes = huTypes
            .filter((huType: any) => huType.value.toLowerCase() !== 'equipment')
            .map((huType: any) => huType.code);

        return {
            nonEquipmentHuTypeCodes
        };
    }, [parameters]);

    const roundLineData: HeaderData = {
        title: t('common:associated', { name: t('common:round-lines') }),
        routes: [],
        actionsComponent: <></>
    };

    const roundAdvisedAddressData: HeaderData = {
        title: t('common:associated', { name: t('common:round-advised-address') }),
        routes: [],
        actionsComponent: <></>
    };

    const boxHeaderData: HeaderData = {
        title: t('common:associated', { name: t('common:boxes') }),
        routes: [],
        actionsComponent: <></>
    };

    // header RELATED to StatusHistory
    const statusHistoryHeaderData: HeaderData = {
        title: `${t('common:status-history')}`,
        routes: [],
        actionsComponent: null
    };

    // UPDATE Round
    const {
        mutate: userMutate,
        isPending: updateLoading,
        data
    } = useUpdateRoundAdvisedAddressMutation<Error>(graphqlRequestClient, {
        onSuccess: (
            data: UpdateRoundAdvisedAddressMutation,
            _variables: UpdateRoundAdvisedAddressMutationVariables,
            _context: any
        ) => {
            showSuccess(successMessageUpdateData);
            setRefetchAddresses(true);
        },
        onError: () => {
            showError(errorMessageUpdateData);
        }
    });

    const UpdateRoundAdvisedAddress = ({ id }: UpdateRoundAdvisedAddressMutationVariables) => {
        Modal.confirm({
            title: t('messages:reset-confirm'),
            onOk: () => {
                form.setFieldsValue({ userTread: null });
                userMutate({ id: id, input: form.getFieldsValue(true) });
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    return (
        <>
            {RoundLineModes.length > 0 && RoundLineModes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <ListComponent
                        searchCriteria={{ objectId: roundId }}
                        dataModel={StatusHistoryDetailExtraModelV2}
                        headerData={statusHistoryHeaderData}
                        searchable={false}
                        triggerDelete={undefined}
                        triggerSoftDelete={undefined}
                        columnFilter={false}
                    />
                    <Divider />
                    <ListComponent
                        searchCriteria={{ roundId: roundId }}
                        dataModel={RoundLineModelV2}
                        headerData={roundLineData}
                        triggerDelete={{ idToDelete, setIdToDelete }}
                        triggerSoftDelete={{ idToDisable, setIdToDisable }}
                        actionColumns={[
                            {
                                title: 'actions:actions',
                                key: 'actions',
                                render: (record: { id: string }) => (
                                    <Space>
                                        {RoundLineModes.length == 0 ||
                                        !RoundLineModes.includes(ModeEnum.Read) ? (
                                            <></>
                                        ) : (
                                            <>
                                                <LinkButton
                                                    icon={<EyeTwoTone />}
                                                    path={pathParams('line/[id]', record.id)}
                                                />
                                            </>
                                        )}
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
            {RoundAdvisedAddressModes.length > 0 &&
            RoundAdvisedAddressModes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <ListComponent
                        headerData={roundAdvisedAddressData}
                        dataModel={RoundAdvisedAddressModelV2}
                        searchCriteria={{ roundId: roundId }}
                        triggerDelete={undefined}
                        triggerSoftDelete={undefined}
                        triggerPriorityChange={{
                            id: priorityStatus.id,
                            setId: setPriorityStatus,
                            newOrder: priorityStatus.newOrder,
                            orderingField: 'roundOrderId',
                            parentId: 'roundId'
                        }}
                        sortDefault={[{ ascending: true, field: 'roundOrderId' }]}
                        actionColumns={[
                            {
                                title: 'actions:actions',
                                key: 'actions',
                                render: (value: any, record: any) => (
                                    <Space>
                                        {record.roundOrderId === null ? (
                                            <></>
                                        ) : (
                                            <>
                                                <Button
                                                    onClick={() => {
                                                        if (priorityStatus.id === null) {
                                                            setPriorityStatus({
                                                                newOrder: record.roundOrderId - 1,
                                                                id: record.id
                                                            });
                                                        }
                                                    }}
                                                    disabled={record.roundOrderId === 1}
                                                    loading={
                                                        priorityStatus.id !== null &&
                                                        record.roundOrderId !== 1
                                                    }
                                                    icon={<CaretUpOutlined />}
                                                />
                                                <Button
                                                    onClick={() => {
                                                        if (priorityStatus.id === null) {
                                                            setPriorityStatus({
                                                                newOrder: record.roundOrderId + 1,
                                                                id: record.id
                                                            });
                                                        }
                                                    }}
                                                    disabled={
                                                        value.listDataCount === record.roundOrderId
                                                    }
                                                    loading={
                                                        priorityStatus.id !== null &&
                                                        value.listDataCount !== record.roundOrderId
                                                    }
                                                    icon={<CaretDownOutlined />}
                                                />
                                            </>
                                        )}
                                        {/* No details page for RoundAdvisedAddress yet
                                        <LinkButton
                                            icon={<EyeTwoTone />}
                                            path={'/rounds/:id'.replace(':id', record.id)}
                                        /> */}
                                    </Space>
                                )
                            }
                        ]}
                        setData={setRoundAdvisedAddressData}
                    />
                    {/* <ListComponent
                        searchCriteria={{ roundId: roundId }}
                        dataModel={RoundAdvisedAddressModelV2}
                        headerData={roundAdvisedAddressData}
                        triggerDelete={{ idToDelete, setIdToDelete }}
                        triggerSoftDelete={{ idToDisable, setIdToDisable }}
                        refetch={refetchAddresses}
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
                    /> */}
                </>
            ) : (
                <></>
            )}
            {HandlingUnitOutboundModes.length > 0 &&
            HandlingUnitOutboundModes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <ListComponent
                        searchCriteria={{
                            roundId: roundId,
                            handlingUnit_Type: configsParamsCodes.nonEquipmentHuTypeCodes
                        }}
                        dataModel={HandlingUnitOutboundModelV2}
                        headerData={boxHeaderData}
                        sortDefault={[{ field: 'roundPosition', ascending: true }]}
                        triggerDelete={{ idToDelete, setIdToDelete }}
                        triggerSoftDelete={{ idToDisable, setIdToDisable }}
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
