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
import { LsIsSecured } from '@helpers';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';

export interface IScanArticleEANProps {
    process: string;
    stepNumber: number;
    label: string;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    checkComponent: any;
    contents?: any;
}

export const ScanArticleEAN = ({
    process,
    stepNumber,
    label,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    checkComponent,
    contents
}: IScanArticleEANProps) => {
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');
    const [scannedInfo, setScannedInfo] = useState<string>();
    const [resetForm, setResetForm] = useState<boolean>(false);
    const [articleLuBarcodesInfos, setArticleLuBarcodesInfos] = useState<any>();
    const [featureTypeDetailsInfos, setFeatureTypeDetailsInfos] = useState<any>();
    const { graphqlRequestClient } = useAuth();

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
            if (contents.length === 1) {
                // N.B.: in this case previous step is kept at its previous value
                let data: { [label: string]: any } = {};
                data['article'] = contents[0].article;
                data['contents'] = contents;
                const featureTypeDetails: any = await getFeatureTypeDetails(
                    contents[0].article.featureType
                );
                // add feature type details to results
                if (featureTypeDetails?.filter((item: any) => item.atPreparation).length > 0) {
                    data['article']['featureType'] = featureTypeDetailsInfos;
                } else {
                    data['article']['featureType'] = [];
                }
                storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
                setTriggerRender(!triggerRender);
            }
            // check workflow direction and assign current step accordingly
            else if (storedObject.currentStep < stepNumber) {
                storedObject[`step${stepNumber}`] = {
                    previousStep: storedObject.currentStep
                };
                storedObject.currentStep = stepNumber;
            }
            storage.set(process, JSON.stringify(storedObject));
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
        process,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        contents,
        articleLuBarcodesInfos,
        featureTypeDetailsInfos,
        trigger: { triggerRender, setTriggerRender },
        setResetForm
    };

    return (
        <>
            <>
                <ScanForm
                    process={process}
                    stepNumber={stepNumber}
                    label={label}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ ...buttons }}
                    setScannedInfo={setScannedInfo}
                    resetForm={{ resetForm, setResetForm }}
                ></ScanForm>
                {checkComponent(dataToCheck)}
            </>
        </>
    );
};
