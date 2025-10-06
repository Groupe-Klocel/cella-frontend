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
import { WrapperForm, ContentSpin } from '@components';
import { showError, LsIsSecured } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useState } from 'react';
import configs from '../../../../../common/configs.json';
import { Modal } from 'antd';
import { useListParametersForAScopeQuery } from 'generated/graphql';
import graphqlRequestClient from 'graphql/graphqlRequestClient';
import { useRouter } from 'next/router';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { gql } from 'graphql-request';

//TO BE REWORKED

export interface IGoodsInOrPoChecksProps {
    dataToCheck: any;
}

export const GoodsInOrPoChecks = ({ dataToCheck }: IGoodsInOrPoChecksProps) => {
    const { t } = useTranslation();
    // const storage = LsIsSecured();
    const state = useAppState();
    const dispatch = useAppDispatch();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const router = useRouter();
    const { locale } = router;

    const {
        processName,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        setResetForm,
        receptionType
    } = dataToCheck;

    const storedObject = state[processName] || {};
    // const storedObject = JSON.parse(storage.get(processName) || '{}');

    const stockStatusList = useListParametersForAScopeQuery(graphqlRequestClient, {
        scope: 'stock_statuses',
        language: locale === 'en-US' ? 'en' : locale
    });

    //ScanGoodsInPO-2: launch query for barcodes handling
    const [fetchResult, setFetchResult] = useState<any>();

    async function scanGoodsInOrPo(scannedItem: any) {
        const query = gql`
            mutation executeFunction($functionName: String!, $event: JSON!) {
                executeFunction(functionName: $functionName, event: $event) {
                    status
                    output
                }
            }
        `;

        const variables = {
            functionName: 'RF_scan_goods_in_or_po',
            event: {
                input: { scannedItem, receptionType }
            }
        };

        try {
            const result = await graphqlRequestClient.request(query, variables);
            return result;
        } catch (error) {
            showError(t('messages:error-executing-function'));
            console.log('executeFunctionError', error);
        }
    }

    useEffect(() => {
        if (scannedInfo) {
            setIsLoading(true);
            const fetchData = async () => {
                const response: any = await scanGoodsInOrPo(scannedInfo);
                setFetchResult(response.executeFunction.output.response);
                if (response.executeFunction.status === 'ERROR') {
                    showError(response.executeFunction.output);
                } else if (
                    response.executeFunction.status === 'OK' &&
                    response.executeFunction.output.status === 'KO'
                ) {
                    if (response.executeFunction.output.output.code === 'FAPI_000001') {
                        showError(t('errors:FAPI_000001'));
                    } else if (response.executeFunction.output.output.code === 'FAPI_000002') {
                        showError(t('errors:FAPI_000002'));
                    } else {
                        showError(t(`errors:${response.executeFunction.output.output.code}`));
                        console.log('Backend_message', response.executeFunction.output.output);
                    }
                    setResetForm(true);
                    setIsLoading(false);
                    setScannedInfo(undefined);
                }
            };
            fetchData();
        }
    }, [scannedInfo]);

    //ScanGoodsInPO-3: handle result to store it or pass through modal
    useEffect(() => {
        const handleFetchResult = (fetchResult: any) => {
            setIsLoading(false);
            let data = { ...fetchResult };
            data.purchaseOrder.purchaseOrderLines =
                fetchResult.purchaseOrder.purchaseOrderLines.map((line: any) => {
                    return {
                        ...line,
                        blockingStatusText:
                            stockStatusList?.data?.listParametersForAScope?.find(
                                (item) => parseInt(item.code) === line.blockingStatus
                            )?.text || ''
                    };
                });
            // storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: `step${stepNumber}`,
                object: { ...storedObject[`step${stepNumber}`], data },
                customFields: [{ key: 'currentStep', value: stepNumber }]
            });
            // storage.set(processName, JSON.stringify(storedObject));
        };
        if (fetchResult) {
            setIsLoading(false);
            if (fetchResult.goodsIns === 'to-be-created') {
                Modal.confirm({
                    title: (
                        <span style={{ fontSize: '14px' }}>
                            {t('messages:goodsin-creation-confirm')}
                        </span>
                    ),
                    onOk: () => {
                        handleFetchResult(fetchResult);
                    },
                    onCancel: () => {
                        setResetForm(true);
                        setScannedInfo(undefined);
                    },
                    okText: t('messages:confirm'),
                    cancelText: t('messages:cancel'),
                    bodyStyle: { fontSize: '2px' }
                });
            } else {
                handleFetchResult(fetchResult);
            }
        }
    }, [fetchResult]);

    return <WrapperForm>{scannedInfo ? <ContentSpin /> : <></>}</WrapperForm>;
};
