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
import { WrapperForm, ContentSpin } from '@components';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { useEffect } from 'react';

export interface IReviewHuModelWeightChecksProps {
    dataToCheck: any;
    isToControl?: any;
}

export const ReviewHuModelWeightChecks = ({
    dataToCheck,
    isToControl: { isToControl, setIsToControl }
}: IReviewHuModelWeightChecksProps) => {
    const state = useAppState();
    const dispatch = useAppDispatch();

    const {
        processName,
        stepNumber,
        huModel,
        enteredInfo: { enteredWeightInfo },
        triggerAlternativeSubmit1
    } = dataToCheck;

    const storedObject = state[processName] || {};

    // TYPED SAFE ALL
    useEffect(() => {
        const data: { [label: string]: any } = {};
        if (enteredWeightInfo) {
            data['finalWeight'] = enteredWeightInfo;
            data['handlingUnitModel'] = huModel;
        }
        if (storedObject[`step${stepNumber}`] && Object.keys(data).length != 0) {
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: `step${stepNumber}`,
                object: {
                    ...storedObject[`step${stepNumber}`],
                    data
                },
                customFields: [{ key: 'currentStep', value: stepNumber }]
            });
        }
    }, [enteredWeightInfo]);

    useEffect(() => {
        if (triggerAlternativeSubmit1.triggerAlternativeSubmit1) {
            setIsToControl(true);
            //N.B. : Need initializing step 40 to have the relevant previousStep before going back
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName: processName,
                stepName: `step40`,
                object: {
                    previousStep: storedObject[`step${storedObject.currentStep}`].previousStep
                },
                customFields: undefined
            });
            dispatch({
                type: 'ON_BACK',
                processName: processName,
                stepToReturn: `step40`
            });
            triggerAlternativeSubmit1.setTriggerAlternativeSubmit1(false);
        }
    }, [triggerAlternativeSubmit1]);

    return (
        <WrapperForm>
            {enteredWeightInfo && !storedObject[`step${stepNumber}`]?.data ? (
                <ContentSpin />
            ) : (
                <></>
            )}
        </WrapperForm>
    );
};
