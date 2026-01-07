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
import { LsIsSecured } from '@helpers';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { useAppDispatch, useAppState } from 'context/AppContext';

export interface IScanPositionProps {
    processName: string;
    stepNumber: number;
    label: string;
    buttons: { [label: string]: any };
    checkComponent: any;
    defaultValue?: any;
}

export const ScanPosition = ({
    processName,
    stepNumber,
    label,
    buttons,
    checkComponent,
    defaultValue
}: IScanPositionProps) => {
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    const [scannedInfo, setScannedInfo] = useState<string>();
    const [resetForm, setResetForm] = useState<boolean>(false);
    const { graphqlRequestClient } = useAuth();

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
            const data: { [label: string]: any } = {};
            data['position'] = defaultValue;
            objectUpdate.object = { data };
        } else if (storedObject.currentStep < stepNumber) {
            //check workflow direction and assign current step accordingly
            objectUpdate.object = { previousStep: storedObject.currentStep };
            objectUpdate.customFields = [{ key: 'currentStep', value: stepNumber }];
        }
        dispatch(objectUpdate);
    }, []);

    const dataToCheck = {
        processName,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
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
            ></ScanForm_reducer>
            {checkComponent(dataToCheck)}
        </>
    );
};
