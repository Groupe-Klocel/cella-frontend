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
import { AppHead, LinkButton, SinglePrintDocumentSetModal } from '@components';
import { getModesFromPermissions, showError, showSuccess } from '@helpers';
import { LoadDetailsExtra } from 'modules/Loads/Elements/LoadDetailsExtra';
import { useRouter } from 'next/router';
import { FC, useEffect, useState } from 'react';
import MainLayout from '../../components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { LoadModelV2 as model } from '@helpers';
import { loadsRoutes as itemRoutes } from 'modules/Loads/Static/LoadsRoutes';
import { Button, Modal, Space } from 'antd';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { ModeEnum } from 'generated/graphql';
import configs from '../../../common/configs.json';
import { useAuth } from 'context/AuthContext';
import 'moment/min/locales';
import moment from 'moment';
import { gql } from 'graphql-request';

type PageComponent = FC & { layout: typeof MainLayout };

const LoadsPage: PageComponent = () => {
    const router = useRouter();
    const { permissions, parameters } = useAppState();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const { id } = router.query;
    const { graphqlRequestClient } = useAuth();
    const [triggerRefresh, setTriggerRefresh] = useState<boolean>(false);
    const [showSinglePrintModal, setShowSinglePrintModal] = useState(false);
    const [idToPrint, setIdToPrint] = useState<string>();
    const [documentAttachmentsData, setDocumentAttachmentsData] = useState<any>();
    const [defaultLoadDocuments, setDefaultLoadDocuments] = useState<any>();

    useEffect(() => {
        const fetchRuleResult = async () => {
            const ruleVariables = {
                context: {
                    object_name: 'load',
                    stock_owner: data?.extras_stockOwnerName ?? undefined,
                    shipping_type: data?.extras_shippingType ?? undefined,
                    carrier: data?.extras_carrierName ?? undefined,
                    delivery_po_type: data?.extras_deliveryType ?? undefined,
                    delivery_customer_code: data?.extras_thirdPartyCode ?? undefined,
                    dangerous: data?.extras_dangereux ?? undefined
                }
            };
            const ruleQuery = gql`
                query executeRule($context: JSON!) {
                    executeRule(ruleName: "DOCUMENT_LIST", context: $context)
                }
            `;
            const ruleResult = await graphqlRequestClient.request(ruleQuery, ruleVariables);
            setDefaultLoadDocuments(ruleResult?.executeRule?.document_list?.value);
        };
        fetchRuleResult();
    }, [data]);

    // #region to customize information
    const breadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.name}`
        }
    ];

    const pageTitle = `${t('common:load')} ${data?.name}`;

    // Detect if extras are displayed
    const isExtrasDisplayed = Object.keys(data || {}).some((key) => key.startsWith('extras_'))
        ? true
        : false;
    // #endregions

    // #region handle standard buttons according to Model (can be customized when additional buttons are needed)
    const rootPath = itemRoutes[itemRoutes.length - 1].path;

    //retrieve client's date for printing
    const local = moment();
    local.locale();
    const dateLocal = local.format('l') + ', ' + local.format('LT');

    // DISPATCH LOAD
    const statusDispatched = configs.DELIVERY_STATUS_DISPATCHED;
    const [isDispatchLoading, setIsDispatchLoading] = useState(false);
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
                setIsDispatchLoading(true);
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
                setIsDispatchLoading(false);
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
    const headerData: HeaderData = {
        title: pageTitle,
        routes: breadCrumb,
        onBackRoute: rootPath,
        actionsComponent: (
            <Space>
                {modes.length > 0 &&
                modes.includes(ModeEnum.Update) &&
                data?.status != configs.LOAD_STATUS_DISPATCHED &&
                model.isEditable ? (
                    <LinkButton
                        title={t('actions:edit')}
                        path={`${rootPath}/edit/${id}`}
                        type="primary"
                    />
                ) : (
                    <></>
                )}
                {modes.length > 0 &&
                modes.includes(ModeEnum.Delete) &&
                data?.status == configs.LOAD_STATUS_CREATED &&
                data?.numberHuLoaded <= 0 &&
                !data.managedByExternalSystem &&
                model.isDeletable ? (
                    <Button onClick={() => confirmAction(data.id, setIdToDelete, 'delete')()}>
                        {t('actions:delete')}
                    </Button>
                ) : (
                    <></>
                )}
                {modes.length > 0 &&
                modes.includes(ModeEnum.Update) &&
                data?.status > configs.LOAD_LINE_STATUS_CREATED &&
                data?.status < configs.LOAD_STATUS_DISPATCHED &&
                data?.numberHuLoaded > 0 &&
                !data.managedByExternalSystem &&
                model.isEditable ? (
                    <Button loading={isDispatchLoading} onClick={() => dispatchLoad(data.id)}>
                        {t('actions:dispatch')}
                    </Button>
                ) : (
                    <></>
                )}
                {/* Print List of boxes and code bar of load */}
                {modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                    <Button
                        onClick={() => {
                            setShowSinglePrintModal(true);
                            setIdToPrint(data.id);
                        }}
                    >
                        {t('actions:print')}
                    </Button>
                ) : (
                    <></>
                )}
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
                    documentReference={data?.name}
                    documentAttachmentsData={documentAttachmentsData}
                />
            </Space>
        )
    };

    return (
        <>
            <AppHead title={headerData.title} />
            <ItemDetailComponent
                extraDataComponent={
                    <LoadDetailsExtra
                        loadId={id!}
                        loadData={data}
                        loadName={data?.name}
                        setDocumentAttachmentsData={setDocumentAttachmentsData}
                        isExtrasDisplayed={isExtrasDisplayed}
                    />
                }
                headerData={headerData}
                id={id!}
                dataModel={model}
                setData={setData}
                triggerDelete={{ idToDelete, setIdToDelete }}
                refetch={triggerRefresh}
            />
        </>
    );
};

LoadsPage.layout = MainLayout;

export default LoadsPage;
