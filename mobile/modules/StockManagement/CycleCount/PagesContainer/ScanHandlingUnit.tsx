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
import { GetHandlingUnitsQuery, useGetHandlingUnitsQuery } from 'generated/graphql';
import { useAuth } from 'context/AuthContext';
import useTranslation from 'next-translate/useTranslation';

export interface IScanHandlingUnitProps {
    process: string;
    stepNumber: number;
    label: string;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    checkComponent: any;
    triggerAlternativeSubmit?: any;
    defaultValue?: any;
}

export const ScanCCHandlingUnit = ({
    process,
    stepNumber,
    label,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    checkComponent,
    triggerAlternativeSubmit: { triggerAlternativeSubmit, setTriggerAlternativeSubmit },
    defaultValue
}: IScanHandlingUnitProps) => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');
    const [scannedInfo, setScannedInfo] = useState<string>();
    const [resetForm, setResetForm] = useState<boolean>(false);
    const { graphqlRequestClient } = useAuth();

    //Pre-requisite: initialize current step
    useEffect(() => {
        //automatically set handlingUnit when defaultValue is provided
        if (defaultValue) {
            // N.B.: in this case previous step is kept at its previous value
            const data: { [label: string]: any } = {};
            data['handlingUnit'] = defaultValue;
            storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
            setTriggerRender(!triggerRender);
        } else if (storedObject.currentStep < stepNumber) {
            //check workflow direction and assign current step accordingly
            storedObject[`step${stepNumber}`] = { previousStep: storedObject.currentStep };
            storedObject.currentStep = stepNumber;
        }
        storage.set(process, JSON.stringify(storedObject));
    }, []);

    // ScanHandlingUnit-2: launch query

    const handlingUnitInfos = useGetHandlingUnitsQuery<Partial<GetHandlingUnitsQuery>, Error>(
        graphqlRequestClient,
        {
            filters: { barcode: [`${scannedInfo}`] },
            orderBy: null,
            page: 1,
            itemsPerPage: 100
        }
    );

    const dataToCheck = {
        process,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        handlingUnitInfos,
        trigger: { triggerRender, setTriggerRender },
        triggerAlternativeSubmit: { triggerAlternativeSubmit, setTriggerAlternativeSubmit },
        alternativeSubmitInput: storedObject?.step20?.data?.location ?? undefined,
        setResetForm
    };

    return (
        <>
            <>
                <ScanForm
                    process={process}
                    stepNumber={stepNumber}
                    label={label}
                    trigger={{ triggerRender, setTriggerRender }}
                    triggerAlternativeSubmit={{
                        triggerAlternativeSubmit,
                        setTriggerAlternativeSubmit
                    }}
                    buttons={{ ...buttons }}
                    setScannedInfo={setScannedInfo}
                    resetForm={{ resetForm, setResetForm }}
                    alternativeSubmitLabel={t('common:location-count-finished')}
                ></ScanForm>
                {checkComponent(dataToCheck)}
            </>
        </>
    );
};
