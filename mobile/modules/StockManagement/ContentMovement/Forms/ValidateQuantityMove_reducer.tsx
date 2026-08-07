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
//SPECIFIC FOR QUANTITY MOVEMENT
//DESCRIPTION: retrieve information from the process state and validate them for database updates

import { WrapperForm, StyledForm, RadioButtons, ContentSpin } from '@components';
import { showError, showSuccess, getStockOwnerIdFromArticleLuBarcode } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { useEffect, useState } from 'react';

export interface IValidateQuantityMoveReducerProps {
    processName: string;
    stepNumber: number;
    buttons?: { [label: string]: any };
    headerContent: { [label: string]: any };
    formToUse?: any;
}

export const ValidateQuantityMoveForm_reducer = ({
    processName,
    stepNumber,
    buttons,
    headerContent: { setHeaderContent },
    formToUse
}: IValidateQuantityMoveReducerProps) => {
    const { t } = useTranslation('common');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const { graphqlRequestClient } = useAuth();
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};

    // TYPED SAFE ALL
    //Pre-requisite: initialize current step
    useEffect(() => {
        if (storedObject.currentStep < stepNumber) {
            //check workflow direction and assign current step accordingly
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: `step${stepNumber}`,
                object: { previousStep: storedObject.currentStep },
                customFields: [{ key: 'currentStep', value: stepNumber }]
            });
        }
    }, []);

    // retrieve values for update locations/contents and create movement
    let originalLocation: { [k: string]: any } = {};
    if (storedObject.step15?.data?.chosenLocation) {
        originalLocation.id = storedObject.step15.data.chosenLocation.id;
        originalLocation.name = storedObject.step15.data.chosenLocation.name;
    }
    let articleInfo: { [k: string]: any } = {};
    let articleLuBarcodeId: string;
    if (storedObject.step35?.data?.chosenArticleLuBarcode) {
        articleInfo.id = storedObject.step35.data.chosenArticleLuBarcode.articleId;
        articleInfo.name = storedObject.step35.data.chosenArticleLuBarcode.article
            ? storedObject.step35.data.chosenArticleLuBarcode.article.name
            : storedObject.step35.data.chosenArticleLuBarcode.name;
        articleInfo.stockOwnerId = getStockOwnerIdFromArticleLuBarcode(
            storedObject.step35.data.chosenArticleLuBarcode
        );
        articleInfo.stockOwner = {
            name:
                storedObject.step35.data.chosenArticleLuBarcode.stockOwner?.name ??
                storedObject.step35.data.chosenArticleLuBarcode.articleLu?.stockOwner?.name ??
                storedObject.step35.data.chosenArticleLuBarcode.article?.stockOwner?.name ??
                undefined
        };
        articleLuBarcodeId = storedObject.step35.data.chosenArticleLuBarcode.id ?? undefined;
    }
    let feature: { [k: string]: any } = {};
    if (storedObject.step30?.data?.feature) {
        feature = storedObject.step30.data.feature;
    }
    if (storedObject.step40?.data?.chosenContent) {
        let originalContent: { [label: string]: any } | null;
        originalContent = {
            id: storedObject.step40.data.chosenContent.id,
            quantity: storedObject.step40.data.chosenContent.quantity,
            stockStatus: storedObject.step40.data.chosenContent.stockStatus,
            reservation: storedObject.step40.data.chosenContent.reservation,
            articleId: storedObject.step40.data.chosenContent.articleId,
            article: { name: storedObject.step40.data.chosenContent.article?.name },
            stockOwnerId:
                storedObject.step30.data.resType === 'serialNumber'
                    ? storedObject.step30.data.feature.handlingUnitContent.stockOwnerId
                    : storedObject.step40.data.chosenContent.stockOwnerId,
            stockOwner: {
                name:
                    storedObject.step30.data.resType === 'serialNumber'
                        ? storedObject.step30.data.feature.handlingUnitContent.stockOwner?.name
                        : storedObject.step40.data.chosenContent.stockOwner?.name
            },
            handlingUnitContentFeatures:
                storedObject.step40.data.chosenContent.handlingUnitContentFeatures
        };
        if (storedObject.step40.data.chosenContent.handlingUnit) {
            let originalHu: { [label: string]: any } | null;
            originalHu = {
                id: storedObject.step40.data.chosenContent.handlingUnitId,
                name: storedObject.step40.data.chosenContent.handlingUnit.name,
                category: storedObject.step40.data.chosenContent.handlingUnit.category,
                code: storedObject.step40.data.chosenContent.handlingUnit.code,
                type: storedObject.step40.data.chosenContent.handlingUnit.type
            };
            originalLocation['originalHu'] = originalHu;
        }
        originalLocation['originalContent'] = originalContent;
    }
    let movingQuantity: number;
    if (storedObject.step50?.data?.movingQuantity) {
        movingQuantity = storedObject.step50.data.movingQuantity;
    }
    let finalLocation: { [k: string]: any } = {};
    if (storedObject.step65?.data?.chosenLocation) {
        finalLocation = storedObject.step65.data.chosenLocation;
    }
    let finalHandlingUnit: { [k: string]: any } = {};
    if (storedObject.step70?.data?.finalHandlingUnit) {
        finalHandlingUnit = storedObject.step70.data.finalHandlingUnit;
    }
    let isHuToCreate = false;
    if (storedObject.step70?.data?.isHuToCreate) {
        isHuToCreate = storedObject.step70.data.isHuToCreate;
    }

    //ValidateQuantityMove-1a: launch the backend movement validation
    const onFinish = async () => {
        setIsLoading(true);
        const inputToValidate = {
            originalLocation,
            articleInfo,
            articleLuBarcodeId,
            movingQuantity,
            finalLocation,
            finalHandlingUnit,
            isHuToCreate,
            feature
        };

        const query = gql`
            mutation executeFunction($functionName: String!, $event: JSON!) {
                executeFunction(functionName: $functionName, event: $event) {
                    status
                    output
                }
            }
        `;

        const variables = {
            functionName: 'RF_handling_unit_content_movement_validate',
            event: {
                input: inputToValidate
            }
        };
        try {
            const validateHuMove = await graphqlRequestClient.request(query, variables);
            if (validateHuMove.executeFunction.status === 'ERROR') {
                showError(validateHuMove.executeFunction.output);
            } else if (
                validateHuMove.executeFunction.status === 'OK' &&
                validateHuMove.executeFunction.output.status === 'KO'
            ) {
                showError(t(`errors:${validateHuMove.executeFunction.output.output.code}`));
                console.log('Backend_message', validateHuMove.executeFunction.output.output);
            } else {
                showSuccess(t('messages:movement-success'));
                dispatch({
                    type: 'DELETE_RF_PROCESS',
                    processName
                });
                setHeaderContent(false);
            }
            setIsLoading(false);
        } catch (error) {
            showError(t('messages:error-executing-function'));
            console.log('executeFunctionError', error);
            setIsLoading(false);
        }
    };

    //ValidateQuantityMove-1b: handle back to previous step settings
    const onBack = () => {
        dispatch({
            type: 'ON_BACK',
            processName,
            stepToReturn: `step${storedObject[`step${stepNumber}`].previousStep}`
        });
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
                    form={formToUse}
                >
                    <RadioButtons input={{ ...buttons }} output={{ onBack }}></RadioButtons>
                </StyledForm>
            ) : (
                <ContentSpin />
            )}
        </WrapperForm>
    );
};
