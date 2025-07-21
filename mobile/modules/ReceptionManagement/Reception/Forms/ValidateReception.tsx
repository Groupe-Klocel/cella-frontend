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
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useState } from 'react';
import parameters from '../../../../../common/parameters.json';
import { useRouter } from 'next/router';

export interface IValidateReceptionProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    headerContent: { [label: string]: any };
    triggerAlternativeSubmit1?: any;
    isHuScannedAtEnd?: boolean;
}

export const ValidateReceptionForm = ({
    process,
    stepNumber,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    triggerAlternativeSubmit1,
    isHuScannedAtEnd
}: IValidateReceptionProps) => {
    const { t } = useTranslation('common');
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const { graphqlRequestClient } = useAuth();
    const [isHuToBeClosed, setIsHuToBeClosed] = useState<boolean>(false);
    const router = useRouter();
    const { receptionType } = router.query;

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
    const { comment, step10, step20, step30, step50, step60, step70, step80, step100, step110 } =
        storedObject;

    const purchaseOrder = step10?.data?.purchaseOrder;
    const goodsIn = step20?.data?.chosenGoodsIn;
    const isHuToCreate =
        (step30?.data?.isHuToCreate && step110?.data?.handlingUnit !== 'noHuManagement') ??
        step110?.data?.isHuToCreate;
    let articleInfo: { [k: string]: any } = {};
    if (step50?.data?.chosenArticleLuBarcode) {
        articleInfo.articleId = step50?.data?.chosenArticleLuBarcode.articleId;
        articleInfo.articleName = step50?.data?.chosenArticleLuBarcode.article.name;
    }
    const poLines = step80?.data?.updatedPoLines;
    const isNewProductToUpdate = step50?.data?.isNewProductToUpdate;
    const features = step60?.data?.processedFeatures;
    const receivedQuantity = step80?.data?.movingQuantity;
    const receptionLocation = step100?.data?.chosenLocation;
    const stockStatus = step70?.data?.stockStatus?.key;

    //determine which HU has to be taken
    const handlingUnit =
        step30?.data?.handlingUnit === 'huScannedAtEnd'
            ? step110?.data?.handlingUnit
            : step30?.data?.handlingUnit;

    //ValidateReception-1a: fetch front API
    const onFinish = async () => {
        const inputToValidate = {
            purchaseOrder,
            goodsIn,
            isHuToCreate,
            handlingUnit,
            isHuToBeClosed,
            stockStatus,
            articleInfo,
            poLines,
            receivedQuantity,
            features,
            isNewProductToUpdate,
            receptionLocation,
            receptionType,
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
            functionName: 'RF_reception_validate',
            event: {
                input: inputToValidate
            }
        };
        try {
            const validateReceptionResult = await graphqlRequestClient.request(query, variables);
            if (validateReceptionResult.executeFunction.status === 'ERROR') {
                showError(validateReceptionResult.executeFunction.output);
            } else if (
                validateReceptionResult.executeFunction.status === 'OK' &&
                validateReceptionResult.executeFunction.output.status === 'KO'
            ) {
                showError(
                    t(`errors:${validateReceptionResult.executeFunction.output.output.code}`)
                );
                console.log(
                    'Backend_message',
                    validateReceptionResult.executeFunction.output.output
                );
            } else {
                storage.remove(process);
                showSuccess(t('messages:reception-success'));
                const storedObject: any = {};
                const { final_goodsIn, final_handling_unit, final_po, po_rounds } =
                    validateReceptionResult.executeFunction.output.output;
                const step10Data = {
                    purchaseOrder: {
                        ...final_po,
                        purchaseOrderLines: final_po.purchaseOrderLines.map((line: any) => ({
                            ...line,
                            blockingStatusText: purchaseOrder.purchaseOrderLines.find(
                                (linePo: any) => linePo.blockingStatus === line.blockingStatus
                            ).blockingStatusText
                        }))
                    },
                    goodsIns: po_rounds,
                    responseType: 'goodsIn'
                };
                const step20Data = { chosenGoodsIn: final_goodsIn };
                const step30Data = {
                    handlingUnit: final_handling_unit,
                    isHuToCreate: false
                };

                storedObject[`step10`] = { previousStep: 0, data: step10Data };
                storedObject[`step20`] = { data: step20Data };
                storedObject['currentStep'] =
                    final_handling_unit.category === parameters.HANDLING_UNIT_CATEGORY_INBOUND ||
                    isHuScannedAtEnd
                        ? 40
                        : 30;
                isHuScannedAtEnd
                    ? ((storedObject[`step30`] = {
                          data: { handlingUnit: 'huScannedAtEnd' }
                      }),
                      (storedObject[`step40`] = {
                          previousStep: 10
                      }))
                    : final_handling_unit.category === parameters.HANDLING_UNIT_CATEGORY_INBOUND
                      ? (storedObject[`step30`] = {
                            previousStep: 10,
                            data: step30Data
                        })
                      : (storedObject[`step30`] = {
                            previousStep: 10
                        });
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

    //Set hu to stock when button is clicked then trigger onFinish
    useEffect(() => {
        if (triggerAlternativeSubmit1.triggerAlternativeSubmit1) {
            setIsHuToBeClosed(true);
        }
    }, [triggerAlternativeSubmit1]);

    useEffect(() => {
        if (isHuToBeClosed) {
            onFinish();
            triggerAlternativeSubmit1.setTriggerAlternativeSubmit1(false);
        }
    }, [isHuToBeClosed]);

    //ValidateReception-1b: handle back to previous - previous step settings (specific since check is automatic)
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
                    <RadioButtons
                        input={{ ...buttons, ...triggerAlternativeSubmit1 }}
                        alternativeSubmitLabel1={t('common:validate-and-finish-hu')}
                        output={{
                            setTriggerAlternativeSubmit1:
                                triggerAlternativeSubmit1.setTriggerAlternativeSubmit1,
                            onBack
                        }}
                    ></RadioButtons>
                </StyledForm>
            ) : (
                <ContentSpin />
            )}
        </WrapperForm>
    );
};
