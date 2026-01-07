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
import { useLocationIds } from '@helpers';
import { useRouter } from 'next/router';
import { useAppDispatch, useAppState } from 'context/AppContext';

export interface IScanLocationReducerProps {
    processName: string;
    stepNumber: number;
    label: string;
    buttons: { [label: string]: any };
    showEmptyLocations?: any;
    showSimilarLocations?: any;
    checkComponent: any;
    headerContent?: any;
    initValue?: string;
    defaultValue?: any;
}

export const ScanLocation_reducer = ({
    processName,
    stepNumber,
    label,
    buttons,
    showEmptyLocations,
    showSimilarLocations,
    checkComponent,
    headerContent,
    initValue,
    defaultValue
}: IScanLocationReducerProps) => {
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    const [scannedInfo, setScannedInfo] = useState<string>();
    const [resetForm, setResetForm] = useState<boolean>(false);
    const router = useRouter();

    //Pre-requisite: initialize current step
    useEffect(() => {
        let objectUpdate: any = {
            type: 'UPDATE_BY_STEP',
            processName,
            stepName: `step${stepNumber}`,
            object: undefined,
            customFields: undefined
        };
        if (defaultValue) {
            // N.B.: in this case previous step is kept at its previous value
            objectUpdate.object = {
                ...storedObject[`step${stepNumber}`],
                data: { locations: [defaultValue] }
            };
            //check workflow direction and assign current step accordingly
        } else if (storedObject.currentStep < stepNumber) {
            objectUpdate.object = { previousStep: storedObject.currentStep };
            objectUpdate.customFields = [{ key: 'currentStep', value: stepNumber }];
        }
        dispatch(objectUpdate);
    }, [defaultValue]);

    // ScanLocation-2: launch query
    const locationInfos = useLocationIds(
        { barcode: `${scannedInfo}` },
        1,
        100,
        null,
        router.locale
    );

    //ScanLocation-3: manage information for persistence storage and front-end errors
    useEffect(() => {
        if (locationInfos.data) {
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
                    showEmptyLocations={showEmptyLocations}
                    showSimilarLocations={showSimilarLocations}
                    resetForm={{ resetForm, setResetForm }}
                    headerContent={headerContent}
                    initValue={initValue}
                    isSelected={true}
                ></ScanForm_reducer>
                {checkComponent(dataToCheck)}
            </>
        </>
    );
};
