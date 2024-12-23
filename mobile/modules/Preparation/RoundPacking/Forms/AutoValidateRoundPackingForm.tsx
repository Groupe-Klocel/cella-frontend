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

export interface IAutoValidateRoundPackingProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    headerContent: { [label: string]: any };
}

export const AutoValidateRoundPackingForm = ({
    process,
    stepNumber,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    headerContent: { setHeaderContent }
}: IAutoValidateRoundPackingProps) => {
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

    let roundHU: { [k: string]: any } = {};
    if (storedObject.step10.data.roundHU) {
        roundHU = storedObject.step10.data.roundHU;
    }
    let round: { [k: string]: any } = {};
    if (storedObject.step10.data.round) {
        round = storedObject.step10.data.round;
    }
    let existingFinalHUO: { [k: string]: any } = {};
    if (storedObject.step10.data.existingFinalHUO) {
        existingFinalHUO = storedObject.step10.data.existingFinalHUO;
    }
    let handlingUnitModel: { [k: string]: any } = {};
    if (storedObject.step20.data.handlingUnitModel) {
        handlingUnitModel = storedObject.step20.data.handlingUnitModel;
    }
    let articleInfos: { [k: string]: any } = {};
    if (storedObject.step30.data.article) {
        articleInfos = storedObject.step30.data.article;
    }
    let roundContentInfos: { [k: string]: any } = {};
    if (storedObject.step30.data.handlingUnitContent) {
        roundContentInfos = storedObject.step30.data.handlingUnitContent;
    }
    let feature: { [k: string]: any } = {};
    if (storedObject.step30.data.feature) {
        feature = storedObject.step30.data.feature;
    }
    let movingQuantity: number;
    if (storedObject.step40.data.movingQuantity) {
        movingQuantity = storedObject.step40.data.movingQuantity;
    }
    let resType: string;
    if (storedObject.step30.data.resType) {
        resType = storedObject.step30.data.resType;
    }

    //AutoValidateRoundPacking-1a: handle back to previous - previous step settings (specific since check is automatic)
    const onBack = () => {
        setTriggerRender(!triggerRender);
        for (let i = storedObject[`step${stepNumber}`].previousStep; i <= stepNumber; i++) {
            delete storedObject[`step${i}`]?.data;
        }
        storedObject.currentStep = storedObject[`step${stepNumber}`].previousStep;
        storage.set(process, JSON.stringify(storedObject));
    };

    //AutoValidateRoundPacking-1b: fetch front API
    const [fetchResult, setFetchResult] = useState<any>();
    useEffect(() => {
        //checking via front API
        const fetchData = async () => {
            const res = await fetch(`/api/preparation-management/validateRoundPacking/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    existingFinalHUO,
                    round,
                    roundHU,
                    articleInfos,
                    handlingUnitModel,
                    feature,
                    movingQuantity,
                    resType,
                    roundContentInfos
                })
            });
            const response = await res.json();
            setFetchResult(response.response);
            if (!res.ok) {
                showError(t('messages:round-packing-failed'));
                onBack();
                setHeaderContent(false);
            }
        };
        fetchData();
    }, []);

    //AutoValidateRoundPacking-2a: record values in securedLS once validated or launch closeBox API
    useEffect(() => {
        if (fetchResult) {
            storage.remove(process);
            const storedObject = JSON.parse(storage.get(process) || '{}');

            if (fetchResult.updatedRoundHU) {
                console.log('Validate.response', fetchResult);
                const roundHU = fetchResult.updatedRoundHU;

                // Filter handlingUnitContents with quantity > 0

                const filteredContents = roundHU.handlingUnitContents.filter(
                    (huc: any) => huc.quantity > 0
                );

                // Create a new roundHU object with the filtered contents
                const roundHUWithFilteredContents = {
                    ...roundHU,
                    handlingUnitContents: filteredContents
                };

                if (roundHUWithFilteredContents.handlingUnitContents.length <= 0) {
                    const fetchCloseBoxData = async () => {
                        const res = await fetch(`/api/preparation-management/closeBox/`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                deleteDeclarativeHUO: true,
                                handlingUnitOutbound: fetchResult.finalHandlingUnitOutbound,
                                roundHU: roundHUWithFilteredContents
                            })
                        });
                        if (res.ok) {
                            const response = await res.json();
                            console.log('CloseBox.response', response);
                            if (response.response.printResult == 'RenderedDocument') {
                                showSuccess(t('messages:success-print-data'));
                            } else {
                                showError(t('messages:error-print-data'));
                            }
                            showSuccess(t('messages:round-packing-success'));
                        } else {
                            showError(t('messages:round-packing-finalization-failed'));
                        }
                        if (!res.ok) {
                            showError(t('messages:round-packing-finalization-failed'));
                            onBack();
                            setHeaderContent(false);
                        }
                    };
                    fetchCloseBoxData();
                } else {
                    // We still have quantities to pack
                    const step10data = {
                        roundHU: roundHUWithFilteredContents,
                        round: round,
                        existingFinalHUO: fetchResult.finalHandlingUnitOutbound
                    };
                    const step20data = {
                        handlingUnitModel: handlingUnitModel
                    };
                    storedObject['currentStep'] = 30;
                    storedObject[`step10`] = { previousStep: 0, data: step10data };
                    storedObject[`step20`] = { previousStep: 10, data: step20data };
                    storedObject[`step30`] = { previousStep: 20 };
                    storage.set(process, JSON.stringify(storedObject));
                }
            }
            setTriggerRender(!triggerRender);
        }
    }, [fetchResult]);

    return <WrapperForm>{!fetchResult ? <ContentSpin /> : <></>}</WrapperForm>;
};
