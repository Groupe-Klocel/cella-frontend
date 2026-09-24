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

export interface IScanBoxProps {
    processName: string;
    stepNumber: number;
    label: string;
    checkComponent: any;
    buttons?: { [label: string]: any };
    formToUse?: any;
}

export const ScanBox = ({
    processName,
    stepNumber,
    label,
    buttons,
    checkComponent,
    formToUse
}: IScanBoxProps) => {
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    const [scannedInfo, setScannedInfo] = useState<string>();
    const [resetForm, setResetForm] = useState<boolean>(false);
    const [handlingUnitOutboundInfos, setHandlingUnitOutboundInfos] = useState<any>();
    const { graphqlRequestClient } = useAuth();

    //Pre-requisite: initialize current step
    useEffect(() => {
        if (storedObject.currentStep < stepNumber) {
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: `step${stepNumber}`,
                object: { previousStep: storedObject.currentStep },
                customFields: [{ key: 'currentStep', value: stepNumber }]
            });
        }
    }, []);

    const getHUO = async (scannedInfo: any): Promise<{ [key: string]: any } | undefined> => {
        if (scannedInfo) {
            const query = gql`
                query handlingUnitOutbounds(
                    $advancedFilters: [HandlingUnitOutboundAdvancedSearchFilters!]
                ) {
                    handlingUnitOutbounds(advancedFilters: $advancedFilters) {
                        count
                        itemsPerPage
                        totalPages
                        results {
                            id
                            name
                            status
                            statusText
                            preparationMode
                            preparationModeText
                            theoriticalWeight
                            carrierBox
                            carrierShippingModeId
                            carrierShippingMode {
                                id
                                shippingMode
                                toBePalletized
                                carrier {
                                    id
                                    name
                                }
                            }
                            deliveryId
                            delivery {
                                id
                                name
                            }
                            handlingUnitModelId
                            handlingUnitModel {
                                id
                                name
                                weight
                                closureWeight
                            }
                            roundId
                            round {
                                id
                                name
                            }
                            handlingUnitId
                            handlingUnit {
                                id
                                name
                                barcode
                                type
                                typeText
                                status
                                statusText
                                stockOwnerId
                                stockOwner {
                                    name
                                }
                                warehouseCode
                                parentHandlingUnitId
                            }
                            handlingUnitContentOutbounds {
                                id
                                lineNumber
                                status
                                statusText
                                pickedQuantity
                                quantityToBePicked
                                missingQuantity
                                handlingUnitContentId
                                handlingUnitContent {
                                    id
                                    quantity
                                    articleId
                                    article {
                                        id
                                        name
                                        description
                                        baseUnitWeight
                                        genericArticleComment
                                        stockOwnerId
                                        stockOwner {
                                            name
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            `;

            const variables = {
                advancedFilters: {
                    filter: [
                        { searchType: 'EQUAL', field: { name: scannedInfo } },
                        { searchType: 'EQUAL', field: { handlingUnit_Barcode: scannedInfo } },
                        { searchType: 'EQUAL', field: { carrierBox: scannedInfo } }
                    ]
                }
            };
            const handlingUnitOutboundInfos = await graphqlRequestClient.request(query, variables);
            return handlingUnitOutboundInfos;
        }
    };

    useEffect(() => {
        if (scannedInfo) {
            const fetchData = async () => {
                const result = await getHUO(scannedInfo);
                if (result) setHandlingUnitOutboundInfos(result);
            };
            fetchData();
        }
    }, [scannedInfo]);

    const dataToCheck = {
        processName,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        handlingUnitOutboundInfos,
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
