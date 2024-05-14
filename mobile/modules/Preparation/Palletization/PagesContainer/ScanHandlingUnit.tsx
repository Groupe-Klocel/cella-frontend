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
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import useTranslation from 'next-translate/useTranslation';

export interface IScanHandlingUnitProps {
    process: string;
    stepNumber: number;
    label: string;
    trigger: { [label: string]: any };
    triggerAlternativeSubmit1?: any;
    buttons: { [label: string]: any };
    checkComponent: any;
    defaultValue?: any;
}

export const ScanHandlingUnit = ({
    process,
    stepNumber,
    label,
    trigger: { triggerRender, setTriggerRender },
    triggerAlternativeSubmit1: { triggerAlternativeSubmit1, setTriggerAlternativeSubmit1 },
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
    const { t } = useTranslation();
    const [formData, setFormData] = useState<string>();

    //Pre-requisite: initialize current step
    useEffect(() => {
        //automatically set handlingUnit when defaultValue is provided
        if (defaultValue) {
            // N.B.: in this case previous step is kept at its previous value
            const data: { [label: string]: any } = {};
            data['handlingUnit'] = defaultValue;
            storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
            setTriggerRender(!triggerRender);
        } else if (storedObject.currentStep < stepNumber) {
            //check workflow direction and assign current step accordingly
            storedObject[`step${stepNumber}`] = { previousStep: storedObject.currentStep };
            storedObject.currentStep = stepNumber;
        }
        storage.set(process, JSON.stringify(storedObject));
    }, []);

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
                                    }
                                    handlingUnitContentFeatures {
                                        id
                                        featureCode {
                                            name
                                            unique
                                        }
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
                                }
                                handlingUnitContentFeatures {
                                    id
                                    featureCode {
                                        name
                                        unique
                                    }
                                    value
                                }
                            }
                            handlingUnitOutbounds {
                                id
                                status
                                carrierId
                                carrier {
                                    id
                                    name
                                }
                                deliveryId
                                carrierShippingModeId
                                handlingUnitModelId
                                theoriticalWeight
                            }
                        }
                    }
                }
            `;

            const variables = {
                filters: { barcode: [`${scannedInfo}`] }
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
        triggerAlternativeSubmit1: { triggerAlternativeSubmit1, setTriggerAlternativeSubmit1 },
        handlingUnitInfos,
        trigger: { triggerRender, setTriggerRender },
        alternativeSubmitInput1: storedObject.step10.data ?? undefined,
        setResetForm,
        formData: { formData, setFormData }
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
                    triggerAlternativeSubmit1={{
                        triggerAlternativeSubmit1,
                        setTriggerAlternativeSubmit1
                    }}
                    alternativeSubmitLabel1={t('common:close-pallet')}
                    getFormData={true}
                    setFormData={setFormData}
                ></ScanForm>
                {checkComponent(dataToCheck)}
            </>
        </>
    );
};
