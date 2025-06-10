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
import { LsIsSecured } from '@helpers';
import { EnterNumberForm } from 'modules/Common/EnterNumberForm';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useState } from 'react';

export interface IEnterQuantityProps {
    process: string;
    stepNumber: number;
    label?: string;
    defaultValue?: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    availableQuantity?: number;
    checkComponent: any;
    isCommentDisplayed?: boolean;
}

export const EnterQuantity = ({
    process,
    stepNumber,
    label,
    defaultValue,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    availableQuantity,
    checkComponent,
    isCommentDisplayed
}: IEnterQuantityProps) => {
    const { t } = useTranslation('common');
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '[]');
    const [enteredInfo, setEnteredInfo] = useState<number>();

    // TYPED SAFE ALL
    //Pre-requisite: initialize current step
    useEffect(() => {
        //automatically set movingQuantity when defaultValue is provided
        if (defaultValue) {
            // N.B.: in this case previous step is kept at its previous value
            const data: { [label: string]: any } = {};
            data['movingQuantity'] = defaultValue;
            storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
            setTriggerRender(!triggerRender);
        } else if (storedObject.currentStep < stepNumber) {
            //check workflow direction and assign current step accordingly
            storedObject[`step${stepNumber}`] = { previousStep: storedObject.currentStep };
            storedObject.currentStep = stepNumber;
        }
        storage.set(process, JSON.stringify(storedObject));
    }, []);

    const dataToCheck = {
        process,
        stepNumber,
        enteredInfo: { enteredInfo, setEnteredInfo },
        trigger: { triggerRender, setTriggerRender }
    };

    let rules: Array<any> = [{ required: true, message: t('messages:error-message-empty-input') }];
    if (availableQuantity !== undefined && availableQuantity !== null) {
        rules.push({
            type: 'number',
            max: availableQuantity,
            message: t('messages:erroneous-quantity')
        });
    }

    return (
        <>
            <EnterNumberForm
                process={process}
                stepNumber={stepNumber}
                label={label}
                trigger={{ triggerRender, setTriggerRender }}
                buttons={{ ...buttons }}
                setEnteredInfo={setEnteredInfo}
                rules={rules}
                min={1}
                initialValue={1}
                isSelected={true}
                isCommentDisplayed={isCommentDisplayed}
            ></EnterNumberForm>
            {checkComponent(dataToCheck)}
        </>
    );
};
