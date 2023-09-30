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

export interface ICheckFinalLocationProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    originLocationId: string;
    articleId: string;
    destinationLocation: { [label: string]: any };
    headerContent: { [label: string]: any };
}

export const CheckFinalLocationQuantityForm = ({
    process,
    stepNumber,
    trigger: { triggerRender, setTriggerRender },
    originLocationId,
    articleId,
    destinationLocation,
    headerContent: { setHeaderContent }
}: ICheckFinalLocationProps) => {
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

    //CheckFinalLocation-1a: handle back to previous step settings
    const onBack = () => {
        setTriggerRender(!triggerRender);
        for (let i = storedObject[`step${stepNumber}`].previousStep; i <= stepNumber; i++) {
            delete storedObject[`step${i}`]?.data;
        }
        storedObject.currentStep = storedObject[`step${stepNumber}`].previousStep;
        storage.set(process, JSON.stringify(storedObject));
    };

    //CheckFinalLocation-1b: launch front API query for chosenLocation
    const [fetchResult, setFetchResult] = useState<any>();
    useEffect(() => {
        //checking via front API
        const fetchData = async () => {
            const res = await fetch(`/api/stock-management/checkFinalLocation/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    movementType: process,
                    destinationLocationId: destinationLocation.id,
                    articleId,
                    originLocationId
                })
            });
            const response = await res.json();
            setFetchResult(response.response);
            if (!res.ok) {
                if (response.error.is_error) {
                    // specific error
                    showError(t(`errors:${response.error.code}`));
                } else {
                    // generic error
                    showError(t('messages:check-failed'));
                }
                onBack();
                setHeaderContent(false);
            }
        };
        fetchData();
    }, []);

    //CheckFinalLocation-2: record values in securedLS once validated with associated Hu or Huc where any
    useEffect(() => {
        if (fetchResult) {
            const data: { [label: string]: any } = {};
            const type = fetchResult.checkFinalLocationQuantity.locationComparison;
            let destinationContent: { [label: string]: any } | null;
            let destinationHu: { [label: string]: any } | null;
            data['chosenLocation'] = {
                ...destinationLocation,
                type
            };
            if (fetchResult.checkFinalLocationQuantity.destinationContentId) {
                destinationContent = {
                    destinationContentId:
                        fetchResult.checkFinalLocationQuantity.destinationContentId,
                    destinationContentQuantity:
                        fetchResult.checkFinalLocationQuantity.destinationContentQuantity
                };
                data['chosenLocation'] = {
                    ...data['chosenLocation'],
                    destinationContent
                };
            }
            if (fetchResult.checkFinalLocationQuantity.destinationHuId) {
                destinationHu = {
                    destinationHuId: fetchResult.checkFinalLocationQuantity.destinationHuId
                };
                data['chosenLocation'] = {
                    ...data['chosenLocation'],
                    destinationHu
                };
            }
            storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
            storage.set(process, JSON.stringify(storedObject));
            setTriggerRender(!triggerRender);
        }
    }, [fetchResult]);

    return <WrapperForm>{!fetchResult ? <ContentSpin /> : <></>}</WrapperForm>;
};
