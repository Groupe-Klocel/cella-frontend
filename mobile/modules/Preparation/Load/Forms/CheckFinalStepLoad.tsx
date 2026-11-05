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
import { showError, showSuccess } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppState } from 'context/AppContext';

export interface ICheckFinalStepLoadProps {
    processName: string;
    stepNumber: number;
    box: any;
    load: string;
}

export const CheckFinalStepLoadForm = ({
    processName,
    stepNumber,
    box,
    load
}: ICheckFinalStepLoadProps) => {
    const { t } = useTranslation();
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};

    // Captured once at mount (before the init-step dispatch below changes currentStep to
    // stepNumber) - the error path needs this exact value later, once the async fetch
    // below resolves, when storedObject.currentStep no longer reads 20.
    const previousStepRef = useRef(storedObject.currentStep);

    // TYPED SAFE ALL
    //Pre-requisite: initialize current step
    useEffect(() => {
        if (storedObject.currentStep < stepNumber) {
            //check workflow direction and assign current step accordingly
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: `step${stepNumber}`,
                object: { previousStep: storedObject.currentStep },
                customFields: [{ key: 'currentStep', value: stepNumber }]
            });
        }
    }, []);

    //CheckFinalStepLoad-1a: handle back to previous step settings — clears the data of
    //every step from the one we came from up to this one, so the page falls back to the
    //scan step instead of re-attempting the same validation in a loop. previousStep is
    //passed in explicitly (previousStepRef.current) rather than read back from
    //storedObject: this runs from the fetchError effect below, well after the mount
    //render, so storedObject[`step${stepNumber}`] can no longer be trusted to reflect it.
    const onBack = (previousStep: number) => {
        const newStoredObject: { [key: string]: any } = { ...storedObject };
        for (let i = previousStep; i <= stepNumber; i++) {
            if (newStoredObject[`step${i}`]) {
                const { data, nextStep, ...rest } = newStoredObject[`step${i}`];
                newStoredObject[`step${i}`] = rest;
            }
        }
        newStoredObject.currentStep = previousStep;
        dispatch({ type: 'UPDATE_BY_PROCESS', processName, object: newStoredObject });
    };

    //CheckFinalStepLoad-1b: launch front API query for chosenLocation
    const [fetchResult, setFetchResult] = useState<any>();
    const [fetchError, setFetchError] = useState<any>();
    useEffect(() => {
        //checking via front API
        const fetchData = async () => {
            const res = await fetch(`/api/preparation-management/validateLoad/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    box,
                    load
                })
            });
            const response = await res.json();
            if (res.ok && response.response?.updatedLoad) {
                setFetchResult(response.response);
            } else {
                setFetchError(response.error ?? { is_error: true });
            }
        };
        fetchData();
    }, []);

    //CheckFinalStepLoad-1c: on failure (API/network error, or a malformed success
    //response missing updatedLoad), go back to the scan step. Kept in its own effect
    //(rather than called inline from fetchData above) so onBack runs against the
    //component's current render/closure instead of the one captured at mount.
    useEffect(() => {
        if (fetchError) {
            if (fetchError.is_error) {
                showError(t(`errors:${fetchError.code}`));
            } else if (fetchError.response?.errors?.[0]?.extensions?.code) {
                showError(t(`errors:${fetchError.response.errors[0].extensions.code}`));
            } else {
                showError(t('messages:check-failed'));
            }
            onBack(previousStepRef.current);
        }
    }, [fetchError]);

    //CheckFinalStepLoad-2: record values in the process state once validated
    useEffect(() => {
        if (fetchResult) {
            showSuccess(t('messages:load-success'));
            const { data: _step20Data, nextStep: _step20NextStep, ...step20Rest } =
                storedObject.step20 || {};
            dispatch({
                type: 'UPDATE_BY_PROCESS',
                processName,
                object: {
                    ...storedObject,
                    step10: {
                        ...storedObject.step10,
                        data: {
                            ...storedObject.step10.data,
                            load: {
                                ...storedObject.step10.data.load,
                                numberHuLoaded: fetchResult.updatedLoad.numberHuLoaded,
                                weight: fetchResult.updatedLoad.weight,
                                status: fetchResult.updatedLoad.status
                            }
                        }
                    },
                    step20: step20Rest,
                    currentStep:
                        storedObject[`step${storedObject[`step${stepNumber}`].previousStep}`]
                            .previousStep
                }
            });
        }
    }, [fetchResult]);

    return <WrapperForm>{!fetchResult ? <ContentSpin /> : <></>}</WrapperForm>;
};
