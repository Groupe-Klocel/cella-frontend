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
import { ScanForm_reducer } from '@CommonRadio';
import { useEffect, useState } from 'react';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';

export interface IScanArticleEANProps {
    processName: string;
    stepNumber: number;
    label: string;
    buttons: { [label: string]: any };
    forceArticleScan?: boolean;
    checkComponent: any;
    contents?: any;
    triggerAlternativeSubmit1?: any;
    action1Trigger?: any;
}

export const ScanArticleEAN = ({
    processName,
    stepNumber,
    label,
    buttons,
    forceArticleScan,
    checkComponent,
    contents,
    triggerAlternativeSubmit1: { triggerAlternativeSubmit1, setTriggerAlternativeSubmit1 },
    action1Trigger: { action1Trigger, setAction1Trigger }
}: IScanArticleEANProps) => {
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    const [scannedInfo, setScannedInfo] = useState<string>();
    const [resetForm, setResetForm] = useState<boolean>(false);
    const [articleLuBarcodesInfos, setArticleLuBarcodesInfos] = useState<any>();
    const [featureTypeDetailsInfos, setFeatureTypeDetailsInfos] = useState<any>();
    const { graphqlRequestClient } = useAuth();
    const { t } = useTranslation();

    const getFeatureTypeDetails = async (
        featureType: any
    ): Promise<{ [key: string]: any } | undefined> => {
        if (featureType) {
            const query = gql`
                query featureTypeDetails($filters: FeatureTypeDetailSearchFilters) {
                    featureTypeDetails(filters: $filters) {
                        results {
                            id
                            atPreparation
                            featureType
                            featureCodeId
                            featureCode {
                                id
                                name
                                unique
                                dateType
                            }
                        }
                    }
                }
            `;
            const variables = {
                filters: { featureType: featureType }
            };
            const featureTypeDetails = await graphqlRequestClient
                .request(query, variables)
                .then((data: any) => data.featureTypeDetails.results);
            return featureTypeDetails;
        }
    };

    //N.B.: Version1 autorecovers information from previous step as there is only one HUC and no article scan check.
    //Pre-requisite: initialize current step
    useEffect(() => {
        const fetchData = async () => {
            if (contents.length === 1 && !forceArticleScan) {
                // N.B.: in this case previous step is kept at its previous value
                let data: { [label: string]: any } = {};
                data['article'] = contents[0].article;
                data['contents'] = contents;
                const featureTypeDetails: any = await getFeatureTypeDetails(
                    contents[0].article.featureType
                );
                // add feature type details to results
                if (featureTypeDetails?.filter((item: any) => item.atPreparation).length > 0) {
                    data['article']['featureType'] = featureTypeDetails?.filter(
                        (item: any) => item.atPreparation
                    );
                } else {
                    data['article']['featureType'] = [];
                }
                dispatch({
                    type: 'UPDATE_BY_STEP',
                    processName,
                    stepName: `step${stepNumber}`,
                    object: { data }
                });
            }
            // check workflow direction and assign current step accordingly
            else if (storedObject.currentStep < stepNumber) {
                dispatch({
                    type: 'UPDATE_BY_STEP',
                    processName: processName,
                    stepName: `step${stepNumber}`,
                    object: { previousStep: storedObject.currentStep },
                    customFields: [{ key: 'currentStep', value: stepNumber }]
                });
            }
        };

        fetchData();
    }, []);

    const getArticleLuBarcodes = async (
        scannedInfo: any
    ): Promise<{ [key: string]: any } | undefined> => {
        if (scannedInfo) {
            const query = gql`
                query articleLuBarcodes($filters: ArticleLuBarcodeSearchFilters) {
                    articleLuBarcodes(filters: $filters) {
                        count
                        itemsPerPage
                        totalPages
                        results {
                            id
                            articleId
                            article {
                                id
                                name
                                description
                                genericArticleComment
                                baseUnitWeight
                                stockOwnerId
                                stockOwner {
                                    name
                                }
                                newProduct
                                featureType
                            }
                            barcodeId
                            barcode {
                                name
                            }
                            stockOwnerId
                            stockOwner {
                                name
                            }
                            articleLuId
                        }
                    }
                }
            `;

            const variables = {
                filters: { barcode_Name: scannedInfo }
            };
            const ArticleLuBarcodesInfos = await graphqlRequestClient.request(query, variables);
            return ArticleLuBarcodesInfos;
        }
    };

    useEffect(() => {
        async function fetchData() {
            let result = await getArticleLuBarcodes(scannedInfo);
            const featureTypeDetails: any = await getFeatureTypeDetails(
                result?.articleLuBarcodes?.results[0]?.article?.featureType
            );
            // add feature type details to resutls
            result = { ...result, featureTypeDetails };
            if (result) setArticleLuBarcodesInfos(result);
            if (featureTypeDetails?.filter((item: any) => item.atPreparation).length > 0)
                setFeatureTypeDetailsInfos(
                    featureTypeDetails.filter((item: any) => item.atPreparation)
                );
        }
        fetchData();
    }, [scannedInfo]);

    const dataToCheck = {
        processName,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        contents,
        articleLuBarcodesInfos,
        featureTypeDetailsInfos,
        setResetForm,
        triggerAlternativeSubmit1: { triggerAlternativeSubmit1, setTriggerAlternativeSubmit1 },
        action1Trigger: { action1Trigger, setAction1Trigger },
        alternativeSubmitInput: storedObject?.step10?.data?.round.extraText1 ?? undefined
    };

    return (
        <>
            <ScanForm_reducer
                processName={processName}
                stepNumber={stepNumber}
                label={label}
                buttons={{ ...buttons }}
                setScannedInfo={setScannedInfo}
                resetForm={{ resetForm, setResetForm }}
                triggerAlternativeSubmit1={{
                    triggerAlternativeSubmit1,
                    setTriggerAlternativeSubmit1
                }}
                action1Trigger={{ action1Trigger, setAction1Trigger }}
                action1Label={t('actions:next')}
                alternativeSubmitLabel1={t('common:change-location')}
            ></ScanForm_reducer>
            {checkComponent(dataToCheck)}
        </>
    );
};
