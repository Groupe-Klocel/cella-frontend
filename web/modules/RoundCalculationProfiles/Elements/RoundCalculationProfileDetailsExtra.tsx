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
import {
    CaretDownOutlined,
    CaretUpOutlined,
    DeleteOutlined,
    DisconnectOutlined,
    EyeTwoTone
} from '@ant-design/icons';
import {
    pathParams,
    getModesFromPermissions,
    pathParamsFromDictionary,
    showError,
    showSuccess
} from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Button, Divider, Modal, Space } from 'antd';
import { useAppState } from 'context/AppContext';
import { ModeEnum, Table } from 'generated/graphql';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { useState } from 'react';
import { RoundCalculationProfileEquipmentModelV2 } from '@helpers';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';

export interface IItemDetailsProps {
    id?: string | any;
    name?: string | any;
}

const RoundCalculationProfileDetailsExtra = ({ id, name }: IItemDetailsProps) => {
    const { t } = useTranslation();
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [roundCalculationProfileEquipmentsList, setRoundCalculationProfileEquipmentsList] =
        useState<any>();
    const [priorityStatus, setPriorityStatus] = useState({
        id: null as string | null,
        newOrder: null as number | null
    });
    const [refetch, setRefetch] = useState<boolean>(false);

    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.RoundCalculationProfileEquipment);

    const maxOrder = roundCalculationProfileEquipmentsList?.reduce((max: number, item: any) => {
        return item.order > max ? item.order : max;
    }, 0);

    const headerData: HeaderData = {
        title: t('common:associated', { name: t('common:equipments') }),
        routes: [],
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Create) ? (
                <LinkButton
                    title={t('actions:associate', { name: t('common:equipment') })}
                    path={pathParamsFromDictionary('/round-calculation-profiles/equipment/add', {
                        roundCalculationProfileId: id,
                        roundCalculationProfileName: name,
                        prevMaxOrder: maxOrder
                    })}
                    type="primary"
                />
            ) : null
    };

    const { graphqlRequestClient } = useAuth();

    //Specific function to reorder the RCPE once one is deleted
    const deleteRoundCalculationProfileEquipment = (id: string) => {
        Modal.confirm({
            title: t('messages:delete-confirm'),
            onOk: async () => {
                console.log('Deleting RCPE ID:', id, 'and reorder');

                const query = gql`
                    mutation executeFunction($functionName: String!, $event: JSON!) {
                        executeFunction(functionName: $functionName, event: $event) {
                            status
                            output
                        }
                    }
                `;

                const variables = {
                    functionName: 'reorder_priority',
                    event: {
                        input: {
                            ids: id,
                            tableName: 'roundCalculationProfileEquipment',
                            orderingField: 'order',
                            operation: 'delete',
                            parentId: 'roundCalculationProfileId'
                        }
                    }
                };
                try {
                    const roundCalculationProfileEquipmentResult =
                        await graphqlRequestClient.request(query, variables);
                    if (roundCalculationProfileEquipmentResult.executeFunction.status === 'ERROR') {
                        showError(roundCalculationProfileEquipmentResult.executeFunction.output);
                    } else if (
                        roundCalculationProfileEquipmentResult.executeFunction.status === 'OK' &&
                        roundCalculationProfileEquipmentResult.executeFunction.output.status ===
                            'KO'
                    ) {
                        showError(
                            t(
                                `errors:${roundCalculationProfileEquipmentResult.executeFunction.output.output.code}`
                            )
                        );
                        console.log(
                            'Backend_message',
                            roundCalculationProfileEquipmentResult.executeFunction.output.output
                        );
                    } else {
                        setRefetch((prev: any) => !prev);
                        showSuccess(t('messages:success-deleted'));
                    }
                } catch (error) {
                    showError(t('messages:error-executing-function'));
                    console.log('executeFunctionError', error);
                }
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    return (
        <>
            {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <ListComponent
                        searchCriteria={{ roundCalculationProfileId: id }}
                        refetch={refetch}
                        headerData={headerData}
                        dataModel={RoundCalculationProfileEquipmentModelV2}
                        triggerDelete={{ idToDelete, setIdToDelete }}
                        triggerSoftDelete={{ idToDisable, setIdToDisable }}
                        setData={setRoundCalculationProfileEquipmentsList}
                        triggerPriorityChange={{
                            id: priorityStatus.id,
                            setId: setPriorityStatus,
                            newOrder: priorityStatus.newOrder,
                            orderingField: 'order',
                            parentId: 'roundCalculationProfileId'
                        }}
                        sortDefault={[{ ascending: true, field: 'order' }]}
                        actionColumns={[
                            {
                                title: 'actions:actions',
                                key: 'actions',
                                render: (
                                    value: any,
                                    record: {
                                        id: string;
                                        equipmentId: string;
                                        order: number;
                                    }
                                ) => (
                                    <Space>
                                        {record.order === null ? (
                                            <></>
                                        ) : (
                                            <>
                                                <Button
                                                    onClick={() => {
                                                        if (priorityStatus.id === null) {
                                                            setPriorityStatus({
                                                                newOrder: record.order - 1,
                                                                id: record.id
                                                            });
                                                        }
                                                    }}
                                                    disabled={record.order === 1}
                                                    loading={
                                                        priorityStatus.id !== null &&
                                                        record.order !== 1
                                                    }
                                                    icon={<CaretUpOutlined />}
                                                />
                                                <Button
                                                    onClick={() => {
                                                        if (priorityStatus.id === null) {
                                                            setPriorityStatus({
                                                                newOrder: record.order + 1,
                                                                id: record.id
                                                            });
                                                        }
                                                    }}
                                                    disabled={value.listDataCount === record.order}
                                                    loading={
                                                        priorityStatus.id !== null &&
                                                        value.listDataCount !== record.order
                                                    }
                                                    icon={<CaretDownOutlined />}
                                                />
                                            </>
                                        )}
                                        <LinkButton
                                            icon={<EyeTwoTone />}
                                            path={pathParams('/equipment/[id]', record.equipmentId)}
                                        />
                                        {modes.length > 0 &&
                                        modes.includes(ModeEnum.Delete) &&
                                        RoundCalculationProfileEquipmentModelV2.isDeletable ? (
                                            <Button
                                                icon={<DisconnectOutlined />}
                                                danger
                                                onClick={() =>
                                                    deleteRoundCalculationProfileEquipment(
                                                        record.id
                                                    )
                                                }
                                            ></Button>
                                        ) : (
                                            <></>
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
        </>
    );
};

export { RoundCalculationProfileDetailsExtra };
