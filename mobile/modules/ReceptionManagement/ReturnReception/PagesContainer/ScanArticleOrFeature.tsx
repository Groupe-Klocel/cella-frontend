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
import { ScanForm } from '@CommonRadio';
import { useEffect, useState } from 'react';
import { LsIsSecured } from '@helpers';
import useTranslation from 'next-translate/useTranslation';

export interface IScanArticleOrFeatureProps {
    process: string;
    stepNumber: number;
    label: string;
    trigger: { [label: string]: any };
    action1Trigger?: any;
    triggerAlternativeSubmit?: any;
    triggerAlternativeSubmit1?: any;
    buttons: { [label: string]: any };
    checkComponent: any;
}

export const ScanArticleOrFeature = ({
    process,
    stepNumber,
    label,
    trigger: { triggerRender, setTriggerRender },
    action1Trigger: { action1Trigger, setAction1Trigger },
    triggerAlternativeSubmit: { triggerAlternativeSubmit, setTriggerAlternativeSubmit },
    triggerAlternativeSubmit1: { triggerAlternativeSubmit1, setTriggerAlternativeSubmit1 },
    buttons,
    checkComponent
}: IScanArticleOrFeatureProps) => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');
    const [scannedInfo, setScannedInfo] = useState<string>();
    const [resetForm, setResetForm] = useState<boolean>(false);

    //Pre-requisite: initialize current step
    useEffect(() => {
        //check workflow direction and assign current step accordingly
        if (storedObject.currentStep < stepNumber) {
            storedObject[`step${stepNumber}`] = {
                previousStep: storedObject.currentStep
            };
            storedObject.currentStep = stepNumber;
        }
        storage.set(process, JSON.stringify(storedObject));
    }, []);

    const dataToCheck = {
        process,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        trigger: { triggerRender, setTriggerRender },
        triggerAlternativeSubmit: { triggerAlternativeSubmit, setTriggerAlternativeSubmit },
        alternativeSubmitInput: storedObject.step40.data.handlingUnit?.id ?? undefined,
        triggerAlternativeSubmit1: { triggerAlternativeSubmit1, setTriggerAlternativeSubmit1 },
        alternativeSubmitInput1:
            storedObject.step20.data.purchaseOrder?.purchaseOrderLines.length > 0 ?? undefined,
        setResetForm
    };

    return (
        <>
            <ScanForm
                process={process}
                stepNumber={stepNumber}
                label={label}
                trigger={{ triggerRender, setTriggerRender }}
                action1Trigger={{ action1Trigger, setAction1Trigger }}
                triggerAlternativeSubmit={{ triggerAlternativeSubmit, setTriggerAlternativeSubmit }}
                triggerAlternativeSubmit1={{
                    triggerAlternativeSubmit1,
                    setTriggerAlternativeSubmit1
                }}
                buttons={{ ...buttons }}
                setScannedInfo={setScannedInfo}
                resetForm={{ resetForm, setResetForm }}
                action1Label={t('common:other-articles')}
                alternativeSubmitLabel={t('common:other-box')}
                alternativeSubmitLabel1={t('common:end-return')}
            ></ScanForm>
            {checkComponent(dataToCheck)}
        </>
    );
};
