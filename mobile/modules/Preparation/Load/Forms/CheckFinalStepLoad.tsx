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
import { showError, LsIsSecured, showSuccess } from '@helpers';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';

export interface ICheckFinalStepLoadProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    box: any;
    load: string;
    headerContent: { [label: string]: any };
}

export const CheckFinalStepLoadForm = ({
    process,
    stepNumber,
    trigger: { triggerRender, setTriggerRender },
    box,
    load,
    headerContent: { setHeaderContent }
}: ICheckFinalStepLoadProps) => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');

    // TYPED SAFE ALL
    //Pre-requisite: initialize current step
    useEffect(() => {
        if (storedObject.currentStep < stepNumber) {
            //check workflow direction and assign current step accordingly
            storedObject[`step${stepNumber}`] = { previousStep: storedObject.currentStep };
            storedObject.currentStep = stepNumber;
        }
        storage.set(process, JSON.stringify(storedObject));
    }, []);

    //CheckFinalStepLoad-1a: handle back to previous step settings
    const onBack = () => {
        setTriggerRender(!triggerRender);
        for (let i = storedObject[`step${stepNumber}`].previousStep; i <= stepNumber; i++) {
            delete storedObject[`step${i}`]?.data;
        }
        storedObject.currentStep = storedObject[`step${stepNumber}`].previousStep;
        storage.set(process, JSON.stringify(storedObject));
    };

    //CheckFinalStepLoad-1b: launch front API query for chosenLocation
    const [fetchResult, setFetchResult] = useState<any>();
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
            setFetchResult(response.response);
            if (!res.ok) {
                if (response.error.is_error) {
                    showError(t(`errors:${response.error.code}`));
                } else {
                    showError(t('messages:check-failed'));
                }
                onBack();
                setHeaderContent(false);
            }
        };
        fetchData();
    }, []);

    //CheckFinalStepLoad-2: record values in securedLS once validated
    useEffect(() => {
        if (fetchResult) {
            showSuccess(t('messages:load-success'));
            delete storedObject[`step${20}`]?.data;
            delete storedObject[`step${20}`]?.nextStep;
            storedObject.step10.data.load.numberHuLoaded =
                storedObject.step10.data.load.numberHuLoaded + 1;
            storedObject.step10.data.load.weight =
                storedObject.step10.data.load.weight + box.theoriticalWeight;
            storedObject.currentStep =
                storedObject[`step${storedObject[`step${stepNumber}`].previousStep}`].previousStep;
            storage.set(process, JSON.stringify(storedObject));
            setHeaderContent(false);
            setTriggerRender(!triggerRender);
        }
    }, [fetchResult]);

    return <WrapperForm>{!fetchResult ? <ContentSpin /> : <></>}</WrapperForm>;
};
