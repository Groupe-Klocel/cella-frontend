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
//SPECIFIC FOR RECEPTION
//DESCRIPTION: retrieve information from local storage and validate them for database updates

import { WrapperForm, StyledForm, RadioButtons, ContentSpin } from '@components';
import { showError, showSuccess, LsIsSecured } from '@helpers';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';

export interface IValidateSubstitutionProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    headerContent: { [label: string]: any };
}

export const ValidateSubstitutionForm = ({
    process,
    stepNumber,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    headerContent: { setHeaderContent }
}: IValidateSubstitutionProps) => {
    const { t } = useTranslation('common');
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // TYPED SAFE ALL
    //Pre-requisite: initialize current step
    useEffect(() => {
        if (storedObject.currentStep < stepNumber) {
            //check workflow direction and assign current step accordingly
            storedObject[`step${stepNumber}`] = { previousStep: storedObject.currentStep };
            storedObject.currentStep = stepNumber;
        }
        storage.set(process, JSON.stringify(storedObject));
        setTriggerRender(!triggerRender);
    }, []);

    let substitutedFeature: { [k: string]: any } = {};
    if (storedObject.step20.data.substitutedFeature) {
        substitutedFeature = storedObject.step20.data.substitutedFeature;
    }
    let newFeature: { [k: string]: any } = {};
    if (storedObject.step30.data.newFeature) {
        newFeature = storedObject.step30.data.newFeature;
    }

    //ValidateSubstitution-1a: fetch front API
    const onFinish = async () => {
        setIsLoading(true);
        const res = await fetch(`/api/preparation-management/validateSubstitution/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                substitutedFeature,
                newFeature
            })
        });
        if (res.ok) {
            const response = await res.json();

            const storedObject = JSON.parse(storage.get(process) || '{}');
            const round = storedObject.step10.data.round;
            const remainingFeatures = response.response.remainingFeatures;

            storage.remove(process);

            console.log('response.response', response.response);

            if (remainingFeatures.length <= 0) {
                showSuccess(t('messages:substitution-success'));
            } else {
                // We still have quantities to substitute
                const step10data = {
                    round: round,
                    subsititutableFeatures: remainingFeatures
                };
                console.log('step10data', step10data);
                storedObject['currentStep'] = 20;
                storedObject[`step10`] = { previousStep: 0, data: step10data };
                storedObject[`step20`] = undefined;
                storedObject['step30'] = undefined;
                storage.set(process, JSON.stringify(storedObject));
            }
            setTriggerRender(!triggerRender);
        } else {
            showError(t('messages:substitution-failed'));
        }
        if (res) {
            setIsLoading(false);
        }
    };

    //ValidateSubstitution-1b: handle back to previous - previous step settings (specific since check is automatic)
    const onBack = () => {
        setTriggerRender(!triggerRender);
        for (let i = storedObject[`step${stepNumber}`].previousStep; i <= stepNumber; i++) {
            delete storedObject[`step${i}`]?.data;
        }
        storedObject.currentStep = storedObject[`step${stepNumber}`].previousStep;
        storage.set(process, JSON.stringify(storedObject));
    };

    return (
        <WrapperForm>
            {!isLoading ? (
                <StyledForm
                    name="basic"
                    layout="vertical"
                    onFinish={onFinish}
                    autoComplete="off"
                    scrollToFirstError
                    size="small"
                >
                    <RadioButtons input={{ ...buttons }} output={{ onBack }}></RadioButtons>
                </StyledForm>
            ) : (
                <ContentSpin />
            )}
        </WrapperForm>
    );
};
