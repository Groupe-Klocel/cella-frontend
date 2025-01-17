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
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useState } from 'react';
import configs from '../../../../../common/configs.json';
import { useListParametersForAScopeQuery } from 'generated/graphql';
import { useAuth } from 'context/AuthContext';

export interface IValidateCycleCountMovementProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    headerContent: { [label: string]: any };
}

export const ValidateCycleCountMovementForm = ({
    process,
    stepNumber,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    headerContent: { setHeaderContent }
}: IValidateCycleCountMovementProps) => {
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

    let cycleCount: { [k: string]: any } = {};
    if (storedObject.step10.data.cycleCount) {
        const { id, type } = storedObject.step10.data.cycleCount;
        cycleCount = { id, type };
    }
    let currentCycleCountLine: { [k: string]: any } = {};
    if (storedObject.step10.data.currentCycleCountLine) {
        const { id, status } = storedObject.step10.data.currentCycleCountLine;
        currentCycleCountLine = { id, status };
    }
    let location: { [k: string]: any } = {};
    if (storedObject.step20.data.location) {
        const { id, name } = storedObject.step20.data.location;
        location = { id, name };
    }
    let handlingUnit: { [k: string]: any } = {};
    if (storedObject.step30.data.handlingUnit) {
        const { id, name, parentHandlingUnit } = storedObject.step30.data.handlingUnit;
        handlingUnit = { id, name, parentHandlingUnit: { name: parentHandlingUnit?.name } };
    }
    let isHuToCreate: boolean;
    if (storedObject.step30.data.isHuToCreate) {
        isHuToCreate = storedObject.step30.data.isHuToCreate;
    }
    if (storedObject.step30.data.huToCreate) {
        handlingUnit = storedObject.step30.data.huToCreate;
    }
    let handlingUnitContent: { [k: string]: any } = {};
    if (storedObject.step40.data.handlingUnitContent) {
        const { quantity } = storedObject.step40.data.handlingUnitContent;
        handlingUnitContent = { quantity };
    }
    let cycleCountMovement: { [k: string]: any } = {};
    if (storedObject.step40.data.currentCCMovement) {
        const { id, status } = storedObject.step40.data.currentCCMovement;
        cycleCountMovement = { id, status };
    }
    let feature: { [k: string]: any } = {};
    if (storedObject.step40.data.feature) {
        const { id, value } = storedObject.step40.data.feature;
        feature = { id, value };
    }
    let resType: string;
    if (storedObject.step40.data.resType) {
        resType = storedObject.step40.data.resType;
    }
    let expectedFeatures: any;
    if (storedObject.step40.data.expectedFeatures) {
        expectedFeatures = storedObject.step40.data.expectedFeatures;
    }
    let stockOwner: { [k: string]: any } = {};
    if (storedObject.step50.data.stockOwner) {
        stockOwner = storedObject.step50.data.stockOwner;
    }
    let article: { [k: string]: any } = {};
    if (storedObject.step55.data.article) {
        const { id, name } = storedObject.step55.data.article;
        article = { id, name };
    }
    let stockStatus: { [k: string]: any } = {};
    if (storedObject.step60.data.stockStatus) {
        const { key } = storedObject.step60.data.stockStatus;
        stockStatus = { key };
    }
    let featureCode: { [k: string]: any } = {};
    if (storedObject.step65.data.featureCode) {
        featureCode = storedObject.step65.data.featureCode;
    }
    let reviewedFeatures: any;
    if (storedObject.step70.data.reviewedFeatures) {
        reviewedFeatures = storedObject.step70.data.reviewedFeatures;
    }
    let quantity: number;
    if (storedObject.step80.data.movingQuantity) {
        quantity = storedObject.step80.data.movingQuantity;
    }

    //this handles the features modification
    const identifyModifiedFeatures = (expectedFeatures: any[], reviewedFeatures: any[]) => {
        const differences: { [key: string]: any }[] = [];

        expectedFeatures.forEach((expectedFeature, index) => {
            const modifiedFeature = reviewedFeatures[index];
            if (expectedFeature.value !== modifiedFeature.value) {
                differences.push(modifiedFeature);
            }
        });

        return differences.length > 0 ? differences : undefined;
    };

    let modifiedFeatures: any;
    if (expectedFeatures && reviewedFeatures && reviewedFeatures != 'none') {
        modifiedFeatures = identifyModifiedFeatures(expectedFeatures, reviewedFeatures);
    }

    //ValidateCycleCountMovement-1a: fetch front API
    const onFinish = async () => {
        setIsLoading(true);
        const res = await fetch(`/api/stock-management/validateCycleCountMovement/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cycleCount,
                currentCycleCountLine,
                cycleCountMovement,
                location,
                handlingUnit,
                isHuToCreate,
                handlingUnitContent,
                article,
                stockOwner,
                stockStatus,
                feature,
                featureCode,
                resType,
                quantity,
                modifiedFeatures
            })
        });
        if (res.ok) {
            const response = await res.json();
            const storedObject = JSON.parse(storage.get(process) || '{}');

            storage.remove(process);
            const newStoredObject = JSON.parse(storage.get(process) || '{}');
            console.log('storedObjectAfterRemove', storedObject);

            if (response.response.updatedCycleCountLine) {
                const updatedCCLine = response.response.updatedCycleCountLine;
                const updatedCCMovements =
                    response.response.updatedCycleCountLine?.cycleCountMovements;

                const step10Data = {
                    cycleCount: cycleCount,
                    currentCycleCountLine: updatedCCLine
                };
                newStoredObject['currentStep'] = 40;
                newStoredObject[`step10`] = { previousStep: 0, data: step10Data };
                newStoredObject[`step20`] = storedObject[`step20`];
                newStoredObject[`step25`] = storedObject[`step25`];
                newStoredObject[`step30`] = storedObject[`step30`];
                newStoredObject[`step40`] = {
                    previousStep: storedObject[`step40`].previousStep
                };
                storage.set(process, JSON.stringify(newStoredObject));
            }
            setTriggerRender(!triggerRender);
        } else {
            showError(t('messages:cycleCountMovement-validation-failed'));
        }
        if (res) {
            setIsLoading(false);
        }
    };

    //ValidateCycleCountMovement-1b: handle back to previous - previous step settings (specific since check is automatic)
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
