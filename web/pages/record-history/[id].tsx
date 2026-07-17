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
import { AppHead, LinkButton } from '@components';
import { RecordHistoryModelV2 as model } from '@helpers';
import {
    HeaderData,
    ItemDetailComponent
} from 'modules/RecordHistory/Elements/RecordHistoryDetailComponent';
import { useRouter } from 'next/router';
import { FC, useState } from 'react';
import MainLayout from '../../components/layouts/MainLayout';
import { getModesFromPermissions, showError, showSuccess } from '@helpers';
import { useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { recordHistoryRoutes as itemRoutes } from 'modules/RecordHistory/Static/recordHistoryRoutes';
import { Button, Modal, Space } from 'antd';
import { gql } from 'graphql-request';
import { ModeEnum } from 'generated/graphql';
import { RecordHistoryDetailsExtra } from 'modules/RecordHistory/Elements/RecordHistoryDetailsExtra';

type PageComponent = FC & { layout: typeof MainLayout };

const RecordHistoryPage: PageComponent = () => {
    const router = useRouter();
    const { permissions } = useAppState();
    const { graphqlRequestClient } = useAuth();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const { id } = router.query;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [rollbackLoading, setRollbackLoading] = useState<boolean>(false);

    // #region to customize information
    const breadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.sequenceId}`
        }
    ];

    const pageTitle = `${t('common:record-history')} ${data?.sequenceId}`;
    // #endregions

    // #region handle standard buttons according to Model (can be customized when additional buttons are needed)
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;

    const confirmAction = (id: string | undefined, setId: any) => {
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

    // Rollback the whole transaction the current record belongs to (revert every record history
    // sharing this transactionId). Only offered to users with modify rights on record-history.
    const rollbackTransaction = async () => {
        const transactionId = data?.transactionId;
        if (!transactionId) {
            showError(t('messages:error-getting-data'));
            return;
        }
        setRollbackLoading(true);
        try {
            // Count how many record histories belong to this transaction, to warn the user.
            const countQuery = gql`
                query countRecordHistories($filters: RecordHistorySearchFilters) {
                    recordHistories(filters: $filters, itemsPerPage: 1, page: 1) {
                        count
                    }
                }
            `;
            const countRes: any = await graphqlRequestClient.request(countQuery, {
                filters: { transactionId }
            });
            const number = countRes?.recordHistories?.count ?? 0;

            // Always surface the impacted count. The translated message carries a {{number}}
            // placeholder; if that DB translation isn't present yet the fallback returns the raw
            // key (no number), so we append the count explicitly to keep the warning meaningful.
            const confirmMessage = t('messages:rollback-confirm', { number });
            const confirmTitle = confirmMessage.includes(String(number))
                ? confirmMessage
                : `${confirmMessage} (${number})`;

            Modal.confirm({
                title: confirmTitle,
                okText: t('messages:confirm'),
                okButtonProps: { danger: true },
                cancelText: t('messages:cancel'),
                onOk: async () => {
                    const rollbackMutation = gql`
                        mutation rollbackTransaction($transactionId: String!) {
                            rollbackTransaction(transactionId: $transactionId)
                        }
                    `;
                    // The mutation runs here, after the outer try/catch has already returned, so it
                    // needs its own error handling. On any failure — a rejected request (network/
                    // GraphQL) or a falsy result (business-rule refusal) — surface the error and
                    // rethrow so antd keeps the confirm dialog open for a retry. Only a successful
                    // rollback resolves onOk (which closes the dialog) and navigates away.
                    let res: any;
                    try {
                        // The stored transactionId is bare; the mutation expects the "tid_" prefix.
                        res = await graphqlRequestClient.request(rollbackMutation, {
                            transactionId: `tid_${transactionId}`
                        });
                    } catch (error) {
                        showError(t('messages:error-rollback'));
                        console.log('rollbackTransactionError', error);
                        throw error;
                    }
                    if (res?.rollbackTransaction) {
                        showSuccess(t('messages:success-rollback'));
                        router.push(rootPath);
                    } else {
                        showError(t('messages:error-rollback'));
                        throw new Error('rollbackTransaction returned a falsy result');
                    }
                }
            });
        } catch (error) {
            showError(t('messages:error-rollback'));
            console.log('rollbackTransactionError', error);
        } finally {
            setRollbackLoading(false);
        }
    };

    const headerData: HeaderData = {
        title: pageTitle,
        routes: breadCrumb,
        onBackRoute: rootPath,
        actionsComponent: (
            <Space>
                {modes.length > 0 && modes.includes(ModeEnum.Update) && data?.transactionId ? (
                    <Button
                        type="primary"
                        danger
                        onClick={rollbackTransaction}
                        loading={rollbackLoading}
                    >
                        {t('actions:rollback')}
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
                {modes.length > 0 && modes.includes(ModeEnum.Delete) && model.isSoftDeletable ? (
                    <Button
                        onClick={() => confirmAction(id as string, setIdToDisable)()}
                        type="primary"
                    >
                        {t('actions:disable')}
                    </Button>
                ) : (
                    <></>
                )}
                {modes.length > 0 && modes.includes(ModeEnum.Delete) && model.isDeletable ? (
                    <Button onClick={() => confirmAction(id as string, setIdToDelete)()}>
                        {t('actions:delete')}
                    </Button>
                ) : (
                    <></>
                )}
            </Space>
        )
    };
    // #endregion

    return (
        <>
            <AppHead title={headerData.title} />
            <ItemDetailComponent
                id={id!}
                headerData={headerData}
                dataModel={model}
                extraDataComponent={<RecordHistoryDetailsExtra sequenceId={id} />}
                setData={setData}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
            />
        </>
    );
};

RecordHistoryPage.layout = MainLayout;

export default RecordHistoryPage;
