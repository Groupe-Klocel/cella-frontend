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
import { AppHead, LinkButton, SinglePrintModal } from '@components';
import { META_DEFAULTS, getModesFromPermissions, showError } from '@helpers';
import { useRouter } from 'next/router';
import { FC, useState } from 'react';
import MainLayout from '../../components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import useTranslation from 'next-translate/useTranslation';
import { CreditModelV2 as model } from 'models/CreditModelV2';
import { Button, Modal, Space } from 'antd';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { ModeEnum } from 'generated/graphql';
import { creditsRoutes as itemRoutes } from 'modules/Credits/Static/creditsRoutes';
import { CreditDetailsExtra } from 'modules/Credits/Elements/CreditDetailsExtra';
import { CreditPaymentModal } from 'modules/Credits/Modals/CreditPaymentModal';
import configs from '../../../common/configs.json';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';

type PageComponent = FC & { layout: typeof MainLayout };

const CreditPage: PageComponent = () => {
    const router = useRouter();
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const { id } = router.query;
    const [triggerRefresh, setTriggerRefresh] = useState<boolean>(false);
    const [showSinglePrintModal, setShowSinglePrintModal] = useState(false);
    const [idToPrint, setIdToPrint] = useState<string>();
    const [documentToPrint, setDocumentToPrint] = useState<string>();
    const [creditInvoiceAddress, setCreditInvoiceAddress] = useState<any>();
    const { graphqlRequestClient } = useAuth();
    const [showCreditPaymentModal, setShowCreditPaymentModal] = useState(false);
    const [refetchCreditPayment, setRefetchCreditPayment] = useState<boolean>(false);

    // #region to customize information
    const breadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.name}`
        }
    ];

    const pageTitle = `${t('common:credit')} ${data?.name}`;
    // #endregion

    // #region handle standard buttons according to Model (can be customized when additional buttons are needed)
    const rootPath = itemRoutes[itemRoutes.length - 1].path;

    const confirmAction = (
        id: string | undefined,
        setId: any,
        action: 'delete' | 'disable' | 'update'
    ) => {
        const actionTxt =
            action === 'delete' ? t('messages:delete-confirm') : t('messages:close-confirm');
        return () => {
            Modal.confirm({
                title: actionTxt,
                onOk: () => {
                    if (action === 'delete') {
                        setId(id);
                    } else if (action === 'update') {
                        closeStatus(data.id);
                    }
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        };
    };
    const closeStatus = async (id: string) => {
        const newStatus = configs.ORDER_STATUS_CLOSED;
        const updateVariables = {
            id: id,
            input: {
                status: newStatus
            }
        };

        const updateMutationStatus = gql`
            mutation updateOrder($id: String!, $input: UpdateOrderInput!) {
                updateOrder(id: $id, input: $input) {
                    id
                    status
                }
            }
        `;
        const result = await graphqlRequestClient.request(updateMutationStatus, updateVariables);
        if (result) {
            setTriggerRefresh(!triggerRefresh);
        }
        return result;
    };
    const headerData: HeaderData = {
        title: pageTitle,
        routes: breadCrumb,
        onBackRoute: rootPath,
        actionsComponent: (
            <Space>
                {modes.length > 0 &&
                modes.includes(ModeEnum.Update) &&
                model.isEditable &&
                data?.status == configs.ORDER_STATUS_TO_BE_PAID ? (
                    <Button
                        onClick={() => {
                            setShowCreditPaymentModal(true);
                        }}
                        style={{ color: 'orange' }}
                    >
                        {t(`actions:enter-payment`)}
                    </Button>
                ) : (
                    <></>
                )}
                {modes.length > 0 && modes.includes(ModeEnum.Update) && model.isEditable ? (
                    <LinkButton
                        title={t('actions:edit')}
                        path={`${rootPath}/edit/${id}`}
                        type="primary"
                    />
                ) : (
                    <></>
                )}
                {modes.length > 0 &&
                modes.includes(ModeEnum.Read) &&
                data?.status >= configs.ORDER_STATUS_TO_INVOICE ? (
                    <>
                        <Button
                            type="primary"
                            onClick={() => {
                                if (creditInvoiceAddress) {
                                    setShowSinglePrintModal(true);
                                    setIdToPrint(creditInvoiceAddress.id);
                                    setDocumentToPrint('CGP_Credit');
                                } else {
                                    showError(t('messages:no-invoice-address'));
                                }
                            }}
                        >
                            {t('actions:print-credit')}
                        </Button>
                    </>
                ) : (
                    <></>
                )}
                {modes.length > 0 && modes.includes(ModeEnum.Delete) && model.isDeletable ? (
                    <Button onClick={() => confirmAction(data.id, setIdToDelete, 'delete')()}>
                        {t('actions:delete')}
                    </Button>
                ) : (
                    <></>
                )}
                {modes.length > 0 && data?.status !== configs.ORDER_STATUS_CLOSED ? (
                    <Button onClick={() => confirmAction(data.id, setData, 'update')()}>
                        {t('actions:close')}
                    </Button>
                ) : (
                    <></>
                )}
                <SinglePrintModal
                    showModal={{
                        showSinglePrintModal,
                        setShowSinglePrintModal
                    }}
                    dataToPrint={{ id: idToPrint }}
                    documentName={documentToPrint!}
                    documentReference={data?.name}
                    customLanguage={data?.printLanguage ?? undefined}
                />
            </Space>
        )
    };

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <ItemDetailComponent
                extraDataComponent={
                    <CreditDetailsExtra
                        orderId={id}
                        orderName={data?.name}
                        stockOwnerId={data?.stockOwnerId}
                        stockOwnerName={data?.stockOwner_name}
                        thirdPartyId={data?.thirdPartyId}
                        priceType={data?.priceType}
                        status={data?.status}
                        refetchCreditPayment={refetchCreditPayment}
                        setCreditInvoiceAddress={setCreditInvoiceAddress}
                    />
                }
                headerData={headerData}
                id={id!}
                dataModel={model}
                setData={setData}
                triggerDelete={{ idToDelete, setIdToDelete }}
                refetch={triggerRefresh}
            />
            <CreditPaymentModal
                showModal={{
                    showCreditPaymentModal,
                    setShowCreditPaymentModal
                }}
                orderId={id as string}
                setRefetch={setRefetchCreditPayment}
            />
        </>
    );
};

CreditPage.layout = MainLayout;

export default CreditPage;
