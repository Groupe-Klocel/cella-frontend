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
    ScanPalletForm,
    EmptyLocations,
    ScanLocationForm,
    SelectLocationByLevelForm
} from '@CommonRadio';
import { CheckFinalLocationPalletForm } from 'modules/StockManagement/Forms/CheckFinalLocationPalletForm';
import { ValidatePalletMoveForm } from 'modules/StockManagement/Forms/ValidatePalletMove';

type PageComponent = FC & { layout: typeof MainLayout };

const PalletMovement: PageComponent = () => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const router = useRouter();
    const [triggerRender, setTriggerRender] = useState<boolean>(true);
    const [originDisplay, setOriginDisplay] = useState<any>({});
    const [finalDisplay, setFinalDisplay] = useState<any>({});
    const [headerContent, setHeaderContent] = useState<boolean>(false);
    const [displayed, setDisplayed] = useState<any>({});
    const [showEmptyLocations, setShowEmptyLocations] = useState<boolean>(false);
    //define workflow parameters
    const workflow = {
        processName: 'palletMvt',
        expectedSteps: [10, 50, 60, 65, 70]
    };
    const palletMvt = JSON.parse(storage.get(workflow.processName) || '{}');

    //initialize workflow on step 0
    if (Object.keys(palletMvt).length === 0) {
        palletMvt[`step${workflow.expectedSteps[0]}`] = { previousStep: 0 };
        palletMvt['currentStep'] = workflow.expectedSteps[0];
        storage.set(workflow.processName, JSON.stringify(palletMvt));
    }

    //function to retrieve information to display in RadioInfosHeader
    useEffect(() => {
        const object: { [k: string]: any } = {};
        if (palletMvt[`step${workflow.expectedSteps[0]}`]?.data?.handlingUnit) {
            const handlingUnit = palletMvt[`step${workflow.expectedSteps[0]}`]?.data?.handlingUnit;
            object[t('common:pallet-code')] = handlingUnit.code;
            object[t('common:location-origin_abbr')] = handlingUnit.location.name;
        }
        if (
            palletMvt[`step${workflow.expectedSteps[1]}`]?.data?.locations &&
            palletMvt[`step${workflow.expectedSteps[1]}`]?.data?.locations?.length > 1
        ) {
            const locationsList = palletMvt[`step${workflow.expectedSteps[1]}`]?.data?.locations;
            object[t('common:location-final_abbr')] = locationsList[0].barcode;
        }
        if (palletMvt[`step${workflow.expectedSteps[2]}`]?.data?.chosenLocation) {
            const location = palletMvt[`step${workflow.expectedSteps[2]}`]?.data?.chosenLocation;
            object[t('common:location-final_abbr')] = location.name;
        }
        setOriginDisplay(object);
        setFinalDisplay(object);
    }, [triggerRender]);

    useEffect(() => {
        headerContent ? setDisplayed(finalDisplay) : setDisplayed(originDisplay);
    }, [originDisplay, finalDisplay, headerContent]);

    const onReset = () => {
        storage.remove(process);
        setHeaderContent(false);
        setShowEmptyLocations(false);
        setTriggerRender(!triggerRender);
    };

    const previousPage = () => {
        router.back();
        storage.remove(process);
        setHeaderContent(false);
        setShowEmptyLocations(false);
    };

    return (
        <PageContentWrapper>
            <HeaderContent
                title={t('common:movement')}
                actionsRight={
                    <Space>
                        {palletMvt.currentStep > workflow.expectedSteps[0] ? (
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
            {showEmptyLocations &&
            palletMvt[`step${workflow.expectedSteps[0]}`].data.handlingUnit.handlingUnitContents ? (
                <EmptyLocations />
            ) : (
                <></>
            )}
            {!palletMvt[`step${workflow.expectedSteps[0]}`]?.data ? (
                <ScanPalletForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[0]}
                    label={t('common:pallet-origin')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true }}
                ></ScanPalletForm>
            ) : (
                <></>
            )}
            {palletMvt[`step${workflow.expectedSteps[0]}`]?.data &&
            !palletMvt[`step${workflow.expectedSteps[1]}`]?.data ? (
                <ScanLocationForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[1]}
                    label={t('common:location-final')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{
                        submitButton: true,
                        backButton: true,
                        emptyButton: true
                    }}
                    headerContent={{ headerContent, setHeaderContent }}
                    showEmptyLocations={{ showEmptyLocations, setShowEmptyLocations }}
                ></ScanLocationForm>
            ) : (
                <></>
            )}
            {palletMvt[`step${workflow.expectedSteps[1]}`]?.data &&
            !palletMvt[`step${workflow.expectedSteps[2]}`]?.data ? (
                <SelectLocationByLevelForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[2]}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    locations={palletMvt[`step${workflow.expectedSteps[1]}`].data.locations}
                ></SelectLocationByLevelForm>
            ) : (
                <></>
            )}
            {palletMvt[`step${workflow.expectedSteps[2]}`]?.data &&
            !palletMvt[`step${workflow.expectedSteps[3]}`]?.data ? (
                <CheckFinalLocationPalletForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[3]}
                    trigger={{ triggerRender, setTriggerRender }}
                    articleId={
                        palletMvt[`step${workflow.expectedSteps[0]}`].data.handlingUnit
                            .handlingUnitContents[0].articleId
                    }
                    originLocationId={
                        palletMvt[`step${workflow.expectedSteps[0]}`].data.handlingUnit.locationId
                    }
                    destinationLocation={
                        palletMvt[`step${workflow.expectedSteps[2]}`].data.chosenLocation
                    }
                    headerContent={{ setHeaderContent }}
                ></CheckFinalLocationPalletForm>
            ) : (
                <></>
            )}
            {palletMvt[`step${workflow.expectedSteps[3]}`]?.data ? (
                <ValidatePalletMoveForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[4]}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    headerContent={{ setHeaderContent }}
                ></ValidatePalletMoveForm>
            ) : (
                <></>
            )}
        </PageContentWrapper>
    );
};

PalletMovement.layout = MainLayout;

export default PalletMovement;
