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
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { LsIsSecured } from '@helpers';
import { Space } from 'antd';
import { ArrowLeftOutlined, UndoOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import { EnterQuantity } from '@CommonRadio';
import { QuantityChecks } from 'modules/Preparation/RoundPacking/ChecksAndRecords/QuantityChecks';
// import { ValidateBoxPreparationForm } from 'modules/Preparation/BoxPreparation/Forms/ValidateBoxPreparation';
import { SelectRoundForm } from 'modules/Preparation/RoundPacking/Forms/SelectRoundForm';
import { SelectHuModelForm } from 'modules/Preparation/RoundPacking/Forms/SelectHuModelForm';
import { ArticleOrFeatureChecks } from 'modules/Preparation/RoundPacking/ChecksAndRecords/ArticleOrFeatureChecks';
import { SelectArticleForm } from 'modules/Preparation/RoundPacking/Forms/SelectArticleForm';
import { ScanArticleOrFeature } from 'modules/Preparation/RoundPacking/PagesContainer/ScanArticleOrFeature';
import { AutoValidateRoundPackingForm } from 'modules/Preparation/RoundPacking/Forms/AutoValidateRoundPackingForm';
// import { HandlingUnitChecks } from 'modules/Preparation/RoundPicking/ChecksAndRecords/HandlingUnitChecks';

type PageComponent = FC & { layout: typeof MainLayout };

const RoundPacking: PageComponent = () => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const router = useRouter();
    const [triggerRender, setTriggerRender] = useState<boolean>(true);
    const [originDisplay, setOriginDisplay] = useState<any>({});
    const [finalDisplay, setFinalDisplay] = useState<any>({});
    const [headerContent, setHeaderContent] = useState<boolean>(false);
    const [displayed, setDisplayed] = useState<any>({});
    const [otherArticleTrigger, setOtherArticleTrigger] = useState<boolean>(false);
    const [triggerAlternativeSubmit, setTriggerAlternativeSubmit] = useState<boolean>(false);
    //define workflow parameters
    const workflow = {
        processName: 'roundPacking',
        expectedSteps: [10, 20, 30, 40, 50, 60]
    };
    const storedObject = JSON.parse(storage.get(workflow.processName) || '{}');

    console.log('roundPacking', storedObject);

    //initialize workflow on step 0
    if (Object.keys(storedObject).length === 0) {
        storedObject[`step${workflow.expectedSteps[0]}`] = { previousStep: 0 };
        storedObject['currentStep'] = workflow.expectedSteps[0];
        storage.set(workflow.processName, JSON.stringify(storedObject));
    }

    //function to retrieve information to display in RadioInfosHeader
    useEffect(() => {
        const object: { [k: string]: any } = {};
        if (storedObject[`step${workflow.expectedSteps[0]}`]?.data?.round) {
            const round = storedObject[`step${workflow.expectedSteps[0]}`]?.data?.round;
            object[t('common:round')] = round.name;
        }
        if (storedObject[`step${workflow.expectedSteps[1]}`]?.data?.handlingUnitModel) {
            const packaging =
                storedObject[`step${workflow.expectedSteps[1]}`]?.data?.handlingUnitModel;
            object[t('common:handling-unit-model')] = packaging.name;
            object[t('common:handling-unit-model-description')] = packaging.description;
        }
        if (storedObject[`step${workflow.expectedSteps[0]}`]?.data?.existingFinalHUO) {
            const currentBox =
                storedObject[`step${workflow.expectedSteps[0]}`]?.data?.existingFinalHUO;
            let currentPickedQuantity = 0;
            currentBox.handlingUnitContentOutbounds.forEach((item: any) => {
                currentPickedQuantity += item.pickedQuantity;
            });
            object[t('common:current-box-quantity')] = currentPickedQuantity;
        }
        if (storedObject[`step${workflow.expectedSteps[2]}`]?.data?.article) {
            const article = storedObject[`step${workflow.expectedSteps[2]}`]?.data?.article;
            const serialNumber =
                storedObject[`step${workflow.expectedSteps[2]}`]?.data?.feature?.value ?? undefined;
            object[t('common:article')] = serialNumber
                ? '1 x ' + article.name + ' / ' + serialNumber
                : article.name;
        }
        if (storedObject[`step${workflow.expectedSteps[2]}`]?.data?.reference2) {
            object[t('common:order-type')] =
                storedObject[`step${workflow.expectedSteps[2]}`]?.data?.reference2 ?? undefined;
        }
        if (storedObject[`step${workflow.expectedSteps[3]}`]?.data?.movingQuantity) {
            const article = storedObject[`step${workflow.expectedSteps[2]}`]?.data?.article;
            const movingQuantity =
                storedObject[`step${workflow.expectedSteps[3]}`]?.data?.movingQuantity;
            object[t('common:article')] = movingQuantity + ' x ' + article.name;
        }
        setOriginDisplay(object);
    }, [triggerRender]);

    useEffect(() => {
        headerContent ? setDisplayed(originDisplay) : setDisplayed(originDisplay);
    }, [originDisplay, finalDisplay, headerContent]);

    const onReset = () => {
        storage.remove(workflow.processName);
        setHeaderContent(false);
        setTriggerRender(!triggerRender);
    };

    const previousPage = () => {
        router.back();
        storage.remove(workflow.processName);
        setHeaderContent(false);
    };

    return (
        <PageContentWrapper>
            <HeaderContent
                title={t('common:round-packing')}
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
                <SelectRoundForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[0]}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true, backButton: false }}
                ></SelectRoundForm>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[0]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[1]}`]?.data ? (
                <SelectHuModelForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[1]}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true, backButton: true }}
                    defaultValue={
                        storedObject[`step${workflow.expectedSteps[0]}`]?.data?.existingFinalHUO
                            ?.handlingUnitModel ?? undefined
                    }
                ></SelectHuModelForm>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[1]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[2]}`]?.data ? (
                !otherArticleTrigger ? (
                    <ScanArticleOrFeature
                        process={workflow.processName}
                        stepNumber={workflow.expectedSteps[2]}
                        label={t('common:article')}
                        buttons={{
                            submitButton: true,
                            backButton: true,
                            action1Button: true,
                            alternativeSubmitButton: storedObject[
                                `step${workflow.expectedSteps[0]}`
                            ]?.data?.existingFinalHUO
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
                        checkComponent={(data: any) => (
                            <ArticleOrFeatureChecks dataToCheck={data} />
                        )}
                    ></ScanArticleOrFeature>
                ) : (
                    <SelectArticleForm
                        process={workflow.processName}
                        stepNumber={workflow.expectedSteps[2]}
                        contents={
                            storedObject[`step${workflow.expectedSteps[0]}`]?.data.roundHU
                                ?.handlingUnitContents
                        }
                        trigger={{ triggerRender, setTriggerRender }}
                        action1Trigger={{
                            action1Trigger: otherArticleTrigger,
                            setAction1Trigger: setOtherArticleTrigger
                        }}
                        buttons={{ submitButton: true, backButton: false, action1Button: true }}
                    ></SelectArticleForm>
                )
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[2]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[3]}`]?.data ? (
                <EnterQuantity
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[3]}
                    label={t('common:quantity-var', {
                        number: `${
                            storedObject[`step${workflow.expectedSteps[2]}`].data
                                .handlingUnitContent?.quantity
                        }`
                    })}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{
                        submitButton: true,
                        backButton: true
                    }}
                    availableQuantity={
                        storedObject[`step${workflow.expectedSteps[2]}`].data.handlingUnitContent
                            ?.quantity
                    }
                    checkComponent={(data: any) => <QuantityChecks dataToCheck={data} />}
                    defaultValue={
                        storedObject[`step${workflow.expectedSteps[2]}`].data.defaultQuantity ??
                        undefined
                    }
                ></EnterQuantity>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[3]}`]?.data ? (
                <AutoValidateRoundPackingForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[4]}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    headerContent={{ setHeaderContent }}
                ></AutoValidateRoundPackingForm>
            ) : (
                <></>
            )}
        </PageContentWrapper>
    );
};

RoundPacking.layout = MainLayout;

export default RoundPacking;
