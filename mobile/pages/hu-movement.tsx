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
    SelectLocationByLevelForm,
    ScanLocation,
    SimilarLocations,
    ScanHandlingUnit
} from '@CommonRadio';
import { LocationChecks } from 'modules/StockManagement/HuMovement/ChecksAndRecords/LocationChecks';
import { HandlingUnitOriginChecks } from 'modules/StockManagement/HuMovement/ChecksAndRecords/HandlingUnitOriginChecks';
import { HandlingUnitFinalChecks } from 'modules/StockManagement/HuMovement/ChecksAndRecords/HandlingUnitFinalChecks';
import { ScanFinalHandlingUnit } from 'modules/StockManagement/HuMovement/PagesContainer/ScanFinalHandlingUnit';
import { ScanHuOrLocation } from 'modules/StockManagement/Forms/ScanHuOrLocationForm';
import { HuOrLocationChecks } from 'modules/StockManagement/HuMovement/ChecksAndRecords/HuOrLocationChecks';
import { ValidateHuMoveForm } from 'modules/StockManagement/Forms/ValidateHuMoveForm';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';

type PageComponent = FC & { layout: typeof MainLayout };

const HuMovement: PageComponent = () => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();
    const [triggerRender, setTriggerRender] = useState<boolean>(true);
    const [originDisplay, setOriginDisplay] = useState<any>({});
    const [finalDisplay, setFinalDisplay] = useState<any>({});
    const [headerContent, setHeaderContent] = useState<boolean>(false);
    const [displayed, setDisplayed] = useState<any>({});
    const [showSimilarLocations, setShowSimilarLocations] = useState<boolean>(false);
    const [showEmptyLocations, setShowEmptyLocations] = useState<boolean>(false);
    const [action1Trigger, setAction1Trigger] = useState<boolean>(false);
    const processName = 'huMvt';
    const storedObject = JSON.parse(storage.get(processName) || '{}');
    const [isRoundToBeChecked, setIsRoundToBeChecked] = useState<boolean>(false);

    //Step10: Scan Location (origin)
    //Step15: Select Location by Level
    //Step20: Scan Handling Unit (origin)
    //Step30: Scan Location or Handling Unit (final)
    //Step35: Select Location by Level
    //Step40: Scan Handling Unit (final)
    //Step50: Validate HU Movement

    console.log('huMvt', storedObject);

    //initialize workflow on step 0
    if (Object.keys(storedObject).length === 0) {
        storedObject['step10'] = { previousStep: 0 };
        storedObject['currentStep'] = 10;
        storage.set(processName, JSON.stringify(storedObject));
    }

    //origin parameters handling
    const getParameters = async (): Promise<{ [key: string]: any } | undefined> => {
        const query = gql`
            query parameters($filters: ParameterSearchFilters) {
                parameters(filters: $filters) {
                    count
                    itemsPerPage
                    totalPages
                    results {
                        id
                        scope
                        code
                        value
                    }
                }
            }
        `;

        const variables = {
            filters: {
                scope: 'radio',
                code: ['MOVEMENT_CHECK_ROUND']
            }
        };
        const parametersResults = await graphqlRequestClient.request(query, variables);
        return parametersResults;
    };

    useEffect(() => {
        async function fetchData() {
            const parametersResults = await getParameters();
            if (parametersResults) {
                const parameters = parametersResults.parameters.results;
                const movementRoundChecks = parameters.find(
                    (param: any) => param.code === 'MOVEMENT_CHECK_ROUND'
                ).value;
                if (movementRoundChecks) {
                    setIsRoundToBeChecked(movementRoundChecks === '1' ? true : false);
                }
            }
        }
        fetchData();
    }, []);

    //function to retrieve information to display in RadioInfosHeader before step 20
    useEffect(() => {
        const object: { [k: string]: any } = {};
        if (storedObject?.currentStep <= 20) {
            setHeaderContent(false);
        }
        if (
            storedObject['step10']?.data?.locations &&
            storedObject['step10']?.data?.locations?.length > 1
        ) {
            const locationsList = storedObject['step10']?.data?.locations;
            object[t('common:location-origin_abbr')] = locationsList[0].barcode;
        }
        if (storedObject['step15']?.data?.chosenLocation) {
            const location = storedObject['step15']?.data?.chosenLocation;
            object[t('common:location-origin_abbr')] = location.name;
        }
        if (storedObject['step20']?.data?.handlingUnit) {
            const originalHu = storedObject['step20']?.data?.handlingUnit;
            object[t('common:handling-unit-origin_abbr')] = originalHu.name;
            object[t('common:article')] =
                originalHu.handlingUnitContents.length > 0
                    ? originalHu.handlingUnitContents[0].article.name
                    : null;
        }
        if (storedObject['step35']?.data?.chosenLocation) {
            const location = storedObject['step35']?.data?.chosenLocation;
            object[t('common:location-final_abbr')] = location.name;
        }
        if (storedObject['step40']?.data?.handlingUnit) {
            const hu = storedObject['step40']?.data?.handlingUnit;
            object[t('common:handling-unit-final_abbr')] = hu.name;
        }
        setOriginDisplay(object);
    }, [triggerRender]);

    //function to retrieve information to display in RadioInfosHeader after step 20
    useEffect(() => {
        const finalObject: { [k: string]: any } = {};
        if (storedObject?.currentStep === 50) {
            const originLocation = storedObject['step15']?.data?.chosenLocation;
            finalObject[t('common:location-origin_abbr')] = originLocation.name;
            setHeaderContent(true);
        }
        if (storedObject['step20']?.data?.handlingUnit) {
            const originalHu = storedObject['step20']?.data?.handlingUnit;
            finalObject[t('common:handling-unit-origin_abbr')] = originalHu.name;
            finalObject[t('common:article')] =
                originalHu.handlingUnitContents.length > 0
                    ? originalHu.handlingUnitContents[0].article.name
                    : null;
        }
        if (storedObject['step35']?.data?.chosenLocation) {
            const chosenLocation = storedObject['step35']?.data.chosenLocation;
            finalObject[t('common:location-final_abbr')] = chosenLocation.name;
        }
        if (storedObject['step40']?.data?.finalHandlingUnit) {
            const finalHandlingUnit = storedObject['step40']?.data.finalHandlingUnit;
            finalObject[t('common:handling-unit-final_abbr')] = finalHandlingUnit.name;
        }
        setFinalDisplay(finalObject);
    }, [triggerRender]);

    useEffect(() => {
        headerContent ? setDisplayed(originDisplay) : setDisplayed(originDisplay);
    }, [originDisplay, finalDisplay, headerContent]);

    const onReset = () => {
        storage.remove(processName);
        setHeaderContent(false);
        setShowEmptyLocations(false);
        setTriggerRender(!triggerRender);
    };

    const previousPage = () => {
        router.back();
        storage.remove(processName);
        setHeaderContent(false);
        setShowEmptyLocations(false);
    };

    return (
        <PageContentWrapper>
            <HeaderContent
                title={t('common:hu-movement')}
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
            storedObject['step20']?.data.handlingUnit.handlingUnitContents.length > 0 &&
            storedObject['step20'].data.handlingUnit.handlingUnitContents[0].articleId ? (
                <SimilarLocations
                    articleId={
                        storedObject['step20'].data.handlingUnit.handlingUnitContents[0].articleId
                    }
                    chosenContentId={
                        storedObject['step20'].data.handlingUnit.handlingUnitContents[0].id
                    }
                    stockOwnerId={
                        storedObject['step20'].data.handlingUnit.handlingUnitContents[0]
                            .stockOwnerId
                    }
                    stockStatus={
                        storedObject['step20'].data.handlingUnit.handlingUnitContents[0].stockStatus
                    }
                />
            ) : (
                <></>
            )}
            {showEmptyLocations && storedObject['step20']?.data && !storedObject['step30']?.data ? (
                <EmptyLocations withAvailableHU={false} />
            ) : (
                <></>
            )}
            {!storedObject['step10']?.data ? (
                <ScanLocation
                    process={processName}
                    stepNumber={10}
                    label={t('common:location-origin')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true, backButton: false }}
                    checkComponent={(data: any) => <LocationChecks dataToCheck={data} />}
                ></ScanLocation>
            ) : (
                <></>
            )}
            {storedObject['step10']?.data && !storedObject['step15']?.data ? (
                <SelectLocationByLevelForm
                    process={processName}
                    stepNumber={15}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    locations={storedObject['step10'].data.locations}
                    roundsCheck={isRoundToBeChecked}
                    isOriginLocation={true}
                ></SelectLocationByLevelForm>
            ) : (
                <></>
            )}
            {storedObject['step15']?.data && !storedObject['step20']?.data ? (
                <ScanHandlingUnit
                    process={processName}
                    stepNumber={20}
                    label={t('common:handling-unit')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true, backButton: true }}
                    checkComponent={(data: any) => <HandlingUnitOriginChecks dataToCheck={data} />}
                ></ScanHandlingUnit>
            ) : (
                <></>
            )}
            {storedObject['step20']?.data && !storedObject['step30']?.data ? (
                <ScanHuOrLocation
                    process={processName}
                    stepNumber={30}
                    label={t('common:location-final') + ' / ' + t('common:handling-unit')}
                    buttons={{
                        submitButton: true,
                        backButton: true,
                        locationButton:
                            storedObject['step20'].data.handlingUnit.handlingUnitContents.length > 0
                                ? true
                                : false,
                        emptyButton: true
                    }}
                    trigger={{ triggerRender, setTriggerRender }}
                    showEmptyLocations={{ showEmptyLocations, setShowEmptyLocations }}
                    showSimilarLocations={{ showSimilarLocations, setShowSimilarLocations }}
                    headerContent={{ headerContent, setHeaderContent }}
                    checkComponent={(data: any) => <HuOrLocationChecks dataToCheck={data} />}
                ></ScanHuOrLocation>
            ) : (
                <></>
            )}
            {storedObject['step30']?.data && !storedObject['step35']?.data ? (
                <SelectLocationByLevelForm
                    process={processName}
                    stepNumber={35}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    locations={storedObject['step30'].data.finalLocations}
                ></SelectLocationByLevelForm>
            ) : (
                <></>
            )}
            {storedObject['step35']?.data && !storedObject['step40']?.data ? (
                <ScanFinalHandlingUnit
                    process={processName}
                    stepNumber={40}
                    label={t('common:handling-unit-final')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{
                        submitButton: true,
                        backButton: true,
                        action1Button:
                            storedObject['step30'].data.resType == 'location' ? true : false
                    }}
                    checkComponent={(data: any) => <HandlingUnitFinalChecks dataToCheck={data} />}
                    action1Trigger={{
                        action1Trigger,
                        setAction1Trigger
                    }}
                    defaultValue={
                        storedObject['step30'].data.resType == 'handlingUnit'
                            ? storedObject['step30'].data.finalHandlingUnit
                            : null
                    }
                    enforcedValue={
                        !storedObject['step35']?.data?.chosenLocation.huManagement
                            ? storedObject['step35']?.data?.chosenLocation.name
                            : undefined
                    }
                ></ScanFinalHandlingUnit>
            ) : (
                <></>
            )}

            {storedObject['step40']?.data ? (
                <ValidateHuMoveForm
                    process={processName}
                    stepNumber={50}
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
