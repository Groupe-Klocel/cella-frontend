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
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { useTranslationWithFallback as useTranslation } from '@helpers';

export interface IScanHandlingUnitProps {
    process: string;
    stepNumber: number;
    label: string;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    checkComponent: any;
    defaultValue?: any;
}

export const ScanHandlingUnit = ({
    process,
    stepNumber,
    label,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    checkComponent,
    defaultValue
}: IScanHandlingUnitProps) => {
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');
    const [scannedInfo, setScannedInfo] = useState<string>();
    const [resetForm, setResetForm] = useState<boolean>(false);
    const [handlingUnitInfos, setHandlingUnitInfos] = useState<any>();
    const { graphqlRequestClient } = useAuth();
    const [uniqueHU, setUniqueHU] = useState<boolean>(false);
    const { t } = useTranslation();

    //Pre-requisite: initialize current step
    useEffect(() => {
        //automatically set handlingUnit when defaultValue is provided
        if (defaultValue) {
            // N.B.: in this case previous step is kept at its previous value
            const deliveryLine =
                storedObject['step10'].data.proposedRoundAdvisedAddresses[0].roundLineDetail
                    .deliveryLine;
            const filtersForContent = (content: any) =>
                content.articleId === deliveryLine.articleId &&
                content.stockOwnerId === deliveryLine.stockOwnerId &&
                content.stockStatus === deliveryLine.stockStatus &&
                content.reservation === deliveryLine.reservation &&
                content.quantity > 0;
            if (defaultValue.handlingUnitContents.some(filtersForContent)) {
                const filteredContents =
                    defaultValue.handlingUnitContents.filter(filtersForContent);
                const data: { [label: string]: any } = {};
                data['handlingUnit'] = {
                    ...defaultValue,
                    handlingUnitContents: filteredContents
                };
                storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
                setTriggerRender(!triggerRender);
            } else {
                showError(t('messages:wrong-article-stockOwner-stockStatus-or-reservation'));
            }
        } else if (storedObject.currentStep < stepNumber) {
            //check workflow direction and assign current step accordingly
            storedObject[`step${stepNumber}`] = { previousStep: storedObject.currentStep };
            storedObject.currentStep = stepNumber;
        }
        storage.set(process, JSON.stringify(storedObject));
    }, []);

    const chosenLocation = storedObject[`step25`]?.data?.chosenLocation;

    const handlingUnitContentArticleId =
        storedObject['step10']?.data?.proposedRoundAdvisedAddresses[0]?.handlingUnitContent?.article
            ?.id;

    //handle when only one HU on location
    useEffect(() => {
        if (chosenLocation?.handlingUnits?.length === 1) {
            setScannedInfo(chosenLocation.handlingUnits[0].barcode);
            setUniqueHU(true);
        }
    }, [chosenLocation]);

    // ScanHandlingUnit-2: launch query
    const getHU = async (scannedInfo: any): Promise<{ [key: string]: any } | undefined> => {
        if (scannedInfo) {
            const query = gql`
                query handlingUnits($filters: HandlingUnitSearchFilters) {
                    handlingUnits(filters: $filters) {
                        count
                        itemsPerPage
                        totalPages
                        results {
                            id
                            name
                            barcode
                            category
                            code
                            reservation
                            status
                            locationId
                            location {
                                name
                            }
                            handlingUnitContents(
                                    advancedFilters: {
                                        filter: [
                                            {
                                                searchType: EQUAL
                                                fieldName: "articleId"
                                                searchedValues: "${handlingUnitContentArticleId}"
                                            }
                                        ]
                                    }
                                ) {
                                id
                                quantity
                                reservation
                                stockStatus
                                stockStatusText
                                stockOwnerId
                                stockOwner {
                                    name
                                }
                                articleId
                                article {
                                    id
                                    name
                                    description
                                    baseUnitWeight
                                    featureType
                                }
                                articleLuBarcode {
                                    id
                                    articleId
                                    article {
                                        name
                                        description
                                        baseUnitWeight
                                        featureType
                                    }
                                    barcodeId
                                    barcode {
                                        name
                                    }
                                    articleLuId
                                }
                                handlingUnitContentFeatures {
                                    id
                                    featureCodeId
                                    featureCode {
                                        id
                                        name
                                        unique
                                        dateType
                                    }
                                    value
                                }
                            }
                        }
                    }
                }
            `;

            const variables = {
                filters: { barcode: [`${scannedInfo}`], locationId: chosenLocation?.id }
            };
            const handlingUnitInfos = await graphqlRequestClient.request(query, variables);
            return handlingUnitInfos;
        }
    };

    useEffect(() => {
        async function fetchData() {
            const result = await getHU(scannedInfo);
            if (result) setHandlingUnitInfos(result);
        }
        fetchData();
    }, [scannedInfo]);

    const dataToCheck = {
        process,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        handlingUnitInfos,
        uniqueHU,
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
