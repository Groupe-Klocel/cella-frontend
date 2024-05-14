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

export interface IScanFinalHandlingUnitOutboundProps {
    process: string;
    stepNumber: number;
    label: string;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    checkComponent: any;
    defaultValue?: any;
}

export const ScanFinalHandlingUnitOutbound = ({
    process,
    stepNumber,
    label,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    checkComponent,
    defaultValue
}: IScanFinalHandlingUnitOutboundProps) => {
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');
    const [scannedInfo, setScannedInfo] = useState<string>();
    const [resetForm, setResetForm] = useState<boolean>(false);
    const [handlingUnitOutboundInfos, setHandlingUnitOutboundInfos] = useState<any>();
    const { graphqlRequestClient } = useAuth();
    const [uniqueHU, setUniqueHU] = useState<boolean>(false);

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

    // ScanFinalHandlingUnitOutbound-2: launch query
    const getHU = async (scannedInfo: any): Promise<{ [key: string]: any } | undefined> => {
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
                            carrierBox
                            handlingUnit {
                                id
                                name
                                barcode
                            }
                        }
                    }
                }
            `;

            const variables = {
                advancedFilters: {
                    filter: [
                        { searchType: 'EQUAL', field: { handlingUnit_Barcode: scannedInfo } },
                        { searchType: 'EQUAL', field: { carrierBox: scannedInfo } }
                    ]
                }
            };
            const handlingUnitOutboundInfos = await graphqlRequestClient.request(query, variables);
            return handlingUnitOutboundInfos;
        }
    };

    console.log('DLA-huoInfos', handlingUnitOutboundInfos);

    useEffect(() => {
        async function fetchData() {
            const result = await getHU(scannedInfo);
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
