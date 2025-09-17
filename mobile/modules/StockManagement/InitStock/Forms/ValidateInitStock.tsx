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

//SPECIFIC FOR INIT STOCK
//DESCRIPTION: retrieve information from local storage and validate them for database updates
import { WrapperForm, StyledForm, RadioButtons, ContentSpin } from '@components';
import { showError, showSuccess, LsIsSecured } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';

export interface IValidateInitStockProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    headerContent: { [label: string]: any };
    triggerAlternativeSubmit1?: any;
}

export const ValidateInitStockForm = ({
    process,
    stepNumber,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    triggerAlternativeSubmit1,
    headerContent: { setHeaderContent }
}: IValidateInitStockProps) => {
    const { t } = useTranslation('common');
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const { graphqlRequestClient } = useAuth();

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
    // retrieve values for update contents/boxline and create movement
    const { step10, step20, step30, step50, step60, step70, step80, step90, step110 } =
        storedObject;

    const isHuToCreate = step20?.data?.isHuToCreate;
    const locations = step10?.data?.locations;
    const handlingUnit = step20?.data?.handlingUnit;
    const huModel = step30?.data?.handlingUnitModel;
    let articleInfo: { [k: string]: any } = {};
    if (step50?.data?.chosenArticleLuBarcode) {
        articleInfo.articleId = step50?.data?.chosenArticleLuBarcode.articleId;
        articleInfo.articleName = step50?.data?.chosenArticleLuBarcode.article.name;
    }
    const stockOwner = step50?.data?.chosenArticleLuBarcode.stockOwnerId;
    const features = step60?.data?.processedFeatures;
    const movingQuantity = step70?.data?.movingQuantity;
    const stockStatus = step80?.data?.stockStatus?.key;
    const reservation = step90?.data?.reservation;
    const comment = step110?.data?.comment;

    //ValidateInitStock
    const onFinish = async () => {
        const inputToValidate = {
            locations,
            handlingUnit,
            huModel,
            isHuToCreate,
            stockOwner,
            articleInfo,
            movingQuantity,
            stockStatus,
            reservation,
            features,
            comment
        };

        setIsLoading(true);
        const query = gql`
            mutation executeFunction($functionName: String!, $event: JSON!) {
                executeFunction(functionName: $functionName, event: $event) {
                    status
                    output
                }
            }
        `;

        const variables = {
            functionName: 'RF_init_stock_validate',
            event: {
                input: inputToValidate
            }
        };
        try {
            const validateInitStockResult = await graphqlRequestClient.request(query, variables);
            if (validateInitStockResult.executeFunction.status === 'ERROR') {
                showError(validateInitStockResult.executeFunction.output);
            } else if (
                validateInitStockResult.executeFunction.status === 'OK' &&
                validateInitStockResult.executeFunction.output.status === 'KO'
            ) {
                showError(
                    t(`errors:${validateInitStockResult.executeFunction.output.output.code}`)
                );
                console.log(
                    'Backend_message',
                    validateInitStockResult.executeFunction.output.output
                );
            } else {
                storage.remove(process);
                showSuccess(t('messages:init-stock-success'));
                const storedObject: any = {};

                storage.set(process, JSON.stringify(storedObject));
                setTriggerRender(!triggerRender);
            }
            setIsLoading(false);
        } catch (error) {
            showError(t('messages:error-executing-function'));
            console.log('executeFunctionError', error);
            setIsLoading(false);
        }
    };

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
                    style={{
                        display: triggerAlternativeSubmit1?.triggerAlternativeSubmit1
                            ? 'none'
                            : 'block'
                    }}
                >
                    <RadioButtons
                        input={{
                            ...buttons,
                            triggerAlternativeSubmit1:
                                triggerAlternativeSubmit1?.triggerAlternativeSubmit1
                        }}
                        output={{
                            setTriggerAlternativeSubmit1:
                                triggerAlternativeSubmit1?.setTriggerAlternativeSubmit1,
                            onBack
                        }}
                        alternativeSubmitLabel1={t('common:comment')}
                    ></RadioButtons>
                </StyledForm>
            ) : (
                <ContentSpin />
            )}
        </WrapperForm>
    );
};
