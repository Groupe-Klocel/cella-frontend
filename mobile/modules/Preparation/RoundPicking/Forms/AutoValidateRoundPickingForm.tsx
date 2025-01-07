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
import configs from '../../../../../common/configs.json';
import { useListParametersForAScopeQuery } from 'generated/graphql';
import { useAuth } from 'context/AuthContext';

export interface IAutoValidateRoundPickingProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    headerContent: { [label: string]: any };
}

export const AutoValidateRoundPickingForm = ({
    process,
    stepNumber,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    headerContent: { setHeaderContent }
}: IAutoValidateRoundPickingProps) => {
    const { t } = useTranslation('common');
    const { graphqlRequestClient } = useAuth();
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

    let proposedRoundAdvisedAddress: { [k: string]: any } = {};
    if (storedObject.step10.data.proposedRoundAdvisedAddress) {
        proposedRoundAdvisedAddress = storedObject.step10.data.proposedRoundAdvisedAddress;
    }
    let round: { [k: string]: any } = {};
    if (storedObject.step10.data.round) {
        round = storedObject.step10.data.round;
    }
    let articleInfos: { [k: string]: any } = {};
    if (storedObject.step20.data.articleLuBarcodes) {
        articleInfos = storedObject.step20.data.articleLuBarcodes[0];
    }
    let feature: { [k: string]: any } = {};
    if (storedObject.step20.data.feature) {
        feature = storedObject.step20.data.feature;
    }
    let handlingUnit: { [k: string]: any } = {};
    if (storedObject.step25.data.handlingUnit) {
        handlingUnit = storedObject.step25.data.handlingUnit;
    }
    let movingQuantity: number;
    if (storedObject.step30.data.movingQuantity) {
        movingQuantity = storedObject.step30.data.movingQuantity;
    }
    let resType: string;
    if (storedObject.step20.data.resType) {
        resType = storedObject.step20.data.resType;
    }

    //ValidateRoundPicking-1a: handle back to previous - previous step settings (specific since check is automatic)
    const onBack = () => {
        setTriggerRender(!triggerRender);
        for (let i = storedObject[`step${stepNumber}`].previousStep; i <= stepNumber; i++) {
            delete storedObject[`step${i}`]?.data;
        }
        storedObject.currentStep = storedObject[`step${stepNumber}`].previousStep;
        storage.set(process, JSON.stringify(storedObject));
    };

    //ValidateRoundPicking-1b: fetch front API
    const [fetchResult, setFetchResult] = useState<any>();
    useEffect(() => {
        const fetchData = async () => {
            const res = await fetch(`/api/preparation-management/validateRoundPicking/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    proposedRoundAdvisedAddress,
                    round,
                    articleInfos,
                    feature,
                    handlingUnit,
                    movingQuantity,
                    resType
                })
            });
            const response = await res.json();
            setFetchResult(response.response);
            if (!res.ok) {
                showError(t('messages:round-preparation-failed'));
                onBack();
                setHeaderContent(false);
            }
        };
        fetchData();
    }, []);

    //ValidateRoundPicking-2: record values in securedLS once validated
    useEffect(() => {
        if (fetchResult) {
            storage.remove(process);
            const storedObject = JSON.parse(storage.get(process) || '{}');

            if (fetchResult.updatedRoundAdvisedAddress) {
                const currentRoundAdvisedAddress =
                    fetchResult.updatedRoundAdvisedAddress.updateRoundAdvisedAddress;
                if (
                    currentRoundAdvisedAddress.status ==
                    configs.ROUND_ADVISED_ADDRESS_STATUS_TO_BE_VERIFIED
                ) {
                    const roundAdvisedAddresses =
                        fetchResult.updatedRoundLineDetail.updateRoundLineDetail.roundLine.round.roundAdvisedAddresses
                            .filter((raa: any) => raa.quantity != 0)
                            .sort((a: any, b: any) => {
                                return a.roundOrderId - b.roundOrderId;
                            });
                    if (roundAdvisedAddresses.length > 0) {
                        const data = {
                            proposedRoundAdvisedAddress: roundAdvisedAddresses[0],
                            round: fetchResult.updatedRoundLineDetail.updateRoundLineDetail
                                .roundLine.round
                        };
                        storedObject['currentStep'] = 20;
                        storedObject[`step10`] = { previousStep: 0, data };
                        storedObject[`step20`] = { previousStep: 10 };
                        storage.set(process, JSON.stringify(storedObject));
                    } else {
                        showSuccess(t('messages:round-picking-success'));
                    }
                } else {
                    const data = {
                        proposedRoundAdvisedAddress: currentRoundAdvisedAddress,
                        round: fetchResult.updatedRoundLineDetail.updateRoundLineDetail.roundLine
                            .round
                    };
                    storedObject['currentStep'] = 20;
                    storedObject[`step10`] = { previousStep: 0, data };
                    storedObject[`step20`] = { previousStep: 10 };
                    storage.set(process, JSON.stringify(storedObject));
                }
            }
            setTriggerRender(!triggerRender);
        }
    }, [fetchResult]);

    return <WrapperForm>{!fetchResult ? <ContentSpin /> : <></>}</WrapperForm>;
};
