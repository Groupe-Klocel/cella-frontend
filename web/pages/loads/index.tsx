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
import {
    EditTwoTone,
    EyeTwoTone,
    InboxOutlined,
    PrinterOutlined,
    DeleteOutlined
} from '@ant-design/icons';
import { AppHead, LinkButton, SinglePrintDocumentSetModal } from '@components';
import { getModesFromPermissions, pathParams, showError, showSuccess } from '@helpers';
import { Button, Modal, Space } from 'antd';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import 'moment/min/locales';
import moment from 'moment';
import { ModeEnum, useListParametersForAScopeQuery } from 'generated/graphql';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useEffect, useState } from 'react';
import { LoadModelV2 as model } from '@helpers';
import { loadsRoutes as itemRoutes } from 'modules/Loads/Static/LoadsRoutes';
import configs from '../../../common/configs.json';
import { useRouter } from 'next/router';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';

type PageComponent = FC & { layout: typeof MainLayout };

const LoadsPage: PageComponent = () => {
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const rootPath = itemRoutes[itemRoutes.length - 1].path;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [triggerRefresh, setTriggerRefresh] = useState<boolean>(false);
    const [showSinglePrintModal, setShowSinglePrintModal] = useState(false);
    const [idToPrint, setIdToPrint] = useState<string>();
    const [referenceToPrint, setReferenceToPrint] = useState<string>();
    const [documentAttachmentsData, setDocumentAttachmentsData] = useState<any>();
    const [defaultLoadDocuments, setDefaultLoadDocuments] = useState<any>();

    const fetchDocumentsList = async (record: any) => {
        const ruleVariables = {
            context: {
                object_name: 'load',
                stock_owner: record?.extras_stockOwnerName ?? undefined,
                shipping_type: record?.extras_shippingType ?? undefined,
                carrier: record?.extras_carrierName ?? undefined,
                delivery_po_type: record?.extras_deliveryType ?? undefined,
                delivery_customer_code: record?.extras_thirdPartyCode,
                dangerous: record?.extras_dangereux ?? undefined
            }
        };

        const ruleQuery = gql`
            query executeRule($context: JSON!) {
                executeRule(ruleName: "DOCUMENT_LIST", context: $context)
            }
        `;

        const documentAttachmentsQuery = gql`
            query documentAttachments($filters: DocumentAttachmentSearchFilters) {
                documentAttachments(filters: $filters) {
                    results {
                        id
                        name
                        description
                    }
                }
            }
        `;

        const documentAttachmentsVariables = {
            filters: {
                objectId: record.id
            }
        };

        const [ruleResult, documentAttachmentsResult] = await Promise.all([
            graphqlRequestClient.request(ruleQuery, ruleVariables),
            graphqlRequestClient.request(documentAttachmentsQuery, documentAttachmentsVariables)
        ]);

        return {
            documentList: ruleResult?.executeRule?.document_list?.value,
            documentAttachments: documentAttachmentsResult?.documentAttachments?.results || []
        };
    };

    const headerData: HeaderData = {
        title: t('common:loads'),
        routes: itemRoutes,
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Create) ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:load') })}
                    path={`${rootPath}/add`}
                    type="primary"
                />
            ) : null
    };

    //retrieve client's date for printing
    const local = moment();
    local.locale();
    const dateLocal = local.format('l') + ', ' + local.format('LT');

    // DISPATCH LOAD
    const statusDispatched = configs.DELIVERY_STATUS_DISPATCHED;
    const dispatchLoad = async (id: String) => {
        Modal.confirm({
            title: t('messages:dispatch-load-confirm'),
            onOk: async () => {
                const query = gql`
                    mutation executeFunction($functionName: String!, $event: JSON!) {
                        executeFunction(functionName: $functionName, event: $event) {
                            status
                            output
                        }
                    }
                `;

                const variables = {
                    functionName: 'load_dispatch',
                    event: { input: { loadId: id } }
                };
                try {
                    const deliveryHUO = await graphqlRequestClient.request(query, variables);
                    if (deliveryHUO.executeFunction.status === 'ERROR') {
                        showError(deliveryHUO.executeFunction.output);
                    } else if (
                        deliveryHUO.executeFunction.status === 'OK' &&
                        deliveryHUO.executeFunction.output.status === 'KO'
                    ) {
                        const deliveryList =
                            deliveryHUO.executeFunction.output.output.delivery.join(', ');
                        showError(
                            t(`errors:${deliveryHUO.executeFunction.output.output.code}`, {
                                name: t(deliveryList)
                            })
                        );
                        console.log('Backend_message', deliveryHUO.executeFunction.output.output);
                    } else {
                        showSuccess(t('messages:success-dispatched'));
                        setTriggerRefresh(!triggerRefresh);
                    }
                } catch (error) {
                    console.error('Error during dispatch request:', error);
                    showError(t('messages:error-executing-function'));
                }
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    const confirmAction = (id: string | undefined, setId: any, action: 'delete' | 'disable') => {
        return () => {
            Modal.confirm({
                title: t('messages:delete-confirm'),
                onOk: () => {
                    setId(id);
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        };
    };

    return (
        <>
            <AppHead title={headerData.title} />
            <ListComponent
                headerData={headerData}
                dataModel={model}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                refetch={triggerRefresh}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: {
                            id: string;
                            status: number;
                            numberHuLoaded: number;
                            name: string;
                            managedByExternalSystem?: boolean;
                            extras_stockOwnerName?: string;
                            extras_shippingType?: string;
                            extras_carrierName?: string;
                            extras_deliveryType?: string;
                            extras_thirdPartyCode?: string;
                            extras_dangereux?: boolean;
                        }) => (
                            <Space>
                                {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                                    <LinkButton
                                        icon={<EyeTwoTone />}
                                        path={pathParams(`${rootPath}/[id]`, record.id)}
                                    />
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Update) &&
                                model.isEditable &&
                                record.status !== configs.LOAD_STATUS_DISPATCHED ? (
                                    <LinkButton
                                        icon={<EditTwoTone />}
                                        path={pathParams(`${rootPath}/edit/[id]`, record.id)}
                                    />
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Update) &&
                                record.status > configs.LOAD_LINE_STATUS_CREATED &&
                                record.status < configs.LOAD_STATUS_DISPATCHED &&
                                record.numberHuLoaded > 0 &&
                                !record.managedByExternalSystem &&
                                model.isEditable ? (
                                    <Button
                                        icon={<InboxOutlined />}
                                        onClick={() => dispatchLoad(record.id)}
                                    ></Button>
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Delete) &&
                                model.isDeletable &&
                                record.status == configs.LOAD_STATUS_CREATED &&
                                !record.managedByExternalSystem &&
                                record.numberHuLoaded <= 0 ? (
                                    <Button
                                        icon={<DeleteOutlined />}
                                        danger
                                        onClick={() =>
                                            confirmAction(record.id, setIdToDelete, 'delete')()
                                        }
                                    />
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                                    <Button
                                        icon={<PrinterOutlined />}
                                        onClick={async () => {
                                            setShowSinglePrintModal(true);
                                            setIdToPrint(record.id);
                                            setReferenceToPrint(record.name);
                                            const { documentList, documentAttachments } =
                                                await fetchDocumentsList(record);
                                            setDefaultLoadDocuments(documentList);
                                            setDocumentAttachmentsData(documentAttachments);
                                        }}
                                    />
                                ) : (
                                    <></>
                                )}
                            </Space>
                        )
                    }
                ]}
                routeDetailPage={`${rootPath}/:id`}
            />
            <SinglePrintDocumentSetModal
                showModal={{
                    showSinglePrintModal,
                    setShowSinglePrintModal
                }}
                dataToPrint={{
                    id: idToPrint,
                    date: dateLocal,
                    statusDispatched
                }}
                allDocumentName={defaultLoadDocuments}
                setAllDocumentName={setDefaultLoadDocuments}
                documentReference={referenceToPrint}
                documentAttachmentsData={documentAttachmentsData}
            />
        </>
    );
};

LoadsPage.layout = MainLayout;

export default LoadsPage;
