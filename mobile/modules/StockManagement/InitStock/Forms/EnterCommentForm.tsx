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
import { useTranslationWithFallback as useTranslation } from '@helpers';

export interface IEnterCommentProps {
    process: string;
    stepNumber: number;
    label: string;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    triggerAlternativeSubmit1?: { [label: string]: any };
    checkComponent: any;
    headerContent?: any;
    defaultValue?: any;
}

export const EnterComment = ({
    process,
    stepNumber,
    label,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    triggerAlternativeSubmit1: { triggerAlternativeSubmit1, setTriggerAlternativeSubmit1 } = {},
    checkComponent,
    defaultValue,
    headerContent
}: IEnterCommentProps) => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');
    const [scannedInfo, setScannedInfo] = useState<string>();
    const [resetForm, setResetForm] = useState<boolean>(false);

    useEffect(() => {
        if (defaultValue) {
            // N.B.: in this case previous step is kept at its previous value
            const data: { [label: string]: any } = {};
            setScannedInfo(undefined);
            data['comment'] = defaultValue;
            storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
            setTriggerRender(!triggerRender);
        }
        storage.set(process, JSON.stringify(storedObject));
    }, [triggerAlternativeSubmit1]);

    const dataToCheck = {
        process,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        trigger: { triggerRender, setTriggerRender },
        triggerAlternativeSubmit1: { triggerAlternativeSubmit1, setTriggerAlternativeSubmit1 },
        resetForm,
        required: false
    };

    return (
        <>
            <ScanForm
                process={process}
                initValue={defaultValue}
                stepNumber={stepNumber}
                required={false}
                label={label}
                trigger={{ triggerRender, setTriggerRender }}
                buttons={{ ...buttons }}
                setScannedInfo={setScannedInfo}
                resetForm={{ resetForm, setResetForm }}
                triggerAlternativeSubmit1={{
                    triggerAlternativeSubmit1,
                    setTriggerAlternativeSubmit1
                }}
                alternativeSubmitLabel1={t('actions:close')}
                headerContent={headerContent}
            ></ScanForm>
            {checkComponent(dataToCheck)}
        </>
    );
};
