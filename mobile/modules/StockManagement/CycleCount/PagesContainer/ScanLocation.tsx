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
import { useBoxes, useLocationIds } from '@helpers';
import { LsIsSecured } from '@helpers';
import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';

export interface IScanLocationProps {
    process: string;
    stepNumber: number;
    label: string;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    showEmptyLocations?: any;
    showSimilarLocations?: any;
    checkComponent: any;
    headerContent?: any;
}

export const ScanLocation = ({
    process,
    stepNumber,
    label,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    showEmptyLocations,
    showSimilarLocations,
    checkComponent,
    headerContent
}: IScanLocationProps) => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');
    const [scannedInfo, setScannedInfo] = useState<string>();
    const [resetForm, setResetForm] = useState<boolean>(false);
    const router = useRouter();

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

    // ScanLocation-2: launch query
    const locationInfos = useLocationIds(
        { barcode: `${scannedInfo}` },
        1,
        100,
        null,
        router.locale
    );

    //ScanLocation-3: manage information for persistence storage and front-end errors
    useEffect(() => {
        if (locationInfos.data) {
            if (locationInfos.data.locations?.count !== 0) {
                showEmptyLocations?.setShowEmptyLocations(false);
                showSimilarLocations?.setShowSimilarLocations(false);
            }
        }
    }, [locationInfos]);

    const dataToCheck = {
        process,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        locationInfos,
        trigger: { triggerRender, setTriggerRender },
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
                    buttons={{ ...buttons }}
                    setScannedInfo={setScannedInfo}
                    showEmptyLocations={showEmptyLocations}
                    showSimilarLocations={showSimilarLocations}
                    resetForm={{ resetForm, setResetForm }}
                    headerContent={headerContent}
                ></ScanForm>
                {checkComponent(dataToCheck)}
            </>
        </>
    );
};
