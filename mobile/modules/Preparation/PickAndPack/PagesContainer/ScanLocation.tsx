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
    action1Trigger: { action1Trigger, setAction1Trigger },
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

    const handlingUnitContentArticleId =
        storedObject['step10']?.data?.proposedRoundAdvisedAddresses[0]?.handlingUnitContent?.article
            ?.id;

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
                            level
                            category
                            handlingUnits(
                                advancedFilters: {
                                    filter: {
                                        searchType: SUPERIOR
                                        fieldName: "autocountHandlingUnitContent"
                                        searchedValues: "0"
                                    }
                                }
                            ) {
                                id
                                name
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
        action1Trigger: { action1Trigger, setAction1Trigger },
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
                    action1Trigger={{ action1Trigger, setAction1Trigger }}
                    action1Label={t('actions:next')}
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
