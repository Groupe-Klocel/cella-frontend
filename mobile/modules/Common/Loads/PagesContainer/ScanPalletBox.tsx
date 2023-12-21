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
import { useHandlingUnitOutbounds } from '@helpers';
import { LsIsSecured } from '@helpers';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';

export interface IScanPalletBoxProps {
    process: string;
    stepNumber: number;
    label: string;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    checkComponent: any;
}

export const ScanPalletBox = ({
    process,
    stepNumber,
    label,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    checkComponent
}: IScanPalletBoxProps) => {
    const { graphqlRequestClient } = useAuth();
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');
    const [scannedInfo, setScannedInfo] = useState<string>();
    const [handlingUnitOutboundInfos, setHandlingUnitOutboundInfos] = useState<any>();
    const [resetForm, setResetForm] = useState<boolean>(false);

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

    // ScanPalletBox-2: launch query
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
                            carrier {
                                id
                                name
                            }
                            carrierShippingModeId
                            carrierShippingMode {
                                id
                                toBePalletized
                            }
                            deliveryId
                            delivery {
                                id
                                name
                                carrierShippingMode {
                                    carrierId
                                    carrier {
                                        id
                                        name
                                    }
                                }
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
                            loadId
                            load {
                                id
                                name
                            }
                            handlingUnitId
                            handlingUnit {
                                id
                                name
                                type
                                typeText
                                stockOwnerId
                                stockOwner {
                                    name
                                }
                                status
                                statusText
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
                                pickingLocationId
                                pickingLocation {
                                    id
                                    name
                                }
                                handlingUnitContentId
                                handlingUnitContent {
                                    id
                                    articleId
                                    article {
                                        id
                                        name
                                        description
                                        stockOwnerId
                                        stockOwner {
                                            name
                                        }
                                        baseUnitWeight
                                    }
                                }
                            }
                            createdBy
                            created
                            modifiedBy
                            modified
                            extras
                        }
                    }
                }
            `;

            const variables = {
                advancedFilters: {
                    filter: [
                        { searchType: 'EQUAL', field: { name: scannedInfo } },
                        { searchType: 'EQUAL', field: { carrierBox: scannedInfo } }
                    ]
                }
            };
            const handlingUnitOutboundInfos = await graphqlRequestClient.request(query, variables);
            return handlingUnitOutboundInfos;
        }
    };

    useEffect(() => {
        async function fetchData() {
            const dataHUO = await getHUO(scannedInfo);
            const result = await dataHUO;
            if (result) setHandlingUnitOutboundInfos(result);
        }
        fetchData();
    }, [scannedInfo]);

    const dataToCheck = {
        process,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        handlingUnitOutboundInfos,
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
