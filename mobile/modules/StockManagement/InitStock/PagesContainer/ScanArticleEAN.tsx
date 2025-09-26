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
import { ScanForm } from '@CommonRadio';
import { useEffect, useState } from 'react';
import { LsIsSecured, showError } from '@helpers';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';

export interface IScanArticleEANProps {
    process: string;
    stepNumber: number;
    label: string;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    checkComponent: any;
    contents?: any;
    triggerAlternativeSubmit1?: any;
}

export const ScanArticleEAN = ({
    process,
    stepNumber,
    label,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    checkComponent,
    triggerAlternativeSubmit1: { triggerAlternativeSubmit1, setTriggerAlternativeSubmit1 }
}: IScanArticleEANProps) => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');
    const [scannedInfo, setScannedInfo] = useState<string>();
    const [resetForm, setResetForm] = useState<boolean>(false);
    const [articleLuBarcodesInfos, setArticleLuBarcodesInfos] = useState<any>();
    const { graphqlRequestClient } = useAuth();

    //N.B.: Version1 autorecovers information from previous step as there is only one HUC and no article scan check.
    //Pre-requisite: initialize current step
    useEffect(() => {
        if (storedObject.currentStep < stepNumber) {
            //check workflow direction and assign current step accordingly
            storedObject[`step${stepNumber}`] = { previousStep: storedObject.currentStep };
            storedObject.currentStep = stepNumber;
        }
        storage.set(process, JSON.stringify(storedObject));
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

            result = { ...result };
            if (result) setArticleLuBarcodesInfos(result);
        }
        fetchData();
    }, [scannedInfo]);

    const dataToCheck = {
        process,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        articleLuBarcodesInfos,
        trigger: { triggerRender, setTriggerRender },
        setResetForm
    };

    return (
        <>
            <>
                <ScanForm
                    process={process}
                    stepNumber={stepNumber}
                    style={{
                        display: triggerAlternativeSubmit1 ? 'none' : 'block'
                    }}
                    label={label}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ ...buttons }}
                    setScannedInfo={setScannedInfo}
                    resetForm={{ resetForm, setResetForm }}
                    triggerAlternativeSubmit1={{
                        triggerAlternativeSubmit1,
                        setTriggerAlternativeSubmit1
                    }}
                    alternativeSubmitLabel1={t('common:comment')}
                ></ScanForm>
                {checkComponent(dataToCheck)}
            </>
        </>
    );
};
