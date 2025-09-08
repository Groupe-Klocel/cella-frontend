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
import {
    EmptyLocations,
    ScanBox,
    SelectLocationByLevelForm,
    ScanArticle,
    ScanLocation,
    EnterQuantity
} from '@CommonRadio';
import { BoxChecks } from 'modules/Preparation/BoxPreparation/ChecksAndRecords/BoxChecks';
import { LocationChecks } from 'modules/Preparation/BoxPreparation/ChecksAndRecords/LocationChecks';
import { ArticleChecks } from 'modules/Preparation/BoxPreparation/ChecksAndRecords/ArticleChecks';
import { QuantityChecks } from 'modules/Preparation/BoxPreparation/ChecksAndRecords/QuantityChecks';
import { ValidateBoxPreparationForm } from 'modules/Preparation/BoxPreparation/Forms/ValidateBoxPreparation';

type PageComponent = FC & { layout: typeof MainLayout };

const Preparation: PageComponent = () => {
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
        processName: 'boxPreparation',
        expectedSteps: [10, 20, 25, 30, 50, 70]
    };
    const storedObject = JSON.parse(storage.get(workflow.processName) || '{}');

    // console.log('boxPrep', storedObject);

    //initialize workflow on step 0
    if (Object.keys(storedObject).length === 0) {
        storedObject[`step${workflow.expectedSteps[0]}`] = { previousStep: 0 };
        storedObject['currentStep'] = workflow.expectedSteps[0];
        storage.set(workflow.processName, JSON.stringify(storedObject));
    }

    //function to retrieve information to display in RadioInfosHeader before step 50
    useEffect(() => {
        const object: { [k: string]: any } = {};
        if (storedObject?.currentStep <= 50) {
            setHeaderContent(false);
        }
        if (storedObject[`step${workflow.expectedSteps[0]}`]?.data?.box) {
            const box = storedObject[`step${workflow.expectedSteps[0]}`]?.data?.box;
            object[t('common:box')] = box.name;
            object[t('common:carrier')] = box.carrier.name;
        }
        if (
            storedObject[`step${workflow.expectedSteps[1]}`]?.data?.locations &&
            storedObject[`step${workflow.expectedSteps[1]}`]?.data?.locations?.length > 1
        ) {
            const locationsList = storedObject[`step${workflow.expectedSteps[1]}`]?.data?.locations;
            object[t('common:location_abbr')] = locationsList[1].barcode;
        }
        if (storedObject[`step${workflow.expectedSteps[2]}`]?.data?.chosenLocation) {
            const location = storedObject[`step${workflow.expectedSteps[2]}`]?.data?.chosenLocation;
            object[t('common:location_abbr')] = location.name;
        }
        if (storedObject[`step${workflow.expectedSteps[3]}`]?.data?.articleLuBarcode) {
            const articleLuBarcode =
                storedObject[`step${workflow.expectedSteps[3]}`]?.data?.articleLuBarcode;
            object[t('common:article-description_abbr')] = articleLuBarcode.article.description;
            object[t('common:article_abbr')] = articleLuBarcode.article.name;
            object[t('common:article-barcode')] = articleLuBarcode.barcode.name;
        }
        if (
            storedObject[`step${workflow.expectedSteps[3]}`]?.data?.articleLuBarcode &&
            storedObject[`step${workflow.expectedSteps[4]}`]?.data?.movingQuantity
        ) {
            const articleLuBarcode =
                storedObject[`step${workflow.expectedSteps[3]}`]?.data?.articleLuBarcode;
            const movingQuantity =
                storedObject[`step${workflow.expectedSteps[4]}`]?.data?.movingQuantity;
            object[t('common:article_abbr')] =
                movingQuantity + ' x ' + articleLuBarcode.article.name;
        }
        setOriginDisplay(object);
    }, [triggerRender]);

    // retrieve location, article and qty to propose
    useEffect(() => {
        if (storedObject[`step${workflow.expectedSteps[0]}`]?.data?.proposedBoxLine) {
            setLocationToPropose(
                storedObject[`step${workflow.expectedSteps[0]}`]?.data?.proposedBoxLine
                    .pickingLocation?.name
            );
            setArticleToPropose(
                `${
                    storedObject[`step${workflow.expectedSteps[0]}`]?.data?.proposedBoxLine
                        .handlingUnitContent.article.name
                } - ${
                    storedObject[`step${workflow.expectedSteps[0]}`]?.data?.proposedBoxLine
                        .handlingUnitContent.article.description
                }`
            );
            setRemainQtyToPrepare(
                storedObject[`step${workflow.expectedSteps[0]}`]?.data?.proposedBoxLine
                    .quantityToBePicked -
                    storedObject[`step${workflow.expectedSteps[0]}`]?.data?.proposedBoxLine
                        .pickedQuantity
            );
        }
    }, [storedObject, triggerRender]);

    useEffect(() => {
        headerContent ? setDisplayed(originDisplay) : setDisplayed(originDisplay);
    }, [originDisplay, finalDisplay, headerContent]);

    const onReset = () => {
        storage.remove(workflow.processName);
        setHeaderContent(false);
        setShowEmptyLocations(false);
        setTriggerRender(!triggerRender);
    };

    const previousPage = () => {
        router.back();
        storage.remove(workflow.processName);
        setHeaderContent(false);
        setShowEmptyLocations(false);
    };

    return (
        <PageContentWrapper>
            <HeaderContent
                title={t('common:box-preparation')}
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
            {showEmptyLocations && storedObject[`step${workflow.expectedSteps[4]}`].data ? (
                <EmptyLocations />
            ) : (
                <></>
            )}
            {!storedObject[`step${workflow.expectedSteps[0]}`]?.data ? (
                <ScanBox
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[0]}
                    label={t('common:box')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true, backButton: false }}
                    checkComponent={(data: any) => <BoxChecks dataToCheck={data} />}
                ></ScanBox>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[0]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[1]}`]?.data ? (
                <ScanLocation
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[1]}
                    label={t('common:location-var', {
                        name: `${locationToPropose}`
                    })}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{
                        submitButton: true,
                        backButton: true
                    }}
                    checkComponent={(data: any) => <LocationChecks dataToCheck={data} />}
                ></ScanLocation>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[1]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[2]}`]?.data ? (
                <SelectLocationByLevelForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[2]}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    locations={storedObject[`step${workflow.expectedSteps[1]}`].data.locations}
                ></SelectLocationByLevelForm>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[2]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[3]}`]?.data ? (
                <ScanArticle
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[3]}
                    label={t('common:article-var', {
                        name: `${articleToPropose}`
                    })}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{
                        submitButton: true,
                        backButton: true
                    }}
                    checkComponent={(data: any) => <ArticleChecks dataToCheck={data} />}
                ></ScanArticle>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[3]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[4]}`]?.data ? (
                <EnterQuantity
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[4]}
                    label={t('common:quantity-var', {
                        number: `${remainQtyToPrepare!}`
                    })}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{
                        submitButton: true,
                        backButton: true
                    }}
                    availableQuantity={remainQtyToPrepare!}
                    checkComponent={(data: any) => <QuantityChecks dataToCheck={data} />}
                ></EnterQuantity>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[4]}`]?.data ? (
                <ValidateBoxPreparationForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[5]}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    headerContent={{ setHeaderContent }}
                ></ValidateBoxPreparationForm>
            ) : (
                <></>
            )}
        </PageContentWrapper>
    );
};

Preparation.layout = MainLayout;

export default Preparation;
