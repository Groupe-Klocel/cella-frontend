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
import { showError, LsIsSecured } from '@helpers';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';

export interface ISubstitutedFeatureChecksProps {
    dataToCheck: any;
}

// TO BE REVIEWED: THIS IS A COPY COMING FROM CONTENT MOVEMENT

export const SubstitutedFeatureChecks = ({ dataToCheck }: ISubstitutedFeatureChecksProps) => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const {
        process,
        stepNumber,
        inputFeatures,
        scannedInfo: { scannedInfo, setScannedInfo },
        trigger: { triggerRender, setTriggerRender },
        setResetForm
    } = dataToCheck;

    const storedObject = JSON.parse(storage.get(process) || '{}');
    // TYPED SAFE ALL
    //ScanArticleOrFeature-2: call and process frontAPIResponse
    useEffect(() => {
        if (scannedInfo && inputFeatures) {
            setIsLoading(true);
            let found = false;
            for (let i = 0; i < inputFeatures.length; i++) {
                if (inputFeatures[i].value === scannedInfo) {
                    found = true;
                    break;
                }
            }
            if (found) {
                const data: { [label: string]: any } = {};
                const selectedSubstitutedFeature = inputFeatures?.find((e: any) => {
                    return e.value == scannedInfo;
                });
                data['substitutedFeature'] = selectedSubstitutedFeature;
                setTriggerRender(!triggerRender);
                storedObject[`step${stepNumber}`] = {
                    ...storedObject[`step${stepNumber}`],
                    data
                };
                setIsLoading(false);
            } else {
                showError(t('messages:unexpected-scanned-item'));
                setResetForm(true);
                setScannedInfo(undefined);
                setIsLoading(false);
            }
        }
        if (
            storedObject[`step${stepNumber}`] &&
            Object.keys(storedObject[`step${stepNumber}`]).length != 0
        ) {
            storage.set(process, JSON.stringify(storedObject));
        }
    }, [scannedInfo]);

    return <WrapperForm>{isLoading ? <ContentSpin /> : <></>}</WrapperForm>;
};
