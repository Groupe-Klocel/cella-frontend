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
import { useBoxes, useLocationIds } from '@helpers';
import { LsIsSecured } from '@helpers';
import { useRouter } from 'next/router';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { useTranslationWithFallback as useTranslation } from '@helpers';

export interface IScanLocationProps {
    process: string;
    stepNumber: number;
    label: string;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    showEmptyLocations?: any;
    showSimilarLocations?: any;
    checkComponent: any;
    headerContent?: any;
    triggerAlternativeSubmit1?: any;
    action1Trigger?: any;
}

export const ScanLocation = ({
    process,
    stepNumber,
    label,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    showEmptyLocations,
    showSimilarLocations,
    triggerAlternativeSubmit1: { triggerAlternativeSubmit1, setTriggerAlternativeSubmit1 },
    checkComponent,
    headerContent
}: IScanLocationProps) => {
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');
    const [scannedInfo, setScannedInfo] = useState<string>();
    const [resetForm, setResetForm] = useState<boolean>(false);
    const router = useRouter();
    const [locationInfos, setLocationInfos] = useState<any>();
    const { graphqlRequestClient } = useAuth();
    const { t } = useTranslation();

    //Pre-requisite: initialize current step
    useEffect(() => {
        //check workflow direction and assign current step accordingly
        if (storedObject.currentStep < stepNumber) {
            storedObject[`step${stepNumber}`] = {
                previousStep: storedObject.currentStep
            };
            storedObject.currentStep = stepNumber;
        }
        storage.set(process, JSON.stringify(storedObject));
    }, []);

    // ScanLocation-2: launch query
    // const locationInfos = useLocationIds(
    //     { barcode: `${scannedInfo}` },
    //     1,
    //     100,
    //     null,
    //     router.locale
    // );

    const getLocations = async (scannedInfo: any): Promise<{ [key: string]: any } | undefined> => {
        if (scannedInfo) {
            const query = gql`
                query GetLocationIds($filters: LocationSearchFilters) {
                    locations(filters: $filters) {
                        count
                        itemsPerPage
                        totalPages
                        results {
                            id
                            name
                            barcode
                            aisle
                            column
                            level
                            position
                            replenish
                            blockId
                            block {
                                name
                            }
                            replenishType
                            constraint
                            comment
                            baseUnitRotation
                            allowCycleCountStockMin
                            category
                            categoryText
                            stockStatus
                            stockStatusText
                            status
                            statusText
                            handlingUnits {
                                id
                                name
                                type
                                typeText
                                barcode
                                category
                                categoryText
                                code
                                parentHandlingUnitId
                                parentHandlingUnit {
                                    id
                                    name
                                    type
                                    typeText
                                }
                                childrenHandlingUnits {
                                    id
                                    name
                                    type
                                    typeText
                                    barcode
                                    category
                                    categoryText
                                    code
                                    handlingUnitContents {
                                        id
                                        quantity
                                        reservation
                                        stockStatus
                                        stockStatusText
                                        stockOwnerId
                                        handlingUnit {
                                            id
                                            name
                                            locationId
                                            location {
                                                id
                                                name
                                            }
                                        }
                                        stockOwner {
                                            id
                                            name
                                        }
                                        articleId
                                        article {
                                            id
                                            name
                                            stockOwnerId
                                            stockOwner {
                                                name
                                            }
                                            baseUnitWeight
                                            featureType
                                        }
                                        handlingUnitContentFeatures {
                                            id
                                            featureCode {
                                                name
                                                unique
                                            }
                                            featureCodeId
                                            value
                                        }
                                    }
                                }
                                reservation
                                status
                                stockOwnerId
                                stockOwner {
                                    name
                                }
                                locationId
                                location {
                                    name
                                    category
                                    categoryText
                                }
                                handlingUnitContents {
                                    id
                                    quantity
                                    reservation
                                    stockStatus
                                    stockStatusText
                                    stockOwnerId
                                    handlingUnit {
                                        id
                                        name
                                        locationId
                                        location {
                                            id
                                            name
                                        }
                                    }
                                    stockOwner {
                                        id
                                        name
                                    }
                                    articleId
                                    article {
                                        id
                                        name
                                        stockOwnerId
                                        stockOwner {
                                            name
                                        }
                                        baseUnitWeight
                                        featureType
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
                }
            `;

            const variables = {
                filters: { barcode: [`${scannedInfo}`] }
            };
            const locationInfos = await graphqlRequestClient.request(query, variables);

            return locationInfos;
        }
    };

    useEffect(() => {
        async function fetchData() {
            const result = await getLocations(scannedInfo);
            if (result) setLocationInfos(result);
        }
        fetchData();
    }, [scannedInfo]);

    //ScanLocation-3: manage information for persistence storage and front-end errors
    useEffect(() => {
        if (locationInfos?.data) {
            if (locationInfos.data.locations?.count !== 0) {
                showEmptyLocations?.setShowEmptyLocations(false);
                showSimilarLocations?.setShowSimilarLocations(false);
            }
        }
    }, [locationInfos]);

    const dataToCheck = {
        process,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        locationInfos,
        trigger: { triggerRender, setTriggerRender },
        triggerAlternativeSubmit1: { triggerAlternativeSubmit1, setTriggerAlternativeSubmit1 },
        alternativeSubmitInput: storedObject?.step10?.data?.round.extraText1 ?? undefined,
        showSimilarLocations: { showSimilarLocations },
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
                    triggerAlternativeSubmit1={{
                        triggerAlternativeSubmit1,
                        setTriggerAlternativeSubmit1
                    }}
                    buttons={{ ...buttons }}
                    setScannedInfo={setScannedInfo}
                    showEmptyLocations={showEmptyLocations}
                    showSimilarLocations={showSimilarLocations}
                    resetForm={{ resetForm, setResetForm }}
                    headerContent={headerContent}
                    alternativeSubmitLabel1={t('actions:close-shipping-hu')}
                ></ScanForm>
                {checkComponent(dataToCheck)}
            </>
        </>
    );
};
