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
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import {
    getLastStepWithPreviousStep,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { useAppDispatch, useAppState } from 'context/AppContext';
import {
    getExpectedArticleId,
    pickableQuantityInLocations
} from 'modules/Preparation/PickAndPack/Elements/expectedArticle';

export interface IScanLocationProps {
    processName: string;
    stepNumber: number;
    label: string;
    checkComponent: any;
    buttons?: { [label: string]: any };
    showEmptyLocations?: any;
    showSimilarLocations?: any;
    headerContent?: any;
    enforcedValue?: string;
    forceLocation?: any;
    isHuClosureLoading?: boolean;
    formToUse?: any;
}

export const ScanLocation = ({
    processName,
    stepNumber,
    label,
    buttons,
    showEmptyLocations,
    showSimilarLocations,
    checkComponent,
    headerContent,
    enforcedValue,
    forceLocation: { tmpForceLocation, setTmpforceLocation },
    isHuClosureLoading,
    formToUse
}: IScanLocationProps) => {
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    const [scannedInfo, setScannedInfo] = useState<string>();
    const [resetForm, setResetForm] = useState<boolean>(false);
    const [locationInfos, setLocationInfos] = useState<any>();
    const [locationQuantity, setLocationQuantity] = useState<number>(0);
    const { graphqlRequestClient } = useAuth();
    const { t } = useTranslation();

    //Pre-requisite: initialize current step
    useEffect(() => {
        let objectUpdate: any = {
            type: 'UPDATE_BY_STEP',
            processName,
            stepName: `step${stepNumber}`,
            object: undefined,
            customFields: undefined
        };
        if (enforcedValue) {
            setScannedInfo(enforcedValue);
            // The step is displayed even when the location is enforced, so it has to be the current
            // one: the step-scoped action buttons (Empl., close shipping HU, next) and the back
            // action are filtered on storedObject.currentStep.
            objectUpdate.object = {
                previousStep: getLastStepWithPreviousStep(storedObject, stepNumber)
            };
            objectUpdate.customFields = [{ key: 'currentStep', value: stepNumber }];
        } else if (storedObject.currentStep < stepNumber || tmpForceLocation) {
            //check workflow direction and assign current step accordingly
            // Mounting this step says nothing about the line the operator is now on, so it must
            // not decide for it. Raising tmpForceLocation here latched the location scan on for
            // the rest of the process - looking at neither the advised location nor
            // FORCE_LOCATION_SCAN - and nothing lowered it again, so every later line was asked
            // for a scan it already carried. That is the latch bb4e0c3 removed from the pages;
            // it survived here because this container is the pick & pack's own copy. The verdict
            // now comes only from the page, which re-derives it from the proposed line.
            // Emptying ignoreHUContentIds is dropped with it: the skip list belongs to the
            // "next" walk, which maintains it (and clears it when the list is exhausted), so
            // wiping it on every remount of this step put already-skipped lines back on screen.
            objectUpdate.object = {
                previousStep: getLastStepWithPreviousStep(storedObject, stepNumber)
            };
            objectUpdate.customFields = [{ key: 'currentStep', value: stepNumber }];
        }
        dispatch(objectUpdate);
    }, []);

    // enforcedValue is read when this step mounts, and the "next" button changes the proposed
    // line - hence its advised location - while the step stays mounted. Without this, the value
    // enforced for the new line never reaches the checks and the operator is asked to scan a
    // location he has just been given.
    // An empty enforcedValue is a scan that has to happen - a line without advised location, or
    // FORCE_LOCATION_SCAN / the "Change location" button - so scannedInfo has to be emptied with
    // it. "next" empties it while this step stays mounted (the page raises tmpForceLocation and
    // the render condition does not change, so there is no remount to reset the state), and a
    // scannedInfo left over from the line just quit would be re-checked against the new one:
    // LocationChecks only guards on scannedInfo being set, so a stale location that happens to
    // hold the newly expected article would validate the step and skip the required scan.
    useEffect(() => {
        if (enforcedValue) {
            setScannedInfo(enforcedValue);
        } else {
            setScannedInfo(undefined);
        }
    }, [enforcedValue]);

    const proposedRoundAdvisedAddress =
        storedObject['step10']?.data?.proposedRoundAdvisedAddresses?.[0];

    const locationName = proposedRoundAdvisedAddress?.location?.name;

    // Shared with LocationChecks (step20) and the level/HU checks: one article reference for the
    // whole step, so what the query brings back is exactly what is accepted.
    const expectedArticleId = getExpectedArticleId(proposedRoundAdvisedAddress);

    const getLocations = async (
        scannedInfo: any,
        locationName: any
    ): Promise<{ [key: string]: any } | undefined> => {
        const query = gql`
            query GetLocationIds($advancedFilters: [LocationAdvancedSearchFilters!]) {
                locations(advancedFilters: $advancedFilters) {
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
                                            searchedValues: "${expectedArticleId}"
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
        const searchValue = scannedInfo || locationName;
        if (!searchValue) return;

        const variables = {
            advancedFilters: {
                filter: [
                    { searchType: 'EQUAL', field: { name: `${searchValue}` } },
                    { searchType: 'EQUAL', field: { barcode: `${searchValue}` } }
                ]
            }
        };
        const locationInfos = await graphqlRequestClient.request(query, variables);

        return locationInfos;
    };

    useEffect(() => {
        async function fetchData() {
            const result = await getLocations(scannedInfo, locationName);
            if (result) {
                setLocationInfos(result);
                // Same rule as the checks of steps 20/30 (isContentOfExpectedLine): the quantity
                // shown next to the label is exactly the stock the flow is willing to pick here.
                setLocationQuantity(
                    pickableQuantityInLocations(
                        result.locations?.results,
                        proposedRoundAdvisedAddress
                    )
                );
            }
        }
        fetchData();
    }, [scannedInfo, locationName]);

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
        processName,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        locationInfos,
        showSimilarLocations: { showSimilarLocations },
        setResetForm,
        isHuClosureLoading
    };

    // The received label puts the advised location in parentheses ("Location (A1-2-3)"), and the
    // counted quantity is appended inside them. When the advised address carries no location the
    // label is a bare word ("Location"): there is no parenthesis to reopen, so the quantity opens
    // its own instead of leaving a closing one orphaned ("Location / Qty: 0)").
    const quantityInfo = t('common:quantity_abbr') + ': ' + locationQuantity;
    const newLabel = label.includes(')')
        ? label.split(')')[0] + ' / ' + quantityInfo + ')'
        : label + ' (' + quantityInfo + ')';

    return (
        <>
            <ScanForm_reducer
                processName={processName}
                stepNumber={stepNumber}
                label={newLabel}
                buttons={{ ...buttons }}
                setScannedInfo={setScannedInfo}
                showEmptyLocations={showEmptyLocations}
                showSimilarLocations={showSimilarLocations}
                resetForm={{ resetForm, setResetForm }}
                headerContent={headerContent}
                formToUse={formToUse}
            ></ScanForm_reducer>
            {checkComponent(dataToCheck)}
        </>
    );
};
