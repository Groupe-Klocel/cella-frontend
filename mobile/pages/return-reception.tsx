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
import useTranslation from 'next-translate/useTranslation';
import { LsIsSecured } from '@helpers';
import { Space } from 'antd';
import { ArrowLeftOutlined, UndoOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import { EnterDate, EnterQuantity, ScanFeature, ScanHandlingUnit } from '@CommonRadio';
import { SelectBlockForm } from 'modules/ReceptionManagement/ReturnReception/Forms/SelectBlockForm';
import { SelectReturnPOForm } from 'modules/ReceptionManagement/ReturnReception/Forms/SelectReturnPOForm';
import { ReturnDateChecks } from 'modules/ReceptionManagement/ReturnReception/ChecksAndRecords/ReturnDateChecks';
import { HandlingUnitFinalChecks } from 'modules/ReceptionManagement/ReturnReception/ChecksAndRecords/HandlingUnitFinalChecks';
import { ValidateReturnReceptionForm } from 'modules/ReceptionManagement/ReturnReception/Forms/ValidateReturnReception';
import { SelectArticleForm } from 'modules/Common/Articles/Forms/SelectArticleForm';
import { SelectFeatureCodeForm } from 'modules/Common/FeatureCode/Forms/SelectFeatureCodeForm';
import { SelectStockOwnerForm } from 'modules/Common/StockOwner/Forms/SelectStockOwnerForm';
import { QuantityChecks } from 'modules/ReceptionManagement/ReturnReception/ChecksAndRecords/QuantityChecks';
import { ScanArticleOrFeature } from 'modules/ReceptionManagement/ReturnReception/PagesContainer/ScanArticleOrFeature';
import { ArticleOrFeatureChecks } from 'modules/ReceptionManagement/ReturnReception/ChecksAndRecords/ArticleOrFeatureChecks';
import { SelectOtherArticleForm } from 'modules/ReceptionManagement/ReturnReception/Forms/SelectOtherArticleForm';

type PageComponent = FC & { layout: typeof MainLayout };

const ReturnReception: PageComponent = () => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const router = useRouter();
    const [triggerRender, setTriggerRender] = useState<boolean>(true);
    const [originDisplay, setOriginDisplay] = useState<any>({});
    const [finalDisplay, setFinalDisplay] = useState<any>({});
    const [headerContent, setHeaderContent] = useState<boolean>(false);
    const [displayed, setDisplayed] = useState<any>({});
    const [newReturnTrigger, setNewReturnTrigger] = useState<boolean>(false);
    const [otherArticleTrigger, setOtherArticleTrigger] = useState<boolean>(false);
    const [triggerAlternativeSubmit, setTriggerAlternativeSubmit] = useState<boolean>(false);
    const [triggerAlternativeSubmit1, setTriggerAlternativeSubmit1] = useState<boolean>(false);
    //define workflow parameters
    const workflow = {
        processName: 'returnReception',
        expectedSteps: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    };

    // [0] : 10-> SelectBlockForm
    // [1] : 20 -> Select PO or new
    // [2] : 30 -> Enter ReturnDate
    // [3] : 40 -> Scan HandlingUnit or new one
    // [4] : 50 -> ScanIdOrEAN or otherProducts
    // [5] : 60 -> EnterQuantity
    // [6] : 70 -> Unknown feature: enter id
    // [7] : 80 -> Unknown feature: select stockowner
    // [8] : 90 -> Unknown feature: select article
    // [9] : 100 -> Validate

    const storedObject = JSON.parse(storage.get(workflow.processName) || '{}');

    console.log('returnReception', storedObject);

    //initialize workflow on step 0
    if (Object.keys(storedObject).length === 0) {
        storedObject[`step${workflow.expectedSteps[0]}`] = { previousStep: 0 };
        storedObject['currentStep'] = workflow.expectedSteps[0];
        storage.set(workflow.processName, JSON.stringify(storedObject));
    }

    //function to retrieve information to display in RadioInfosHeader
    useEffect(() => {
        const object: { [k: string]: any } = {};
        if (storedObject[`step${workflow.expectedSteps[0]}`]?.data?.block) {
            const block = storedObject[`step${workflow.expectedSteps[0]}`]?.data?.block;
            object[t('common:customer')] = block.name;
        }
        if (storedObject[`step${workflow.expectedSteps[1]}`]?.data?.purchaseOrder) {
            const purchaseOrder =
                storedObject[`step${workflow.expectedSteps[1]}`]?.data?.purchaseOrder;
            object[t('common:return')] = purchaseOrder.name ?? t('common:new');
        }
        if (storedObject[`step${workflow.expectedSteps[2]}`]?.data?.newFeature) {
            const newId = storedObject[`step${workflow.expectedSteps[2]}`]?.data?.newFeature.value;
            object[t('common:substitution-article')] = newId;
        }
        if (storedObject[`step${workflow.expectedSteps[3]}`]?.data?.handlingUnit) {
            const huName =
                storedObject[`step${workflow.expectedSteps[3]}`]?.data?.handlingUnit.name;
            object[t('common:handling-unit_abbr')] = huName;
        }
        if (storedObject[`step${workflow.expectedSteps[4]}`]?.data?.feature) {
            const featureName =
                storedObject[`step${workflow.expectedSteps[4]}`]?.data?.feature?.value;
            object[t('common:serial-number')] = featureName;
        }
        if (storedObject[`step${workflow.expectedSteps[6]}`]?.data?.stockOwner) {
            const stockOwnerName =
                storedObject[`step${workflow.expectedSteps[6]}`]?.data?.stockOwner?.name;
            object[t('common:stock-owner_abbr')] = stockOwnerName;
        }
        if (storedObject[`step${workflow.expectedSteps[7]}`]?.data?.article) {
            const articleName =
                storedObject[`step${workflow.expectedSteps[7]}`]?.data?.article?.name;
            object[t('common:article')] = articleName;
        }
        setOriginDisplay(object);
        setFinalDisplay(object);
    }, [triggerRender]);

    useEffect(() => {
        headerContent ? setDisplayed(finalDisplay) : setDisplayed(originDisplay);
    }, [originDisplay, finalDisplay, headerContent]);

    const onReset = () => {
        storage.removeAll();
        setHeaderContent(false);
        setTriggerRender(!triggerRender);
    };

    const previousPage = () => {
        router.back();
        storage.removeAll();
        setHeaderContent(false);
    };

    return (
        <PageContentWrapper>
            <HeaderContent
                title={t('common:return-reception')}
                actionsRight={
                    <Space>
                        {storedObject.currentStep > workflow.expectedSteps[0] ? (
                            <NavButton icon={<UndoOutlined />} onClick={onReset}></NavButton>
                        ) : (
                            <></>
                        )}
                        <NavButton icon={<ArrowLeftOutlined />} onClick={previousPage}></NavButton>
                    </Space>
                }
            />
            {Object.keys(originDisplay).length === 0 && Object.keys(finalDisplay).length === 0 ? (
                <></>
            ) : (
                <RadioInfosHeader
                    input={{
                        displayed: displayed
                    }}
                ></RadioInfosHeader>
            )}
            {!storedObject[`step${workflow.expectedSteps[0]}`]?.data ? (
                <SelectBlockForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[0]}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true, backButton: false }}
                ></SelectBlockForm>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[0]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[1]}`]?.data ? (
                <SelectReturnPOForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[1]}
                    buttons={{ submitButton: true, backButton: true, action1Button: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    action1Trigger={{
                        action1Trigger: newReturnTrigger,
                        setAction1Trigger: setNewReturnTrigger
                    }}
                    customer={storedObject[`step${workflow.expectedSteps[0]}`]?.data?.block?.name}
                ></SelectReturnPOForm>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[1]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[2]}`]?.data ? (
                <EnterDate
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[2]}
                    label={t('common:return-date')}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    defaultValue={
                        storedObject[`step${workflow.expectedSteps[1]}`]?.data.purchaseOrder
                            .orderDate ?? undefined
                    }
                    checkComponent={(data: any) => <ReturnDateChecks dataToCheck={data} />}
                ></EnterDate>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[2]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[3]}`]?.data ? (
                <ScanHandlingUnit
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[3]}
                    label={t('common:handling-unit')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true, backButton: true }}
                    checkComponent={(data: any) => <HandlingUnitFinalChecks dataToCheck={data} />}
                ></ScanHandlingUnit>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[3]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[4]}`]?.data ? (
                !otherArticleTrigger ? (
                    <ScanArticleOrFeature
                        process={workflow.processName}
                        stepNumber={workflow.expectedSteps[4]}
                        label={t('common:article')}
                        buttons={{
                            submitButton: true,
                            backButton: true,
                            action1Button: true,
                            alternativeSubmitButton: storedObject[
                                `step${workflow.expectedSteps[3]}`
                            ]?.data?.handlingUnit?.id
                                ? true
                                : false,
                            alternativeSubmitButton1:
                                storedObject[`step${workflow.expectedSteps[1]}`]?.data
                                    ?.purchaseOrder?.purchaseOrderLines.length > 0
                                    ? true
                                    : false
                        }}
                        trigger={{ triggerRender, setTriggerRender }}
                        action1Trigger={{
                            action1Trigger: otherArticleTrigger,
                            setAction1Trigger: setOtherArticleTrigger
                        }}
                        triggerAlternativeSubmit={{
                            triggerAlternativeSubmit,
                            setTriggerAlternativeSubmit
                        }}
                        triggerAlternativeSubmit1={{
                            triggerAlternativeSubmit1,
                            setTriggerAlternativeSubmit1
                        }}
                        checkComponent={(data: any) => (
                            <ArticleOrFeatureChecks dataToCheck={data} />
                        )}
                    ></ScanArticleOrFeature>
                ) : (
                    <SelectOtherArticleForm
                        process={workflow.processName}
                        stepNumber={workflow.expectedSteps[4]}
                        contents={
                            storedObject[`step${workflow.expectedSteps[0]}`]?.data
                                .handlingUnitContents
                        }
                        trigger={{ triggerRender, setTriggerRender }}
                        action1Trigger={{
                            action1Trigger: otherArticleTrigger,
                            setAction1Trigger: setOtherArticleTrigger
                        }}
                        buttons={{ submitButton: true, backButton: false, action1Button: true }}
                    ></SelectOtherArticleForm>
                )
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[4]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[5]}`]?.data ? (
                <EnterQuantity
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[5]}
                    label={t('common:quantity')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{
                        submitButton: true,
                        backButton: true
                    }}
                    checkComponent={(data: any) => <QuantityChecks dataToCheck={data} />}
                    defaultValue={
                        storedObject[`step${workflow.expectedSteps[4]}`].data.defaultQuantity ??
                        undefined
                    }
                ></EnterQuantity>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[5]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[6]}`]?.data ? (
                <SelectStockOwnerForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[6]}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true, backButton: true }}
                    defaultValue={
                        storedObject[`step${workflow.expectedSteps[4]}`]?.data.handlingUnitContent
                            ?.stockOwner ?? undefined
                    }
                ></SelectStockOwnerForm>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[6]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[7]}`]?.data ? (
                <SelectArticleForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[7]}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true, backButton: true }}
                    defaultValue={
                        storedObject[`step${workflow.expectedSteps[4]}`]?.data.article ?? undefined
                    }
                ></SelectArticleForm>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[7]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[8]}`]?.data &&
            storedObject[`step${workflow.expectedSteps[4]}`]?.data?.resType == 'serialNumber' ? (
                <SelectFeatureCodeForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[8]}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true, backButton: true }}
                    defaultValue={
                        storedObject[`step${workflow.expectedSteps[4]}`]?.data.feature
                            ?.featureCode ?? undefined
                    }
                ></SelectFeatureCodeForm>
            ) : (
                <></>
            )}
            {((storedObject[`step${workflow.expectedSteps[4]}`]?.data?.resType == 'barcode' &&
                storedObject[`step${workflow.expectedSteps[7]}`]?.data) ||
                (storedObject[`step${workflow.expectedSteps[4]}`]?.data?.resType ==
                    'serialNumber' &&
                    storedObject[`step${workflow.expectedSteps[8]}`]?.data)) &&
            !storedObject[`step${workflow.expectedSteps[9]}`]?.data ? (
                <ValidateReturnReceptionForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[9]}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    headerContent={{ setHeaderContent }}
                ></ValidateReturnReceptionForm>
            ) : (
                <></>
            )}
        </PageContentWrapper>
    );
};

ReturnReception.layout = MainLayout;

export default ReturnReception;
