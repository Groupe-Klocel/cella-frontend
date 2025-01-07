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
import { EnterQuantity, ScanHandlingUnit } from '@CommonRadio';
import { QuantityChecks } from 'modules/Preparation/RoundPicking/ChecksAndRecords/QuantityChecks';
import { SelectRoundForm } from 'modules/Preparation/RoundPicking/Forms/SelectRoundForm';
import { ArticleOrFeatureChecks } from 'modules/Preparation/RoundPicking/ChecksAndRecords/ArticleOrFeatureChecks';
import { HandlingUnitChecks } from 'modules/Preparation/RoundPicking/ChecksAndRecords/HandlingUnitChecks';
import { ScanArticleOrFeature } from 'modules/Preparation/RoundPicking/PagesContainer/ScanArticleOrFeature';
import { AutoValidateRoundPickingForm } from 'modules/Preparation/RoundPicking/Forms/AutoValidateRoundPickingForm';

type PageComponent = FC & { layout: typeof MainLayout };

const RoundPicking: PageComponent = () => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const router = useRouter();
    const [triggerRender, setTriggerRender] = useState<boolean>(true);
    const [originDisplay, setOriginDisplay] = useState<any>({});
    const [finalDisplay, setFinalDisplay] = useState<any>({});
    const [headerContent, setHeaderContent] = useState<boolean>(false);
    const [displayed, setDisplayed] = useState<any>({});
    const [showEmptyLocations, setShowEmptyLocations] = useState<boolean>(false);
    const [locationToPropose, setLocationToPropose] = useState<string>();
    const [articleToPropose, setArticleToPropose] = useState<string>();
    const [remainQtyToPrepare, setRemainQtyToPrepare] = useState<number>();
    //define workflow parameters
    const workflow = {
        processName: 'roundPicking',
        expectedSteps: [10, 20, 25, 30, 40]
    };
    const storedObject = JSON.parse(storage.get(workflow.processName) || '{}');

    console.log('roundPicking', storedObject);

    //initialize workflow on step 0
    if (Object.keys(storedObject).length === 0) {
        storedObject[`step${workflow.expectedSteps[0]}`] = { previousStep: 0 };
        storedObject['currentStep'] = workflow.expectedSteps[0];
        storage.set(workflow.processName, JSON.stringify(storedObject));
    }

    //function to retrieve information to display in RadioInfosHeader
    useEffect(() => {
        const object: { [k: string]: any } = {};
        if (
            storedObject[`step${workflow.expectedSteps[0]}`]?.data?.round &&
            storedObject[`step${workflow.expectedSteps[0]}`]?.data?.proposedRoundAdvisedAddress
        ) {
            const round = storedObject[`step${workflow.expectedSteps[0]}`]?.data?.round;
            const proposedRoundAdvisedAddress =
                storedObject[`step${workflow.expectedSteps[0]}`]?.data?.proposedRoundAdvisedAddress;
            object[t('common:round')] = round.name;
            object[t('common:location_abbr')] = proposedRoundAdvisedAddress.location?.name;
            if (proposedRoundAdvisedAddress?.handlingUnitContent?.stockOwner) {
                const handlingUnitContent = proposedRoundAdvisedAddress?.handlingUnitContent;
                object[t('common:stock-owner_abbr')] = handlingUnitContent.stockOwner?.name;
            }
            object[t('common:article_abbr')] =
                proposedRoundAdvisedAddress.handlingUnitContent?.article?.name;
            object[t('common:quantity_abbr')] = proposedRoundAdvisedAddress.quantity;
        }
        if (
            storedObject[`step${workflow.expectedSteps[2]}`]?.data?.handlingUnit &&
            storedObject[`step${workflow.expectedSteps[3]}`]?.data
        ) {
            const handlingUnit =
                storedObject[`step${workflow.expectedSteps[2]}`]?.data?.handlingUnit;
            object[t('common:handling-unit_abbr')] = handlingUnit.name;
        }
        setOriginDisplay(object);
        setFinalDisplay(object);
    }, [triggerRender]);

    // retrieve location, article and qty to propose
    useEffect(() => {
        if (storedObject[`step${workflow.expectedSteps[0]}`]?.data?.proposedRoundAdvisedAddress) {
            setLocationToPropose(
                storedObject[`step${workflow.expectedSteps[0]}`]?.data?.proposedRoundAdvisedAddress
                    .location?.name
            );
            setArticleToPropose(
                storedObject[`step${workflow.expectedSteps[0]}`]?.data?.proposedRoundAdvisedAddress
                    ?.handlingUnitContent?.article?.name
            );
        }
    }, [storedObject, triggerRender]);

    useEffect(() => {
        headerContent ? setDisplayed(finalDisplay) : setDisplayed(originDisplay);
    }, [originDisplay, finalDisplay, headerContent]);

    const onReset = () => {
        storage.removeAll();
        setHeaderContent(false);
        setShowEmptyLocations(false);
        setTriggerRender(!triggerRender);
    };

    const previousPage = () => {
        router.back();
        storage.removeAll();
        setHeaderContent(false);
        setShowEmptyLocations(false);
    };

    return (
        <PageContentWrapper>
            <HeaderContent
                title={t('common:round-picking')}
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
                <ScanArticleOrFeature
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[1]}
                    label={t('common:article')}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    checkComponent={(data: any) => <ArticleOrFeatureChecks dataToCheck={data} />}
                ></ScanArticleOrFeature>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[1]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[2]}`]?.data ? (
                <ScanHandlingUnit
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[2]}
                    label={t('common:handling-unit')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{
                        submitButton: true,
                        backButton: true
                    }}
                    checkComponent={(data: any) => <HandlingUnitChecks dataToCheck={data} />}
                    defaultValue={
                        storedObject[`step${workflow.expectedSteps[1]}`].data.handlingUnit ??
                        undefined
                    }
                ></ScanHandlingUnit>
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
                            storedObject[`step${workflow.expectedSteps[0]}`].data
                                .proposedRoundAdvisedAddress.quantity
                        }`
                    })}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{
                        submitButton: true,
                        backButton: true
                    }}
                    availableQuantity={
                        storedObject[`step${workflow.expectedSteps[0]}`].data
                            .proposedRoundAdvisedAddress.quantity
                    }
                    checkComponent={(data: any) => <QuantityChecks dataToCheck={data} />}
                    defaultValue={
                        storedObject[`step${workflow.expectedSteps[1]}`].data.defaultQuantity ??
                        undefined
                    }
                ></EnterQuantity>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[3]}`]?.data ? (
                <AutoValidateRoundPickingForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[4]}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    headerContent={{ setHeaderContent }}
                ></AutoValidateRoundPickingForm>
            ) : (
                <></>
            )}
        </PageContentWrapper>
    );
};

RoundPicking.layout = MainLayout;

export default RoundPicking;
