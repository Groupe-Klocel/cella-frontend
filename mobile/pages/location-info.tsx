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
    ScanLocationForm,
    SelectLocationByLevelForm,
    SelectHandlingUnitForLocationForm,
    SelectContentForHandlingUnitForm
} from '@CommonRadio';

type PageComponent = FC & { layout: typeof MainLayout };

const LocationInfo: PageComponent = () => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const router = useRouter();
    const [triggerRender, setTriggerRender] = useState<boolean>(true);
    const [originDisplay, setOriginDisplay] = useState<any>({});
    const [finalDisplay, setFinalDisplay] = useState<any>({});
    const [headerContent, setHeaderContent] = useState<boolean>(false);
    const [displayed, setDisplayed] = useState<any>({});
    //const [showEmptyLocations, setShowEmptyLocations] = useState<boolean>(false);
    //define workflow parameters
    const workflow = {
        processName: 'locationInfo',
        expectedSteps: [10, 20, 30, 40]
    };
    const locationInfo = JSON.parse(storage.get(workflow.processName) || '{}');

    //initialize workflow on step 0
    if (Object.keys(locationInfo).length === 0) {
        locationInfo[`step${workflow.expectedSteps[0]}`] = { previousStep: 0 };
        locationInfo['currentStep'] = workflow.expectedSteps[0];
        storage.set(workflow.processName, JSON.stringify(locationInfo));
    }

    //function to retrieve information to display in RadioInfosHeader
    useEffect(() => {
        const object: { [k: string]: any } = {};
        if (locationInfo[`step${workflow.expectedSteps[0]}`]?.data?.locations) {
            const locations = locationInfo[`step${workflow.expectedSteps[0]}`]?.data?.locations;
            object[t('common:location')] = locations[0].name;
        }
        setOriginDisplay(object);
        setFinalDisplay(object);
    }, [triggerRender]);

    useEffect(() => {
        const object: { [k: string]: any } = {};
        if (locationInfo[`step${workflow.expectedSteps[1]}`]?.data?.chosenLocation) {
            const chosenLocation =
                locationInfo[`step${workflow.expectedSteps[1]}`]?.data?.chosenLocation;
            object[t('common:location')] = chosenLocation.name;
        }
        setOriginDisplay(object);
        setFinalDisplay(object);
    }, [triggerRender]);

    useEffect(() => {
        const object: { [k: string]: any } = {};
        if (locationInfo[`step${workflow.expectedSteps[2]}`]?.data?.chosenHandlingUnit) {
            const chosenHandlingUnit =
                locationInfo[`step${workflow.expectedSteps[2]}`]?.data?.chosenHandlingUnit;
            object[t('common:location_abbr')] = chosenHandlingUnit.location.name;
            object[t('common:category')] = chosenHandlingUnit.location.categoryText;
            object[t('common:handling-unit_abbr')] = chosenHandlingUnit.name;
        }
        setOriginDisplay(object);
        setFinalDisplay(object);
    }, [triggerRender]);

    useEffect(() => {
        headerContent ? setDisplayed(finalDisplay) : setDisplayed(originDisplay);
    }, [originDisplay, finalDisplay, headerContent]);

    const onReset = () => {
        storage.remove(workflow.processName);
        setHeaderContent(false);
        //setShowEmptyLocations(false);
        setTriggerRender(!triggerRender);
    };

    const previousPage = () => {
        router.back();
        storage.remove(workflow.processName);
        setHeaderContent(false);
        //setShowEmptyLocations(false);
    };

    return (
        <PageContentWrapper>
            <HeaderContent
                title={t('common:location')}
                actionsRight={
                    <Space>
                        {locationInfo.currentStep > workflow.expectedSteps[0] ? (
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
            {!locationInfo[`step${workflow.expectedSteps[0]}`]?.data ? (
                <ScanLocationForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[0]}
                    label={t('common:location')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{
                        submitButton: true,
                        backButton: false,
                        emptyButton: false
                    }}
                    headerContent={{ headerContent, setHeaderContent }}
                ></ScanLocationForm>
            ) : (
                <></>
            )}
            {locationInfo[`step${workflow.expectedSteps[0]}`]?.data &&
            !locationInfo[`step${workflow.expectedSteps[1]}`]?.data ? (
                <SelectLocationByLevelForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[1]}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    locations={locationInfo[`step${workflow.expectedSteps[0]}`].data.locations}
                ></SelectLocationByLevelForm>
            ) : (
                <></>
            )}
            {locationInfo[`step${workflow.expectedSteps[1]}`]?.data &&
            !locationInfo[`step${workflow.expectedSteps[2]}`]?.data ? (
                <SelectHandlingUnitForLocationForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[2]}
                    buttons={{ backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    locationId={
                        locationInfo[`step${workflow.expectedSteps[1]}`]?.data?.chosenLocation.id
                    }
                ></SelectHandlingUnitForLocationForm>
            ) : (
                <></>
            )}
            {locationInfo[`step${workflow.expectedSteps[2]}`]?.data &&
            !locationInfo[`step${workflow.expectedSteps[3]}`]?.data ? (
                <SelectContentForHandlingUnitForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[3]}
                    buttons={{ backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    HandlingUnitId={
                        locationInfo[`step${workflow.expectedSteps[2]}`]?.data?.chosenHandlingUnit
                            .id
                    }
                    HideSelect={1}
                ></SelectContentForHandlingUnitForm>
            ) : (
                <></>
            )}
        </PageContentWrapper>
    );
};

LocationInfo.layout = MainLayout;

export default LocationInfo;
