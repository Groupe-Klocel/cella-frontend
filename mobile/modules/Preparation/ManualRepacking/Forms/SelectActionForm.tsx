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
//DESCRIPTION: choose the repacking action to perform on the scanned box (split or consolidation)

import { WrapperForm, WrapperButtons, StyledButton } from '@components';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect } from 'react';
import { useAppDispatch, useAppState } from 'context/AppContext';

export interface ISelectActionFormProps {
    processName: string;
    stepNumber: number;
}

export const SelectActionForm = ({ processName, stepNumber }: ISelectActionFormProps) => {
    const { t } = useTranslation();
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};

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

    const onSelectAction = (action: 'split' | 'consolidation') => {
        const data: { [label: string]: any } = {};
        data['action'] = action;
        dispatch({
            type: 'UPDATE_BY_STEP',
            processName,
            stepName: `step${stepNumber}`,
            object: {
                ...storedObject[`step${stepNumber}`],
                data
            }
        });
    };

    return (
        <WrapperForm>
            <WrapperButtons>
                <StyledButton type="primary" onClick={() => onSelectAction('split')}>
                    {t('actions:split')}
                </StyledButton>
                <StyledButton type="primary" onClick={() => onSelectAction('consolidation')}>
                    {t('actions:consolidation')}
                </StyledButton>
            </WrapperButtons>
        </WrapperForm>
    );
};
