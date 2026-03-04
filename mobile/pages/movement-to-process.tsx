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
import { PageContentWrapper, NavButton, UpperMobileSpinner } from '@components';
import MainLayout from 'components/layouts/MainLayout';
import { FC, useEffect, useState } from 'react';
import { HeaderContent, RadioInfosHeader } from '@components';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Space } from 'antd';
import { ArrowLeftOutlined, UndoOutlined, CheckCircleFilled } from '@ant-design/icons';
import { useRouter } from 'next/router';
import {
    ScanHandlingUnit_reducer,
    ScanLocation_reducer,
    ScanArticle_reducer,
    SimilarLocationsV2
} from '@CommonRadio';
import { LocationChecks } from 'modules/StockManagement/MovementToProcess/ChecksAndRecords/LocationChecks';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { SelectLocationByLevelForm_reducer } from 'modules/StockManagement/MovementToProcess/Forms/SelectLocationByLevelForm_reducer';
import { HandlingUnitChecks } from 'modules/StockManagement/MovementToProcess/ChecksAndRecords/HandlingUnitChecks';
import { ValidateMovementToProcessForm } from 'modules/StockManagement/MovementToProcess/Forms/ValidateMovementToProcess';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';
import { ArticleChecks } from 'modules/StockManagement/MovementToProcess/ChecksAndRecords/ArticleChecks';
import { QuantityChecks } from 'modules/StockManagement/MovementToProcess/ChecksAndRecords/QuantityChecks';
import { EnterQuantity_reducer } from 'modules/StockManagement/MovementToProcess/PagesContainer/EnterQuantity_reducer';
import { SelectContentForArticleForm_reducer } from 'modules/StockManagement/MovementToProcess/Forms/SelectContentForArticleForm_reducer';
import { SelectMovementCarousel } from 'modules/StockManagement/MovementToProcess/Forms/SelectMovementCarousel';

type PageComponent = FC & { layout: typeof MainLayout };

const MovementToProcess: PageComponent = () => {
    const { t } = useTranslation();
    const router = useRouter();
    const [triggerRender, setTriggerRender] = useState<boolean>(true);
    const [headerContent, setHeaderContent] = useState<boolean>(false);
    const { graphqlRequestClient } = useAuth();
    const [expectedOriginLocation, setExpectedOriginLocation] = useState<
        | {
              [key: string]: any;
          }
        | string
    >();
    const [showSimilarLocations, setShowSimilarLocations] = useState<boolean>(false);
    const [showEmptyLocations, setShowEmptyLocations] = useState<boolean>(false);
    const [expectedFinalLocation, setExpectedFinalLocation] = useState<{ [key: string]: any }>();

    //define workflow parameters
    const processName = 'movementToProcess';

    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};

    //step10: select Movement
    //step20: scan Location (origin)
    //step25: select Location by level (origin)
    //step30: scan Handling Unit (origin)
    //step40: scan Article or Feature
    //step50: select Content for Article
    //step60: enter Quantity
    //step70: scan Location (final)
    //step75: select Location by level (final)
    //step80: scan Handling Unit (final)
    //step90: validate Quantity Move

    console.log(`${processName}`, storedObject);

    const movement = storedObject['step10']?.data?.movement;
    const isFullHuMoving = !movement?.articleIdStr && !movement?.quantity;
    const canChangeDestinationLocation = movement?.finalLocationIdStr ? false : true;

    const getLocation = async (id: any): Promise<{ [key: string]: any } | undefined> => {
        if (id) {
            const query = gql`
                query location($id: String!) {
                    location(id: $id) {
                        id
                        name
                        huManagement
                    }
                }
            `;

            const variables = {
                id
            };

            const location = await graphqlRequestClient.request(query, variables);
            return location;
        }
    };

    useEffect(() => {
        async function fetchData() {
            if (movement) {
                const originLocation = await getLocation(movement?.originalLocationIdStr);
                if (originLocation) {
                    setExpectedOriginLocation(originLocation.location);
                } else {
                    setExpectedOriginLocation('noExpectedOriginLocation');
                }
                const finalLocation = await getLocation(movement?.finalLocationIdStr);
                if (finalLocation) {
                    setExpectedFinalLocation(finalLocation.location);
                }
            } else {
                setExpectedOriginLocation(undefined);
                setExpectedFinalLocation(undefined);
            }
        }
        fetchData();
    }, [movement, storedObject]);

    //function to retrieve information to display in RadioInfosHeader
    const headerDisplay: { [k: string]: any } = {};
    const checkIcon = <CheckCircleFilled style={{ color: '#52c41a', marginLeft: '5px' }} />;

    if (storedObject['step10']?.data?.movement) {
        // Movement - toujours validé dès qu'il est sélectionné
        headerDisplay[t('common:movement')] = <span>{movement?.number}</span>;

        // Location origine - validée après step25 (chosenLocation) ou step30 si huManagement
        headerDisplay[t('common:location-origin_abbr')] = (
            <span>
                {movement?.originalLocationNameStr}
                {(typeof expectedOriginLocation === 'object' && expectedOriginLocation?.huManagement
                    ? storedObject['step30']?.data?.handlingUnit
                    : storedObject['step25']?.data?.chosenLocation) && checkIcon}
            </span>
        );

        // Handling Unit origine - validé après step30 (handlingUnit)
        typeof expectedOriginLocation === 'object' && expectedOriginLocation?.huManagement
            ? (headerDisplay[t('common:handling-unit-origin_abbr')] = (
                  <span>
                      {movement?.originalHandlingUnitNameStr}
                      {storedObject['step30']?.data?.handlingUnit && checkIcon}
                  </span>
              ))
            : undefined;

        // Stock Owner - validé après step50 (chosenContent) pour les mouvements non-fullHU
        if (!isFullHuMoving) {
            headerDisplay[t('common:stock-owner')] = (
                <span>
                    {movement?.stockOwnerNameStr}
                    {storedObject['step50']?.data?.chosenContent ? checkIcon : null}
                </span>
            );
        }

        // Article - validé après step40 (articleLuBarcode) pour les mouvements non-fullHU
        if (!isFullHuMoving) {
            headerDisplay[t('common:article')] = (
                <span>
                    {movement?.articleNameStr}
                    {storedObject['step40']?.data?.articleLuBarcode ? checkIcon : null}
                </span>
            );
        }

        // Quantity - validée après step60 (movingQuantity) pour les mouvements non-fullHU
        if (!isFullHuMoving) {
            const movingQuantity = storedObject['step60']?.data?.movingQuantity;
            const totalQuantity = movement?.quantity;
            const isPartialQuantity = movingQuantity && movingQuantity < totalQuantity;

            headerDisplay[t('common:quantity')] = (
                <span>
                    {isPartialQuantity ? `${movingQuantity} / ${totalQuantity}` : totalQuantity}
                    {movingQuantity ? (
                        isPartialQuantity ? (
                            <span style={{ color: '#fa8c16', marginLeft: '5px' }}>⚠️</span>
                        ) : (
                            checkIcon
                        )
                    ) : null}
                </span>
            );
        }

        // Stock Status - validé après step50 (chosenContent) pour les mouvements non-fullHU
        if (!isFullHuMoving) {
            headerDisplay[t('common:stock-status')] = (
                <span>
                    {movement?.initialStatusText}
                    {storedObject['step50']?.data?.chosenContent ? checkIcon : null}
                </span>
            );
        }

        // Reservation - validée après step50 (chosenContent) pour les mouvements non-fullHU
        if (!isFullHuMoving) {
            headerDisplay[t('common:reservation')] = (
                <span>
                    {movement?.initialReservation}
                    {storedObject['step50']?.data?.chosenContent ? checkIcon : null}
                </span>
            );
        }

        // Location finale - validée après step75 (chosenLocation)
        headerDisplay[t('common:location-final_abbr')] = (
            <span>
                {movement?.finalLocationNameStr}
                {storedObject['step75']?.data?.chosenLocation && checkIcon}
            </span>
        );

        // Handling Unit finale - validé après step80 (handlingUnit)
        expectedFinalLocation?.huManagement
            ? (headerDisplay[t('common:handling-unit-final_abbr')] = (
                  <span>
                      {movement?.finalHandlingUnitNameStr ??
                          storedObject['step80']?.data?.handlingUnit?.name}
                      {!movement?.finalHandlingUnitNameStr &&
                          storedObject['step80']?.data?.handlingUnit?.name &&
                          ` (${t('common:new')})`}
                      {storedObject['step80']?.data?.handlingUnit && checkIcon}
                  </span>
              ))
            : undefined;
    }
    const onReset = () => {
        dispatch({
            type: 'DELETE_RF_PROCESS',
            processName
        });
        setHeaderContent(false);
    };

    const previousPage = () => {
        dispatch({
            type: 'DELETE_RF_PROCESS',
            processName
        });
        router.back();
        setHeaderContent(false);
    };

    const [isLoading, setIsLoading] = useState<boolean>(false);

    return (
        <PageContentWrapper>
            <HeaderContent
                title={t('common:movement-to-process')}
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
            {isLoading ? <UpperMobileSpinner></UpperMobileSpinner> : <></>}
            <div hidden={isLoading}>
                {canChangeDestinationLocation &&
                showSimilarLocations &&
                storedObject['step10']?.data ? (
                    <SimilarLocationsV2
                        articleId={movement?.articleIdStr}
                        originalContentId={movement?.originalContentIdStr}
                        stockOwnerId={movement?.stockOwnerIdStr}
                        stockStatus={movement?.stockStatus}
                        reservation={movement?.reservation}
                        processName={'movement-to-process'}
                    />
                ) : (
                    <></>
                )}
                {canChangeDestinationLocation &&
                showEmptyLocations &&
                storedObject['step50']?.data ? (
                    <SimilarLocationsV2
                        isEmptyLocations={true}
                        articleId={movement?.articleIdStr}
                        processName={'movement-to-process'}
                    />
                ) : (
                    <></>
                )}
                {!storedObject['step10']?.data ? (
                    <SelectMovementCarousel
                        processName={processName}
                        stepNumber={10}
                        buttons={{ submitButton: false }}
                    ></SelectMovementCarousel>
                ) : (
                    <></>
                )}
                {expectedOriginLocation &&
                storedObject['step10']?.data &&
                !storedObject['step20']?.data ? (
                    <ScanLocation_reducer
                        processName={processName}
                        stepNumber={20}
                        label={t('common:location-origin')}
                        buttons={{ submitButton: true, backButton: true }}
                        defaultValue={
                            expectedOriginLocation &&
                            typeof expectedOriginLocation === 'object' &&
                            expectedOriginLocation?.huManagement
                                ? expectedOriginLocation
                                : undefined
                        }
                        checkComponent={(data: any) => <LocationChecks dataToCheck={data} />}
                    ></ScanLocation_reducer>
                ) : (
                    <></>
                )}
                {storedObject['step20']?.data && !storedObject['step25']?.data ? (
                    <SelectLocationByLevelForm_reducer
                        processName={processName}
                        stepNumber={25}
                        buttons={{ submitButton: true, backButton: true }}
                        locations={storedObject['step20'].data.locations}
                        expectedLocationId={
                            storedObject['step10']?.data?.movement?.originalLocationIdStr
                        }
                        isOriginLocation={true}
                    ></SelectLocationByLevelForm_reducer>
                ) : (
                    <></>
                )}
                {storedObject['step25']?.data && !storedObject['step30']?.data ? (
                    <ScanHandlingUnit_reducer
                        processName={processName}
                        stepNumber={30}
                        label={t('common:handling-unit-origin')}
                        buttons={{ submitButton: true, backButton: true }}
                        enforcedValue={
                            !storedObject['step25']?.data?.chosenLocation.huManagement
                                ? storedObject['step25']?.data?.chosenLocation.name
                                : undefined
                        }
                        checkComponent={(data: any) => (
                            <HandlingUnitChecks
                                dataToCheck={data}
                                expectedHandlingUnitId={
                                    storedObject['step10']?.data?.movement
                                        ?.originalHandlingUnitIdStr
                                }
                            />
                        )}
                    ></ScanHandlingUnit_reducer>
                ) : (
                    <></>
                )}
                {!isFullHuMoving &&
                storedObject['step30']?.data &&
                !storedObject['step40']?.data ? (
                    <ScanArticle_reducer
                        processName={processName}
                        stepNumber={40}
                        label={t('common:article')}
                        buttons={{
                            submitButton: true,
                            backButton: true
                        }}
                        checkComponent={(data: any) => <ArticleChecks dataToCheck={data} />}
                    ></ScanArticle_reducer>
                ) : (
                    <></>
                )}
                {!isFullHuMoving &&
                storedObject['step40']?.data &&
                !storedObject['step50']?.data ? (
                    <SelectContentForArticleForm_reducer
                        processName={processName}
                        stepNumber={50}
                        buttons={{ backButton: true }}
                        articleId={storedObject['step40']?.data?.articleLuBarcode.articleId}
                        locationId={storedObject['step25'].data.chosenLocation.id}
                        handlingUnitId={storedObject['step30'].data.handlingUnit.id}
                        isStockOwnerOptional={true}
                        expectedContentId={
                            storedObject['step10']?.data?.movement?.originalContentIdStr
                        }
                    ></SelectContentForArticleForm_reducer>
                ) : (
                    <></>
                )}
                {!isFullHuMoving &&
                storedObject['step50']?.data &&
                !storedObject['step60']?.data ? (
                    <EnterQuantity_reducer
                        processName={processName}
                        stepNumber={60}
                        buttons={{ submitButton: true, backButton: true }}
                        availableQuantity={storedObject['step50']?.data.chosenContent?.quantity}
                        checkComponent={(data: any) => <QuantityChecks dataToCheck={data} />}
                        initialValueType={2}
                    ></EnterQuantity_reducer>
                ) : (
                    <></>
                )}
                {!storedObject['step70']?.data &&
                ((isFullHuMoving && storedObject['step30']?.data) ||
                    (!isFullHuMoving && storedObject['step60']?.data)) ? (
                    <ScanLocation_reducer
                        processName={processName}
                        stepNumber={70}
                        label={t('common:location-final')}
                        buttons={{
                            submitButton: true,
                            backButton: true,
                            locationButton: canChangeDestinationLocation,
                            emptyButton: canChangeDestinationLocation
                        }}
                        headerContent={{ headerContent, setHeaderContent }}
                        showSimilarLocations={{ showSimilarLocations, setShowSimilarLocations }}
                        showEmptyLocations={{ showEmptyLocations, setShowEmptyLocations }}
                        defaultValue={
                            expectedFinalLocation &&
                            expectedFinalLocation?.huManagement &&
                            movement?.finalHandlingUnitIdStr
                                ? expectedFinalLocation
                                : undefined
                        }
                        checkComponent={(data: any) => <LocationChecks dataToCheck={data} />}
                    ></ScanLocation_reducer>
                ) : (
                    <></>
                )}
                {storedObject['step70']?.data && !storedObject['step75']?.data ? (
                    <SelectLocationByLevelForm_reducer
                        processName={processName}
                        stepNumber={75}
                        buttons={{ submitButton: true, backButton: true }}
                        locations={storedObject['step70'].data.locations}
                        expectedLocationId={
                            storedObject['step10']?.data?.movement?.finalLocationIdStr
                        }
                        originLocationId={storedObject['step25'].data.chosenLocation.id}
                    ></SelectLocationByLevelForm_reducer>
                ) : (
                    <></>
                )}
                {storedObject['step75']?.data && !storedObject['step80']?.data ? (
                    <ScanHandlingUnit_reducer
                        processName={processName}
                        stepNumber={80}
                        label={t('common:handling-unit-final')}
                        buttons={{ submitButton: true, backButton: true }}
                        defaultValue={
                            isFullHuMoving && !movement.finalHandlingUnitIdStr
                                ? 'isFullHuMoving'
                                : undefined
                        }
                        enforcedValue={
                            !storedObject['step75']?.data?.chosenLocation.huManagement
                                ? storedObject['step75']?.data?.chosenLocation.name
                                : undefined
                        }
                        checkComponent={(data: any) => (
                            <HandlingUnitChecks
                                dataToCheck={data}
                                canHuBeNew={true}
                                chosenLocationId={storedObject['step75']?.data?.chosenLocation.id}
                            />
                        )}
                    ></ScanHandlingUnit_reducer>
                ) : (
                    <></>
                )}

                {storedObject['step80']?.data ? (
                    <ValidateMovementToProcessForm
                        processName={processName}
                        stepNumber={90}
                        buttons={{ submitButton: true, backButton: true }}
                        trigger={{ triggerRender, setTriggerRender }}
                        headerContent={{ setHeaderContent }}
                    ></ValidateMovementToProcessForm>
                ) : (
                    <></>
                )}
            </div>
        </PageContentWrapper>
    );
};

MovementToProcess.layout = MainLayout;

export default MovementToProcess;
