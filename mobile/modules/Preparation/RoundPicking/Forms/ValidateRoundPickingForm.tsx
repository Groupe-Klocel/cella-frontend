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

export interface IValidateRoundPickingProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    headerContent: { [label: string]: any };
}

export const ValidateRoundPickingForm = ({
    process,
    stepNumber,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    headerContent: { setHeaderContent }
}: IValidateRoundPickingProps) => {
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

    //ValidateRoundPicking-1a: fetch front API
    const onFinish = async () => {
        setIsLoading(true);
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
        if (res.ok) {
            const response = await res.json();

            storage.remove(process);
            const storedObject = JSON.parse(storage.get(process) || '{}');
            console.log('storedObjectAfterRemove', storedObject);

            if (response.response.updatedRoundAdvisedAddress) {
                const currentRoundAdvisedAddress =
                    response.response.updatedRoundAdvisedAddress.updateRoundAdvisedAddress;

                console.log('currentRoundAdvisedAddress', currentRoundAdvisedAddress);
                console.log('currentRoundAdvisedAddress.status', currentRoundAdvisedAddress.status);

                if (
                    currentRoundAdvisedAddress.status ==
                    configs.ROUND_ADVISED_ADDRESS_STATUS_TO_BE_VERIFIED
                ) {
                    const roundAdvisedAddresses =
                        response.response.updatedRoundLineDetail.updateRoundLineDetail.roundLine.round.roundAdvisedAddresses
                            .filter((raa: any) => raa.quantity != 0)
                            .sort((a: any, b: any) => {
                                return a.roundOrderId - b.roundOrderId;
                            });

                    console.log('roundAdvisedAddresses', roundAdvisedAddresses);

                    if (roundAdvisedAddresses.length > 0) {
                        const data = {
                            proposedRoundAdvisedAddress: roundAdvisedAddresses[0],
                            round: response.response.updatedRoundLineDetail.updateRoundLineDetail
                                .roundLine.round
                        };
                        console.log('data', data);
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
                        round: response.response.updatedRoundLineDetail.updateRoundLineDetail
                            .roundLine.round
                    };
                    console.log('data1', data);
                    storedObject['currentStep'] = 20;
                    storedObject[`step10`] = { previousStep: 0, data };
                    storedObject[`step20`] = { previousStep: 10 };
                    storage.set(process, JSON.stringify(storedObject));
                }
            }
            setTriggerRender(!triggerRender);
        } else {
            showError(t('messages:round-preparation-failed'));
        }
        if (res) {
            setIsLoading(false);
        }
    };

    //ValidateRoundPicking-1b: handle back to previous - previous step settings (specific since check is automatic)
    const onBack = () => {
        setTriggerRender(!triggerRender);
        for (let i = storedObject[`step${stepNumber}`].previousStep; i <= stepNumber; i++) {
            delete storedObject[`step${i}`]?.data;
        }
        storedObject.currentStep = storedObject[`step${stepNumber}`].previousStep;
        storage.set(process, JSON.stringify(storedObject));
    };

    return (
        <WrapperForm>
            {!isLoading ? (
                <StyledForm
                    name="basic"
                    layout="vertical"
                    onFinish={onFinish}
                    autoComplete="off"
                    scrollToFirstError
                    size="small"
                >
                    <RadioButtons input={{ ...buttons }} output={{ onBack }}></RadioButtons>
                </StyledForm>
            ) : (
                <ContentSpin />
            )}
        </WrapperForm>
    );
};
