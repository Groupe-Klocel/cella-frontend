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
import {
    EmptyLocations,
    SelectLocationByLevelForm,
    ScanLocation,
    SimilarLocations
} from '@CommonRadio';
import { LocationChecks } from 'modules/StockManagement/HuMovement/ChecksAndRecords/LocationChecks';
import { HandlingUnitOriginChecks } from 'modules/StockManagement/HuMovement/ChecksAndRecords/HandlingUnitOriginChecks';
import { HandlingUnitFinalChecks } from 'modules/StockManagement/HuMovement/ChecksAndRecords/HandlingUnitFinalChecks';
import { ScanHandlingUnit } from 'modules/Common/HandlingUnits/PagesContainer/ScanHandlingUnit';
import { ScanHuOrLocation } from 'modules/StockManagement/Forms/ScanHuOrLocationForm';
import { HuOrLocationChecks } from 'modules/StockManagement/HuMovement/ChecksAndRecords/HuOrLocationChecks';
import { log } from 'console';
import { ValidateHuMoveForm } from 'modules/StockManagement/Forms/ValidateHuMoveForm';

type PageComponent = FC & { layout: typeof MainLayout };

const HuMovement: PageComponent = () => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const router = useRouter();
    const [triggerRender, setTriggerRender] = useState<boolean>(true);
    const [originDisplay, setOriginDisplay] = useState<any>({});
    const [finalDisplay, setFinalDisplay] = useState<any>({});
    const [headerContent, setHeaderContent] = useState<boolean>(false);
    const [displayed, setDisplayed] = useState<any>({});
    const [showSimilarLocations, setShowSimilarLocations] = useState<boolean>(false);
    const [showEmptyLocations, setShowEmptyLocations] = useState<boolean>(false);
    const [showAlternativeSubmit, setShowAlternativeSubmit] = useState<boolean>(false);
    const workflow = {
        processName: 'huMvt',
        expectedSteps: [10, 15, 20, 30, 35, 40, 50]
    };
    const storedObject = JSON.parse(storage.get(workflow.processName) || '{}');

    console.log('storedObject', storedObject);

    //initialize workflow on step 0
    if (Object.keys(storedObject).length === 0) {
        storedObject[`step${workflow.expectedSteps[0]}`] = { previousStep: 0 };
        storedObject['currentStep'] = workflow.expectedSteps[0];
        storage.set(workflow.processName, JSON.stringify(storedObject));
    }

    //function to retrieve information to display in RadioInfosHeader before step 20
    useEffect(() => {
        const object: { [k: string]: any } = {};
        if (storedObject?.currentStep <= 20) {
            setHeaderContent(false);
        }
        if (
            storedObject[`step${workflow.expectedSteps[0]}`]?.data?.locations &&
            storedObject[`step${workflow.expectedSteps[0]}`]?.data?.locations?.length > 1
        ) {
            const locationsList = storedObject[`step${workflow.expectedSteps[0]}`]?.data?.locations;
            object[t('common:location-origin_abbr')] = locationsList[0].barcode;
        }
        if (storedObject[`step${workflow.expectedSteps[1]}`]?.data?.chosenLocation) {
            const location = storedObject[`step${workflow.expectedSteps[1]}`]?.data?.chosenLocation;
            object[t('common:location-origin_abbr')] = location.name;
        }
        if (storedObject[`step${workflow.expectedSteps[2]}`]?.data?.handlingUnit) {
            const originalHu = storedObject[`step${workflow.expectedSteps[2]}`]?.data?.handlingUnit;
            object[t('common:handling-unit-origin_abbr')] = originalHu.name;
            object[t('common:article')] = originalHu.handlingUnitContents[0].article.name;
        }
        if (storedObject[`step${workflow.expectedSteps[4]}`]?.data?.chosenLocation) {
            const location = storedObject[`step${workflow.expectedSteps[4]}`]?.data?.chosenLocation;
            object[t('common:location-final_abbr')] = location.name;
        }
        if (storedObject[`step${workflow.expectedSteps[5]}`]?.data?.handlingUnit) {
            const hu = storedObject[`step${workflow.expectedSteps[5]}`]?.data?.handlingUnit;
            object[t('common:handling-unit-final_abbr')] = hu.name;
        }
        setOriginDisplay(object);
    }, [triggerRender]);

    //function to retrieve information to display in RadioInfosHeader after step 20
    useEffect(() => {
        const finalObject: { [k: string]: any } = {};
        if (storedObject?.currentStep === 50) {
            const originLocation =
                storedObject[`step${workflow.expectedSteps[1]}`]?.data?.chosenLocation;
            finalObject[t('common:location-origin_abbr')] = originLocation.name;
            setHeaderContent(true);
        }
        if (storedObject[`step${workflow.expectedSteps[2]}`]?.data?.handlingUnit) {
            const originalHu = storedObject[`step${workflow.expectedSteps[2]}`]?.data?.handlingUnit;
            finalObject[t('common:handling-unit-origin_abbr')] = originalHu.name;
            finalObject[t('common:article')] = originalHu.handlingUnitContents[0].article.name;
        }
        if (storedObject[`step${workflow.expectedSteps[4]}`]?.data?.chosenLocation) {
            const chosenLocation =
                storedObject[`step${workflow.expectedSteps[4]}`]?.data.chosenLocation;
            finalObject[t('common:location-final_abbr')] = chosenLocation.name;
        }
        if (storedObject[`step${workflow.expectedSteps[5]}`]?.data?.finalHandlingUnit) {
            const finalHandlingUnit =
                storedObject[`step${workflow.expectedSteps[5]}`]?.data.finalHandlingUnit;
            finalObject[t('common:handling-unit-final_abbr')] = finalHandlingUnit.name;
        }
        setFinalDisplay(finalObject);
    }, [triggerRender]);

    useEffect(() => {
        headerContent ? setDisplayed(originDisplay) : setDisplayed(originDisplay);
    }, [originDisplay, finalDisplay, headerContent]);

    console.log('DLA-hC', headerContent);

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
                title={t('common:hu-movement')}
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
            {showSimilarLocations &&
            storedObject[`step${workflow.expectedSteps[2]}`].data.handlingUnit
                .handlingUnitContents[0].articleId ? (
                <SimilarLocations
                    articleId={
                        storedObject[`step${workflow.expectedSteps[2]}`].data.handlingUnit
                            .handlingUnitContents[0].articleId
                    }
                    chosenContentId={
                        storedObject[`step${workflow.expectedSteps[2]}`].data.handlingUnit
                            .handlingUnitContents[0].id
                    }
                />
            ) : (
                <></>
            )}
            {showEmptyLocations &&
            storedObject[`step${workflow.expectedSteps[2]}`].data.handlingUnit
                .handlingUnitContents[0].articleId ? (
                <EmptyLocations withAvailableHU={false} />
            ) : (
                <></>
            )}
            {!storedObject[`step${workflow.expectedSteps[0]}`]?.data ? (
                <ScanLocation
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[0]}
                    label={t('common:location-origin')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true, backButton: false }}
                    checkComponent={(data: any) => <LocationChecks dataToCheck={data} />}
                ></ScanLocation>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[0]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[1]}`]?.data ? (
                <SelectLocationByLevelForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[1]}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    locations={storedObject[`step${workflow.expectedSteps[0]}`].data.locations}
                ></SelectLocationByLevelForm>
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
                    buttons={{ submitButton: true, backButton: true }}
                    checkComponent={(data: any) => <HandlingUnitOriginChecks dataToCheck={data} />}
                ></ScanHandlingUnit>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[2]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[3]}`]?.data ? (
                <ScanHuOrLocation
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[3]}
                    label={t('common:location-final') + ' / ' + t('common:handling-unit')}
                    buttons={{
                        submitButton: true,
                        backButton: true,
                        locationButton: true,
                        alternativeSubmit: true
                    }}
                    trigger={{ triggerRender, setTriggerRender }}
                    showEmptyLocations={{ showEmptyLocations, setShowEmptyLocations }}
                    showSimilarLocations={{ showSimilarLocations, setShowSimilarLocations }}
                    showAlternativeSubmit={{ showAlternativeSubmit, setShowAlternativeSubmit }}
                    headerContent={{ headerContent, setHeaderContent }}
                    checkComponent={(data: any) => <HuOrLocationChecks dataToCheck={data} />}
                ></ScanHuOrLocation>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[3]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[4]}`]?.data ? (
                <SelectLocationByLevelForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[4]}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    locations={storedObject[`step${workflow.expectedSteps[3]}`].data.finalLocation}
                ></SelectLocationByLevelForm>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[4]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[5]}`]?.data ? (
                <ScanHandlingUnit
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[5]}
                    label={t('common:handling-unit-final')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true, backButton: true }}
                    checkComponent={(data: any) => <HandlingUnitFinalChecks dataToCheck={data} />}
                    defaultValue={
                        storedObject[`step${workflow.expectedSteps[3]}`].data.finalHandlingUnit ??
                        undefined
                    }
                ></ScanHandlingUnit>
            ) : (
                <></>
            )}

            {storedObject[`step${workflow.expectedSteps[5]}`]?.data ? (
                <ValidateHuMoveForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[6]}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    headerContent={{ setHeaderContent }}
                ></ValidateHuMoveForm>
            ) : (
                <></>
            )}
        </PageContentWrapper>
    );
};

HuMovement.layout = MainLayout;

export default HuMovement;
