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
import { useAppDispatch, useAppState } from 'context/AppContext';

export interface IScanRoundOrHuOrPositionProps {
    processName: string;
    stepNumber: number;
    label: string;
    buttons: { [label: string]: any };
    showEmptyLocations?: any;
    showSimilarLocations?: any;
    triggerAlternativeSubmit?: any;
    checkComponent: any;
    headerContent?: any;
}

export const ScanRoundOrHuOrPosition = ({
    processName,
    stepNumber,
    label,
    buttons,
    showEmptyLocations,
    showSimilarLocations,
    triggerAlternativeSubmit,
    checkComponent,
    headerContent
}: IScanRoundOrHuOrPositionProps) => {
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    const [scannedInfo, setScannedInfo] = useState<string>();
    const [resetForm, setResetForm] = useState<boolean>(false);

    //Pre-requisite: initialize current step
    useEffect(() => {
        dispatch({
            type: 'UPDATE_BY_STEP',
            processName,
            stepName: `step${stepNumber}`,
            object: { previousStep: storedObject.currentStep },
            customFields: [{ key: 'currentStep', value: stepNumber }]
        });
    }, []);

    const dataToCheck = {
        processName,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        triggerAlternativeSubmit,
        setResetForm,
        showEmptyLocations: { showEmptyLocations },
        showSimilarLocations: { showSimilarLocations }
    };

    return (
        <>
            <ScanForm_reducer
                processName={processName}
                stepNumber={stepNumber}
                label={label}
                buttons={{ ...buttons }}
                showEmptyLocations={showEmptyLocations}
                showSimilarLocations={showSimilarLocations}
                triggerAlternativeSubmit={triggerAlternativeSubmit}
                headerContent={headerContent}
                setScannedInfo={setScannedInfo}
                resetForm={{ resetForm, setResetForm }}
            ></ScanForm_reducer>
            {checkComponent(dataToCheck)}
        </>
    );
};
