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
import { PageContentWrapper, NavButton } from '@components';
import MainLayout from 'components/layouts/MainLayout';
import { FC, useEffect, useState } from 'react';
import { HeaderContent, RadioInfosHeader } from '@components';
import {
    ButtonManagementType,
    HeaderManagementType,
    applyRfActionButtonsConfig,
    buildHeaderDisplay,
    showError,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { Form, Space } from 'antd';
import { ArrowLeftOutlined, UndoOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import { UpperMobileSpinner } from 'components/common/dumb/Spinners/UpperMobileSpinner';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { EnterQuantity_reducer } from '@CommonRadio';
import { SelectPrinter } from 'modules/Preparation/Pack/Forms/SelectPrinter_Reducer';
import { SelectActionForm } from 'modules/Preparation/ManualRepacking/Forms/SelectActionForm';
import { ReviewHuModelWeightForm } from 'modules/Preparation/ManualRepacking/Forms/ReviewHuModelWeightForm';
import { ConfirmOriginalBoxDeletionForm } from 'modules/Preparation/ManualRepacking/Forms/ConfirmOriginalBoxDeletionForm';
import { AutoValidateSplitProductForm } from 'modules/Preparation/ManualRepacking/Forms/AutoValidateSplitProduct';
import { AutoValidateNewBoxForm } from 'modules/Preparation/ManualRepacking/Forms/AutoValidateNewBox';
import { AutoValidateOriginalBoxForm } from 'modules/Preparation/ManualRepacking/Forms/AutoValidateOriginalBox';
import { AutoValidateConsolidationForm } from 'modules/Preparation/ManualRepacking/Forms/AutoValidateConsolidation';
import { ScanBox } from 'modules/Preparation/ManualRepacking/PagesContainer/ScanBox';
import { ScanProduct } from 'modules/Preparation/ManualRepacking/PagesContainer/ScanProduct';
import { ScanBoxToConsolidate } from 'modules/Preparation/ManualRepacking/PagesContainer/ScanBoxToConsolidate';
import { BoxChecks } from 'modules/Preparation/ManualRepacking/ChecksAndRecords/BoxChecks';
import { ProductChecks } from 'modules/Preparation/ManualRepacking/ChecksAndRecords/ProductChecks';
import { QuantityChecks } from 'modules/Preparation/ManualRepacking/ChecksAndRecords/QuantityChecks';
import { BoxToConsolidateChecks } from 'modules/Preparation/ManualRepacking/ChecksAndRecords/BoxToConsolidateChecks';
import { ReviewHuModelWeightChecks } from 'modules/Preparation/ManualRepacking/ChecksAndRecords/ReviewHuModelWeightChecks';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';
import { RadioButtonWrapper } from 'helpers/utils/radioButtonWrapper';

type PageComponent = FC & { layout: typeof MainLayout };

const ManualRepacking: PageComponent = () => {
    //#region Common variables
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const { parameters } = useAppState();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [finishBoxLoading, setFinishBoxLoading] = useState<boolean>(false);
    const [nextAction, setNextAction] = useState<'anotherBox' | 'finishPacking' | null>(null);

    const processName = 'manualRepacking';

    // 10 -> printer selection
    // 20 -> scan box (original box)
    // 30 -> action selection (split | consolidation)
    // Split:
    // 40 -> scan product
    // 50 -> enter quantity
    // 55 -> autovalidate product move (loop back to 40)
    // 60 -> packaging + actual weight (new box) [buttons: another box | finish packing]
    //       ("another box" is hidden once the original box has been emptied)
    // 65 -> autovalidate new box closure
    // 70 -> packaging + actual weight (original box), or, when its whole content has been moved
    //       to new boxes, message that the empty original box is going to be deleted
    // 75 -> autovalidate original box closure, or deletion of the emptied original box (END)
    // Consolidation:
    // 80 -> scan box(s) to consolidate [button: finish packing]
    // 90 -> packaging + actual weight (new box)
    // 95 -> autovalidate consolidation (END)
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    const [form] = Form.useForm();

    console.log(`${processName}`, storedObject);
    //#endregion

    //#region extract data & checks
    const originalBox = storedObject?.step20?.data?.originalBox;
    const action = storedObject?.step30?.data?.action;
    const createdBox = storedObject?.createdBox;
    const consolidatedBoxes = storedObject?.consolidatedBoxes ?? [];
    // split: theoretical weights computed and carrier reset done, new box being closed
    const isBoxFinished = storedObject?.isBoxFinished ?? false;
    // split: new box closed (label printed), original box being closed
    const isNewBoxClosed = storedObject?.isNewBoxClosed ?? false;

    // split: whole content of the original box moved to new boxes. Once the box being filled is
    // finished, the original box is deleted instead of being closed (nothing left to move either)
    const isOriginalBoxEmpty =
        action === 'split' &&
        isBoxFinished &&
        !!originalBox &&
        !(originalBox.handlingUnitContentOutbounds ?? []).some(
            (huco: any) => huco.pickedQuantity > 0
        );

    const scannedArticle = storedObject?.step40?.data?.article;
    const originalHuco = storedObject?.step40?.data?.originalHuco;
    const availableQuantity = originalHuco?.pickedQuantity;
    const movingQuantity = storedObject?.step50?.data?.movingQuantity;
    //#endregion

    //#region RadioInfosHeader settings
    // Carrier - shipping mode ("Transporteur – Mode d'expédition"), e.g. "CHRONOPOST - 01"
    const carrierShippingMode = originalBox?.carrierShippingMode;
    const carrierDisplay = carrierShippingMode
        ? `${carrierShippingMode.carrier?.name ?? ''}${
              carrierShippingMode.shippingMode ? ` - ${carrierShippingMode.shippingMode}` : ''
          }`
        : undefined;

    // Declarative header configuration (mirrors buttonManagement). Order = display order.
    const headerManagement: HeaderManagementType = [
        {
            label: t('common:printer'),
            value: storedObject['step10']?.data?.printers?.value,
            visible: !!storedObject['step10']?.data?.printers
        },
        {
            // Original box emphasized (bold): it drives the whole repacking flow
            label: t('common:box'),
            value: originalBox?.name,
            visible: !!originalBox,
            bold: true
        },
        {
            label: t('common:delivery'),
            value: originalBox?.delivery?.name,
            visible: !!originalBox?.delivery
        },
        {
            label: t('common:carrier'),
            value: carrierDisplay,
            visible: !!carrierDisplay
        },
        {
            label: t('common:action'),
            value: action ? t(`actions:${action}`) : undefined,
            visible: !!action
        },
        {
            // Split: box being created, highlighted while products are moved into it
            label: t('common:new-box'),
            value: createdBox?.name,
            visible: !!createdBox && action === 'split' && storedObject.currentStep < 70,
            highlight: true
        },
        {
            label: t('common:article-description'),
            value: scannedArticle?.description,
            visible: !!scannedArticle
        },
        {
            label: t('common:supplier-article-code'),
            value: scannedArticle?.genericArticleComment,
            visible: !!scannedArticle?.genericArticleComment
        },
        {
            // Quantity of the scanned product still available in the original box
            label: t('common:available-quantity'),
            value: availableQuantity,
            visible: availableQuantity !== undefined && !movingQuantity,
            highlight: true
        },
        {
            label: t('common:quantity_abbr'),
            value: movingQuantity ? `${movingQuantity}/${availableQuantity}` : undefined,
            visible: !!movingQuantity
        },
        {
            // Consolidation: number of scanned boxes
            label: t('common:scanned-boxes'),
            value: consolidatedBoxes.length,
            visible: action === 'consolidation',
            highlight: true
        }
    ];

    // Build the displayed object from the declarative configuration
    const headerDisplay = buildHeaderDisplay(headerManagement);
    //#endregion

    //#region global buttons
    const onReset = () => {
        dispatch({
            type: 'DELETE_RF_PROCESS',
            processName
        });
        setNextAction(null);
        form.resetFields();
    };

    const previousPage = () => {
        dispatch({
            type: 'DELETE_RF_PROCESS',
            processName
        });
        setNextAction(null);
        form.resetFields();
        router.back();
    };

    const onBack = () => {
        // Step 60 (split): the generic ON_BACK cannot be used since steps 40/50 were consumed by
        // the product loop; return to the product scan instead (the new box is not closed yet)
        if (action === 'split' && isBoxFinished && !isNewBoxClosed) {
            dispatch({
                type: 'UPDATE_BY_PROCESS',
                processName,
                object: {
                    currentStep: 30,
                    step10: storedObject['step10'],
                    step20: storedObject['step20'],
                    step30: storedObject['step30'],
                    createdBox,
                    isBoxFinished: false
                }
            });
            form.resetFields();
            return;
        }
        dispatch({
            type: 'ON_BACK',
            processName,
            stepToReturn: `step${storedObject[`step${storedObject.currentStep}`].previousStep}`
        });
        form.resetFields();
    };
    //#endregion

    //#region specific functions
    // "Finish box" (split, step 40): back-end theoretical weight calculation (original +
    // created boxes) and reset of the original box carrier infos (carrierBox,
    // carrierTracking, carrierTrackingUrl), then move to the new box closure (step 60)
    const onFinishBox = async () => {
        if (!createdBox) {
            return;
        }
        setFinishBoxLoading(true);
        const query = gql`
            mutation executeFunction($functionName: String!, $event: JSON!) {
                executeFunction(functionName: $functionName, event: $event) {
                    status
                    output
                }
            }
        `;
        const variables = {
            functionName: 'RF_manualRepacking',
            event: {
                input: {
                    action: 'finishBox',
                    originalHuoId: originalBox?.id,
                    newHuoId: createdBox?.id
                }
            }
        };
        try {
            const finishBoxResult = await graphqlRequestClient.request(query, variables);
            if (finishBoxResult.executeFunction.status === 'ERROR') {
                showError(finishBoxResult.executeFunction.output);
            } else if (
                finishBoxResult.executeFunction.status === 'OK' &&
                finishBoxResult.executeFunction.output.status === 'KO'
            ) {
                showError(t(`errors:${finishBoxResult.executeFunction.output.output.code}`));
                console.log('Backend_message', finishBoxResult.executeFunction.output.output);
            } else {
                const { originalBox: updatedOriginalBox, newBox } =
                    finishBoxResult.executeFunction.output.output;
                dispatch({
                    type: 'UPDATE_BY_PROCESS',
                    processName,
                    object: {
                        currentStep: 40,
                        step10: storedObject['step10'],
                        step20: {
                            ...storedObject['step20'],
                            data: {
                                ...storedObject['step20']?.data,
                                originalBox: updatedOriginalBox ?? originalBox
                            }
                        },
                        step30: storedObject['step30'],
                        createdBox: newBox ?? createdBox,
                        isBoxFinished: true
                    }
                });
                form.resetFields();
            }
        } catch (error) {
            showError(t('messages:error-executing-function'));
            console.log('executeFunctionError', error);
        } finally {
            setFinishBoxLoading(false);
        }
    };

    // "Finish packing" (consolidation, step 80): record the scanned boxes and move to the
    // packaging + actual weight step (step 90)
    const onFinishConsolidationScan = () => {
        if (consolidatedBoxes.length === 0) {
            showError(t('messages:no-box-to-consolidate'));
            return;
        }
        dispatch({
            type: 'UPDATE_BY_STEP',
            processName,
            stepName: 'step80',
            object: {
                ...storedObject['step80'],
                data: { consolidatedBoxes }
            }
        });
        form.resetFields();
    };
    //#endregion

    //#region module buttons
    const buttonManagement: ButtonManagementType = [
        {
            key: 'submit',
            label: t('actions:submit'),
            visibleOnSteps: [10, 20, 40, 50, 70, 80, 90],
            onClick: () => form.submit(),
            position: 'bottom'
        },
        {
            key: 'finish-box',
            label: t('actions:finish-box'),
            visibleOnSteps: [40],
            permissionsToSeeTheButton: !!createdBox && !isBoxFinished,
            onClick: () => {
                onFinishBox();
            },
            position: 'top',
            style: {
                background: 'radial-gradient(circle, #ff8a1ce8 5%, #f4a261 100%)'
            }
        },
        {
            key: 'another-box',
            label: t('actions:another-box'),
            visibleOnSteps: [60],
            permissionsToSeeTheButton: !isOriginalBoxEmpty,
            onClick: () => {
                setNextAction('anotherBox');
                form.submit();
            },
            position: 'bottom'
        },
        {
            key: 'finish-packing',
            label: t('actions:finish-packing'),
            visibleOnSteps: [60],
            onClick: () => {
                setNextAction('finishPacking');
                form.submit();
            },
            position: 'bottom'
        },
        {
            key: 'finish-packing-consolidation',
            label: t('actions:finish-packing'),
            visibleOnSteps: [80],
            permissionsToSeeTheButton: consolidatedBoxes.length > 0,
            onClick: () => {
                onFinishConsolidationScan();
            },
            position: 'top',
            style: {
                background: 'radial-gradient(circle, #ff8a1ce8 5%, #f4a261 100%)'
            }
        },
        {
            key: 'back',
            label: t('actions:back'),
            visibleOnSteps: [20, 30, 40, 50, 60, 80, 90],
            permissionsToSeeTheButton: true,
            onClick: () => {
                onBack();
            },
            position: 'bottom'
        }
    ];

    // Apply configurable order/color to any button (matched by its `key`) from the
    // 'RF_PREPARATION_ACTION_BUTTONS' parameter extras; keeps base behaviour when unset.
    const orderedButtonManagement = applyRfActionButtonsConfig(buttonManagement, parameters);
    //#endregion

    //#region reset form on step change
    useEffect(() => {
        form.resetFields();
    }, [storedObject.currentStep]);
    //#endregion

    //#region RETURN
    return (
        <PageContentWrapper>
            <HeaderContent
                title={t('common:manual-repacking')}
                actionsRight={
                    <Space>
                        {storedObject.currentStep > 10 ? (
                            <NavButton icon={<UndoOutlined />} onClick={onReset}></NavButton>
                        ) : (
                            <></>
                        )}
                        <NavButton icon={<ArrowLeftOutlined />} onClick={previousPage}></NavButton>
                    </Space>
                }
            />
            {Object.keys(headerDisplay).length === 0 ? (
                <></>
            ) : (
                <RadioInfosHeader
                    input={{
                        displayed: headerDisplay
                    }}
                ></RadioInfosHeader>
            )}
            {isLoading || finishBoxLoading ? (
                <UpperMobileSpinner></UpperMobileSpinner>
            ) : (
                <RadioButtonWrapper
                    buttonManagement={orderedButtonManagement}
                    currentStep={storedObject.currentStep}
                >
                    {/* Step 10: printer selection */}
                    {!storedObject['step10']?.data ? (
                        <SelectPrinter
                            processName={processName}
                            ruleName="manualRepacking"
                            stepNumber={10}
                            formToUse={form}
                        ></SelectPrinter>
                    ) : (
                        <></>
                    )}
                    {/* Step 20: scan box */}
                    {storedObject['step10']?.data && !storedObject['step20']?.data ? (
                        <ScanBox
                            processName={processName}
                            stepNumber={20}
                            label={t('common:box-hu')}
                            checkComponent={(data: any) => <BoxChecks dataToCheck={data} />}
                            formToUse={form}
                        ></ScanBox>
                    ) : (
                        <></>
                    )}
                    {/* Step 30: action selection (split | consolidation) */}
                    {storedObject['step20']?.data && !storedObject['step30']?.data ? (
                        <SelectActionForm processName={processName} stepNumber={30} />
                    ) : (
                        <></>
                    )}
                    {/* Step 40 (split): scan product */}
                    {action === 'split' && !storedObject['step40']?.data && !isBoxFinished ? (
                        <ScanProduct
                            processName={processName}
                            stepNumber={40}
                            label={t('common:article_abbr')}
                            originalBox={originalBox}
                            createdBox={createdBox}
                            checkComponent={(data: any) => <ProductChecks dataToCheck={data} />}
                            formToUse={form}
                        ></ScanProduct>
                    ) : (
                        <></>
                    )}
                    {/* Step 50 (split): enter quantity */}
                    {action === 'split' &&
                    storedObject['step40']?.data &&
                    !storedObject['step50']?.data &&
                    !isBoxFinished ? (
                        <EnterQuantity_reducer
                            processName={processName}
                            stepNumber={50}
                            label={t('common:quantity-var', {
                                number: `${availableQuantity ?? 0}`
                            })}
                            requiredMaxQuantity={availableQuantity ?? 0}
                            formToUse={form}
                            checkComponent={(data: any) => (
                                <QuantityChecks dataToCheck={{ ...data }} />
                            )}
                        ></EnterQuantity_reducer>
                    ) : (
                        <></>
                    )}
                    {/* Step 55 (split): move the product to the created box then loop to step 40 */}
                    {action === 'split' && storedObject['step50']?.data && !isBoxFinished ? (
                        <AutoValidateSplitProductForm
                            processName={processName}
                            stepNumber={55}
                            autoValidateLoading={{
                                isAutoValidateLoading: isLoading,
                                setIsAutoValidateLoading: setIsLoading
                            }}
                        ></AutoValidateSplitProductForm>
                    ) : (
                        <></>
                    )}
                    {/* Step 60 (split): packaging + actual weight (new box) */}
                    {action === 'split' &&
                    isBoxFinished &&
                    !isNewBoxClosed &&
                    !storedObject['step60']?.data ? (
                        <ReviewHuModelWeightForm
                            processName={processName}
                            stepNumber={60}
                            currentHuo={createdBox}
                            checkComponent={(data: any) => (
                                <ReviewHuModelWeightChecks dataToCheck={data} />
                            )}
                            formToUse={form}
                        ></ReviewHuModelWeightForm>
                    ) : (
                        <></>
                    )}
                    {/* Step 65 (split): close the new box (label printing + status update) */}
                    {action === 'split' &&
                    isBoxFinished &&
                    !isNewBoxClosed &&
                    storedObject['step60']?.data ? (
                        <AutoValidateNewBoxForm
                            processName={processName}
                            stepNumber={65}
                            nextAction={nextAction}
                            autoValidateLoading={{
                                isAutoValidateLoading: isLoading,
                                setIsAutoValidateLoading: setIsLoading
                            }}
                        ></AutoValidateNewBoxForm>
                    ) : (
                        <></>
                    )}
                    {/* Step 70 (split): packaging + actual weight (original box), or deletion
                        message when its whole content has been moved to new boxes */}
                    {action === 'split' &&
                    isNewBoxClosed &&
                    !storedObject['step70']?.data &&
                    isOriginalBoxEmpty ? (
                        <ConfirmOriginalBoxDeletionForm
                            processName={processName}
                            stepNumber={70}
                            formToUse={form}
                        ></ConfirmOriginalBoxDeletionForm>
                    ) : (
                        <></>
                    )}
                    {action === 'split' &&
                    isNewBoxClosed &&
                    !storedObject['step70']?.data &&
                    !isOriginalBoxEmpty ? (
                        <ReviewHuModelWeightForm
                            processName={processName}
                            stepNumber={70}
                            currentHuo={originalBox}
                            checkComponent={(data: any) => (
                                <ReviewHuModelWeightChecks dataToCheck={data} />
                            )}
                            formToUse={form}
                        ></ReviewHuModelWeightForm>
                    ) : (
                        <></>
                    )}
                    {/* Step 75 (split): close the original box, or delete it when emptied (END) */}
                    {action === 'split' && isNewBoxClosed && storedObject['step70']?.data ? (
                        <AutoValidateOriginalBoxForm
                            processName={processName}
                            stepNumber={75}
                            autoValidateLoading={{
                                isAutoValidateLoading: isLoading,
                                setIsAutoValidateLoading: setIsLoading
                            }}
                        ></AutoValidateOriginalBoxForm>
                    ) : (
                        <></>
                    )}
                    {/* Step 80 (consolidation): scan box(s) to consolidate */}
                    {action === 'consolidation' && !storedObject['step80']?.data ? (
                        <ScanBoxToConsolidate
                            processName={processName}
                            stepNumber={80}
                            label={t('common:box-to-consolidate')}
                            originalBox={originalBox}
                            checkComponent={(data: any) => (
                                <BoxToConsolidateChecks dataToCheck={data} />
                            )}
                            formToUse={form}
                        ></ScanBoxToConsolidate>
                    ) : (
                        <></>
                    )}
                    {/* Step 90 (consolidation): packaging + actual weight (new box) */}
                    {action === 'consolidation' &&
                    storedObject['step80']?.data &&
                    !storedObject['step90']?.data ? (
                        <ReviewHuModelWeightForm
                            processName={processName}
                            stepNumber={90}
                            currentHuo={originalBox}
                            consolidatedHuos={storedObject['step80']?.data?.consolidatedBoxes}
                            checkComponent={(data: any) => (
                                <ReviewHuModelWeightChecks dataToCheck={data} />
                            )}
                            formToUse={form}
                        ></ReviewHuModelWeightForm>
                    ) : (
                        <></>
                    )}
                    {/* Step 95 (consolidation): validate the consolidation (END) */}
                    {action === 'consolidation' && storedObject['step90']?.data ? (
                        <AutoValidateConsolidationForm
                            processName={processName}
                            stepNumber={95}
                            autoValidateLoading={{
                                isAutoValidateLoading: isLoading,
                                setIsAutoValidateLoading: setIsLoading
                            }}
                        ></AutoValidateConsolidationForm>
                    ) : (
                        <></>
                    )}
                </RadioButtonWrapper>
            )}
        </PageContentWrapper>
    );
};
//#endregion

ManualRepacking.layout = MainLayout;

export default ManualRepacking;
