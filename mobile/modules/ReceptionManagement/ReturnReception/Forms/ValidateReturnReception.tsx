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

export interface IValidateReturnReceptionProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    headerContent: { [label: string]: any };
}

export const ValidateReturnReceptionForm = ({
    process,
    stepNumber,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    headerContent: { setHeaderContent }
}: IValidateReturnReceptionProps) => {
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

    let originBlock: { [k: string]: any } = {};
    if (storedObject.step10?.data?.block) {
        originBlock = storedObject.step10.data.block;
    }
    let finalLocation: { [k: string]: any } = {};
    if (storedObject.step10?.data?.finalLocation) {
        finalLocation = storedObject.step10.data.finalLocation;
    }
    let purchaseOrder: { [k: string]: any } = {};
    if (storedObject.step20?.data?.purchaseOrder) {
        purchaseOrder = storedObject.step20.data.purchaseOrder;
    }
    let existingFinalHU: { [k: string]: any } = {};
    if (storedObject.step40?.data?.handlingUnit) {
        existingFinalHU = storedObject.step40.data.handlingUnit;
    }
    let resType: string;
    if (storedObject.step50?.data?.resType) {
        resType = storedObject.step50.data.resType;
    }
    let originHUC: { [k: string]: any } = {};
    if (storedObject.step50?.data?.handlingUnitContent) {
        originHUC = storedObject.step50.data.handlingUnitContent;
    }
    let feature: { [k: string]: any } = {};
    if (storedObject.step50?.data?.feature) {
        feature = storedObject.step50.data.feature;
    }
    let movingQuantity: number;
    if (storedObject.step60?.data?.movingQuantity) {
        movingQuantity = storedObject.step60.data.movingQuantity;
    }
    let stockOwner: { [k: string]: any } = {};
    if (storedObject.step70?.data?.stockOwner) {
        stockOwner = storedObject.step70.data.stockOwner;
    }
    let articleInfos: { [k: string]: any } = {};
    if (storedObject.step80?.data?.article) {
        articleInfos = storedObject.step80.data.article;
    }
    let featureCode: { [k: string]: any } = {};
    if (storedObject.step90?.data?.featureCode) {
        featureCode = storedObject.step90.data.featureCode;
    }

    //ValidateReturnReception-1a: fetch front API
    const onFinish = async () => {
        setIsLoading(true);
        const res = await fetch(`/api/reception-management/validateReturnReception/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                originBlock,
                finalLocation,
                purchaseOrder,
                movingQuantity,
                existingFinalHU,
                resType,
                originHUC,
                feature,
                stockOwner,
                articleInfos,
                featureCode
            })
        });
        if (res.ok) {
            const response = await res.json();
            storage.remove(process);
            const storedObject = JSON.parse(storage.get(process) || '{}');
            console.log('storedObjectAfterRemove', storedObject);

            if (response.response.updatedFinalHU) {
                console.log('response.response', response.response);

                const step10data = {
                    block: originBlock,
                    handlingUnitContents: originBlock.locations.flatMap((location: any) =>
                        location.handlingUnits.flatMap((hu: any) => hu.handlingUnitContents)
                    ),
                    finalLocation: response.response.retAlbiLocation
                };
                const step20data = {
                    purchaseOrder: response.response.updatedPO
                };
                const step30data = {
                    returnDate: purchaseOrder.orderDate
                };
                const step40data = {
                    handlingUnit: response.response.updatedFinalHU
                };
                console.log('step10data', step10data);
                console.log('step20data', step20data);
                console.log('step30data', step30data);
                console.log('step40data', step40data);
                storedObject[`step10`] = { previousStep: 0, data: step10data };
                storedObject[`step20`] = { previousStep: 10, data: step20data };
                storedObject[`step30`] = { previousStep: 20, data: step30data };
                storedObject[`step40`] = { previousStep: 30, data: step40data };
                storedObject[`step50`] = { previousStep: 40 };
                storedObject['currentStep'] = 50;
                storage.set(process, JSON.stringify(storedObject));
            }
            setTriggerRender(!triggerRender);
        } else {
            showError(t('messages:return-reception-failed'));
        }
        if (res) {
            setIsLoading(false);
        }
    };

    //ValidateReturnReception-1b: handle back to previous - previous step settings (specific since check is automatic)
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
