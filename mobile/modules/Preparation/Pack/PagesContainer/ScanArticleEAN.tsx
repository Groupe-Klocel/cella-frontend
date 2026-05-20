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

export interface IScanArticleEANProps {
    processName: string;
    stepNumber: number;
    label: string;
    checkComponent: any;
    buttons?: { [label: string]: any };
    forceArticleScan?: boolean;
    proposedHuos?: any;
    formToUse?: any;
}

export const ScanArticleEAN = ({
    processName,
    stepNumber,
    label,
    buttons,
    checkComponent,
    proposedHuos,
    formToUse
}: IScanArticleEANProps) => {
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    const [scannedInfo, setScannedInfo] = useState<string>();
    const [resetForm, setResetForm] = useState<boolean>(false);
    const [articleLuBarcodesInfos, setArticleLuBarcodesInfos] = useState<any>();
    const { graphqlRequestClient } = useAuth();

    //Pre-requisite: initialize current step
    useEffect(() => {
        const fetchData = async () => {
            if (storedObject.currentStep < stepNumber) {
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
                                baseUnitWeight
                                stockOwnerId
                                stockOwner {
                                    name
                                }
                                newProduct
                                featureType
                                genericArticleComment
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
            // add feature type details to results
            if (result) setArticleLuBarcodesInfos(result);
        }
        fetchData();
    }, [scannedInfo]);

    const dataToCheck = {
        processName,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        proposedHuos,
        articleLuBarcodesInfos,
        setResetForm
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
                formToUse={formToUse}
            ></ScanForm_reducer>
            {checkComponent(dataToCheck)}
        </>
    );
};
