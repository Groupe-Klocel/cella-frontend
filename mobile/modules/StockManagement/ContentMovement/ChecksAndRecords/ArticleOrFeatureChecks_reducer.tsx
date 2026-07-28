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
import { showError } from '@helpers';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { useEffect, useState } from 'react';

export interface IArticleOrFeatureChecksReducerProps {
    dataToCheck: any;
}

export const ArticleOrFeatureChecks_reducer = ({
    dataToCheck
}: IArticleOrFeatureChecksReducerProps) => {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const { graphqlRequestClient } = useAuth();
    const state = useAppState();
    const dispatch = useAppDispatch();

    const {
        processName,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        setResetForm
    } = dataToCheck;

    const storedObject = state[processName] || {};

    // TYPED SAFE ALL
    //ScanArticleOrFeature-2: call and process backend function response
    const [fetchResult, setFetchResult] = useState<any>();

    async function scanArticleOrFeatures(scannedItem: any) {
        const query = gql`
            mutation executeFunction($functionName: String!, $event: JSON!) {
                executeFunction(functionName: $functionName, event: $event) {
                    status
                    output
                }
            }
        `;

        const variables = {
            functionName: 'K_RF_scanArticleOrFeature',
            event: {
                input: { scannedItem }
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
                const response = await scanArticleOrFeatures(scannedInfo);
                // scanArticleOrFeatures returns undefined when the request throws (error already shown)
                const executeFunction = response?.executeFunction;
                if (!executeFunction) {
                    setResetForm(true);
                    setIsLoading(false);
                    setScannedInfo(undefined);
                    return;
                }
                if (executeFunction.status === 'ERROR') {
                    showError(executeFunction.output);
                    setResetForm(true);
                    setIsLoading(false);
                    setScannedInfo(undefined);
                } else if (
                    executeFunction.status === 'OK' &&
                    executeFunction.output?.status === 'KO'
                ) {
                    showError(t(`errors:${executeFunction.output?.output?.code}`));
                    console.log('Backend_message', executeFunction.output?.output);
                    setResetForm(true);
                    setIsLoading(false);
                    setScannedInfo(undefined);
                } else {
                    // success path only: output.response is meaningful here
                    setFetchResult(executeFunction.output?.response);
                }
            };
            fetchData();
        }
    }, [scannedInfo]);

    //ScanArticleOrFeature-3: manage information for persistence storage and front-end errors
    useEffect(() => {
        if (scannedInfo && fetchResult) {
            let found = false;
            const data: { [label: string]: any } = {};
            const handlingUnitContents =
                storedObject['step20'].data.handlingUnit.handlingUnitContents;
            if (fetchResult.resType === 'serialNumber') {
                for (let i = 0; i < handlingUnitContents.length; i++) {
                    if (
                        handlingUnitContents[i].articleId === fetchResult.article.articleId &&
                        handlingUnitContents[i].id ===
                            fetchResult.handlingUnitContentFeature.handlingUnitContentId
                    ) {
                        found = true;
                        break;
                    }
                }
                if (found) {
                    data['resType'] = fetchResult.resType;
                    data['articleLuBarcodes'] = [fetchResult.article];
                    data['feature'] = fetchResult.handlingUnitContentFeature;
                }
            } else {
                for (let i = 0; i < handlingUnitContents.length; i++) {
                    for (let j = 0; j < fetchResult.articleLuBarcodes.length; j++) {
                        if (
                            handlingUnitContents[i].articleId ===
                            fetchResult.articleLuBarcodes[j].articleId
                        ) {
                            found = true;
                            break;
                        }
                    }
                    if (found) {
                        break;
                    }
                }
                if (found) {
                    data['resType'] = fetchResult.resType;
                    data['articleLuBarcodes'] = fetchResult.articleLuBarcodes;
                }
            }
            if (!found) {
                showError(t('messages:no-article-in-hu'));
                setResetForm(true);
                setScannedInfo(undefined);
                setIsLoading(false);
                return;
            }
            if (storedObject[`step${stepNumber}`] && Object.keys(data).length != 0) {
                dispatch({
                    type: 'UPDATE_BY_STEP',
                    processName,
                    stepName: `step${stepNumber}`,
                    object: {
                        ...storedObject[`step${stepNumber}`],
                        data
                    },
                    customFields: [{ key: 'currentStep', value: stepNumber }]
                });
            }
        }
    }, [fetchResult]);

    return <WrapperForm>{isLoading ? <ContentSpin /> : <></>}</WrapperForm>;
};
