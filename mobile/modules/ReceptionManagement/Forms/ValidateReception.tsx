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

export interface IValidateReceptionProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    headerContent: { [label: string]: any };
}

export const ValidateReceptionForm = ({
    process,
    stepNumber,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    headerContent: { setHeaderContent }
}: IValidateReceptionProps) => {
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
    // retrieve values for update locations/contents and create movement
    const { step10, step15, step20, step40, step50, step65 } = storedObject;

    const handlingUnitInbound = step10?.data?.goodsIn?.handlingUnitInbound;
    const purchaseOrder = step10?.data?.goodsIn?.purchaseOrder;
    const handlingUnit = step15?.data?.handlingUnit;
    let articleInfo: { [k: string]: any } = {};
    let articleLuBarcodeId: string;
    if (storedObject.step20?.data?.articleLuBarcodes[0]) {
        articleInfo.articleId = storedObject.step20.data.articleLuBarcodes[0].articleId;
        articleInfo.articleName = storedObject.step20.data.articleLuBarcodes[0].article.name;
        articleInfo.stockOwnerId = storedObject.step20.data.articleLuBarcodes[0].stockOwnerId;
        articleInfo.stockOwnerName = storedObject.step20.data.articleLuBarcodes[0].stockOwner.name;
        articleLuBarcodeId = storedObject.step20.data.articleLuBarcodes[0].id;
    }
    const poLine = step20?.data?.matchingPoLine;
    const goodsInLine = step20?.data?.matchingHuContentInbound
        ? step20?.data?.matchingHuContentInbound
        : undefined;
    const remainQtyToReceive = step20?.data?.remainQtyToReceive;
    const stockStatus = step40?.data?.stockStatus;
    const movingQuantity = step50?.data?.movingQuantity;
    const receptionLocation = step65?.data?.chosenLocation;

    //ValidateReception-1a: fetch front API
    const onFinish = async () => {
        setIsLoading(true);
        const res = await fetch(`/api/reception-management/validateReception/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                handlingUnitInbound,
                purchaseOrder,
                handlingUnit,
                articleInfo,
                articleLuBarcodeId,
                poLine,
                goodsInLine,
                remainQtyToReceive,
                stockStatus,
                movingQuantity,
                receptionLocation
            })
        });
        if (res.ok) {
            // RESTART HERE to update the LS object just with step10 data
            const response = await res.json();

            storage.remove(process);
            showSuccess(t('messages:reception-success'));
            // setHeaderContent(false);
            if (response.response.updatedPo) {
                const storedObject: any = {};
                const data = { goodsIn: response.response.updatedPo };
                storedObject[`step10`] = { previousStep: 0 };
                storedObject['currentStep'] = 15;
                storedObject[`step10`] = { previousStep: 0, data };
                storedObject[`step15`] = { previousStep: 10 };
                storage.set(process, JSON.stringify(storedObject));
            }
            setTriggerRender(!triggerRender);
        } else {
            showError(t('messages:reception-failed'));
        }
        // const response = await res.json();
        if (res) {
            setIsLoading(false);
        }
    };

    //ValidateReception-1b: handle back to previous - previous step settings (specific since check is automatic)
    const onBack = () => {
        setTriggerRender(!triggerRender);
        for (
            let i =
                storedObject[`step${storedObject[`step${stepNumber}`].previousStep}`].previousStep;
            i <= stepNumber;
            i++
        ) {
            delete storedObject[`step${i}`]?.data;
        }
        storedObject.currentStep =
            storedObject[`step${storedObject[`step${stepNumber}`].previousStep}`].previousStep;
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
