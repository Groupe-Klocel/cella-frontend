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
import { PatternPathLink_PatternModelV2 } from 'models/PatternPathLink_PatternModelV2';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';

export interface IItemDetailsProps {
    id?: string | any;
    name?: string | any;
}

const PatternDetailsExtra = ({ id, name }: IItemDetailsProps) => {
    const { t } = useTranslation();
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [patternPathLinksList, setPatterPathLinksList] = useState<any>();
    const [priorityStatus, setPriorityStatus] = useState({
        id: null as string | null,
        newOrder: null as number | null
    });
    const [refetch, setRefetch] = useState<boolean>(false);

    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.PatternPath);

    const maxOrder = patternPathLinksList?.reduce((max: number, item: any) => {
        return item.order > max ? item.order : max;
    }, 0);

    const headerData: HeaderData = {
        title: t('common:pattern-paths', { name: t('common:associated') }),
        routes: [],
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Create) ? (
                <LinkButton
                    title={t('actions:associate', { name: t('common:pattern-path') })}
                    path={pathParamsFromDictionary('/patterns/paths/add', {
                        patternId: id,
                        patternName: name,
                        prevMaxOrder: maxOrder
                    })}
                    type="primary"
                />
            ) : null
    };

    const { graphqlRequestClient } = useAuth();

    //Specific function to reorder the pattern paths links once one is deleted
    const deletePatternPathLink = (patternPathLinkId: string) => {
        Modal.confirm({
            title: t('messages:delete-confirm'),
            onOk: async () => {
                console.log('Deleting pattern path Link ID:', patternPathLinkId, 'and reorder');

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
                            ids: patternPathLinkId,
                            tableName: 'patternPathLink',
                            orderingField: 'order',
                            operation: 'delete',
                            parentId: 'patternId'
                        }
                    }
                };
                try {
                    const patternPathLinkResult = await graphqlRequestClient.request(
                        query,
                        variables
                    );
                    if (patternPathLinkResult.executeFunction.status === 'ERROR') {
                        showError(patternPathLinkResult.executeFunction.output);
                    } else if (
                        patternPathLinkResult.executeFunction.status === 'OK' &&
                        patternPathLinkResult.executeFunction.output.status === 'KO'
                    ) {
                        showError(
                            t(`errors:${patternPathLinkResult.executeFunction.output.output.code}`)
                        );
                        console.log(
                            'Backend_message',
                            patternPathLinkResult.executeFunction.output.output
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
                        searchCriteria={{ patternId: id }}
                        refetch={refetch}
                        headerData={headerData}
                        dataModel={PatternPathLink_PatternModelV2}
                        triggerDelete={{ idToDelete, setIdToDelete }}
                        triggerSoftDelete={{ idToDisable, setIdToDisable }}
                        setData={setPatterPathLinksList}
                        triggerPriorityChange={{
                            id: priorityStatus.id,
                            setId: setPriorityStatus,
                            newOrder: priorityStatus.newOrder,
                            orderingField: 'order',
                            parentId: 'patternId'
                        }}
                        sortDefault={[{ ascending: true, field: 'order' }]}
                        actionColumns={[
                            {
                                title: 'actions:actions',
                                key: 'actions',
                                render: (record: {
                                    id: string;
                                    patternPathId: string;
                                    order: number;
                                }) => (
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
                                                    disabled={
                                                        patternPathLinksList[0].listDataCount ===
                                                        record.order
                                                    }
                                                    loading={
                                                        priorityStatus.id !== null &&
                                                        patternPathLinksList[0].listDataCount !==
                                                            record.order
                                                    }
                                                    icon={<CaretDownOutlined />}
                                                />
                                            </>
                                        )}
                                        <LinkButton
                                            icon={<EyeTwoTone />}
                                            path={pathParams(
                                                '/pattern-paths/[id]',
                                                record.patternPathId
                                            )}
                                        />
                                        {modes.length > 0 &&
                                        modes.includes(ModeEnum.Delete) &&
                                        PatternPathLink_PatternModelV2.isDeletable ? (
                                            <Button
                                                icon={<DisconnectOutlined />}
                                                danger
                                                onClick={() => deletePatternPathLink(record.id)}
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

export { PatternDetailsExtra };
