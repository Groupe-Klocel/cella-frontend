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
//DESCRIPTION: split, the whole content of the original box has been moved to new boxes: there is
// no packaging nor actual weight to enter for it, the operator is told that the (empty) original
// box is going to be deleted. Submitting confirms the deletion, done at the next step.

import { WrapperForm, StyledForm } from '@components';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Alert, Form } from 'antd';
import { useEffect } from 'react';
import { useAppDispatch, useAppState } from 'context/AppContext';

export interface IConfirmOriginalBoxDeletionFormProps {
    processName: string;
    stepNumber: number;
    formToUse?: any;
}

export const ConfirmOriginalBoxDeletionForm = ({
    processName,
    stepNumber,
    formToUse
}: IConfirmOriginalBoxDeletionFormProps) => {
    const { t } = useTranslation();
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    const [ownForm] = Form.useForm();
    const form = formToUse ?? ownForm;

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

    const onFinish = () => {
        const data: { [label: string]: any } = {};
        data['isOriginalBoxEmpty'] = true;
        dispatch({
            type: 'UPDATE_BY_STEP',
            processName,
            stepName: `step${stepNumber}`,
            object: { ...storedObject[`step${stepNumber}`], data }
        });
    };

    return (
        <WrapperForm>
            <Alert
                type="warning"
                showIcon
                message={t('messages:original-box-empty-will-be-deleted')}
                style={{ marginBottom: 12 }}
            />
            <StyledForm
                name="basic"
                layout="vertical"
                onFinish={onFinish}
                autoComplete="off"
                size="small"
                form={form}
            ></StyledForm>
        </WrapperForm>
    );
};
