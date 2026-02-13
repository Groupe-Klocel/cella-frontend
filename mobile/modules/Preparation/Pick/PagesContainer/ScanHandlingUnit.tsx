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
import { useEffect, useMemo, useState } from 'react';
import { showError } from '@helpers';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useAppDispatch, useAppState } from 'context/AppContext';

export interface IScanHandlingUnitProps {
    processName: string;
    stepNumber: number;
    label: string;
    isANewHUEquipment?: boolean;
    buttons: { [label: string]: any };
    checkComponent: any;
    defaultValue?: any;
}

export const ScanHandlingUnit = ({
    processName,
    stepNumber,
    label,
    isANewHUEquipment,
    buttons,
    checkComponent,
    defaultValue
}: IScanHandlingUnitProps) => {
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    const [scannedInfo, setScannedInfo] = useState<string>();
    const [resetForm, setResetForm] = useState<boolean>(false);
    const [handlingUnitInfos, setHandlingUnitInfos] = useState<any>();
    const { graphqlRequestClient } = useAuth();
    const [uniqueHU, setUniqueHU] = useState<boolean>(false);
    const { t } = useTranslation();

    //Pre-requisite: initialize current step
    useEffect(() => {
        //automatically set handlingUnit when defaultValue is provided
        let objectUpdate: any = {
            type: 'UPDATE_BY_STEP',
            processName: processName,
            stepName: `step${stepNumber}`,
            object: undefined,
            customFields: undefined
        };
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
                objectUpdate.object = {
                    ...storedObject[`step${stepNumber}`],
                    data: {
                        handlingUnit: {
                            ...defaultValue,
                            handlingUnitContents: filteredContents
                        }
                    }
                };
            } else {
                showError(t('messages:wrong-article-stockOwner-stockStatus-or-reservation'));
            }
        } else if (storedObject.currentStep < stepNumber) {
            objectUpdate.object = { previousStep: storedObject.currentStep };
            objectUpdate.customFields = [{ key: 'currentStep', value: stepNumber }];
        }
        dispatch(objectUpdate);
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
                            handlingUnitOutbounds {
                                roundId
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
                                    genericArticleComment
                                }
                                articleLuBarcode {
                                    id
                                    articleId
                                    article {
                                        name
                                        description
                                        baseUnitWeight
                                        featureType
                                        genericArticleComment
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
                filters: {
                    barcode: [`${scannedInfo}`],
                    locationId: chosenLocation?.id
                }
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
        processName,
        stepNumber,
        isANewHUEquipment,
        scannedInfo: { scannedInfo, setScannedInfo },
        handlingUnitInfos,
        uniqueHU,
        setResetForm
    };

    return (
        <>
            <>
                <ScanForm_reducer
                    processName={processName}
                    stepNumber={stepNumber}
                    label={label}
                    buttons={{ ...buttons }}
                    setScannedInfo={setScannedInfo}
                    resetForm={{ resetForm, setResetForm }}
                ></ScanForm_reducer>
                {checkComponent(dataToCheck)}
            </>
        </>
    );
};
