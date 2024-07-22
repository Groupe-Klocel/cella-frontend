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
import { EnterQuantity, SelectLocationByLevelForm } from '@CommonRadio';
import { SimilarPickingLocations } from 'modules/Preparation/PickAndPack/Elements/SimilarLocations';
import { QuantityChecks } from 'modules/Preparation/PickAndPack/ChecksAndRecords/QuantityChecks';
import { SelectRoundForm } from 'modules/Preparation/PickAndPack/Forms/SelectRoundForm';
import { HandlingUnitChecks } from 'modules/Preparation/PickAndPack/ChecksAndRecords/HandlingUnitChecks';
import { ScanLocation } from 'modules/Preparation/PickAndPack/PagesContainer/ScanLocation';
import { LocationChecks } from 'modules/Preparation/PickAndPack/ChecksAndRecords/LocationChecks';
import { ArticleChecks } from 'modules/Preparation/PickAndPack/ChecksAndRecords/ArticleChecks';
import { ScanFeature } from 'modules/Preparation/PickAndPack/PagesContainer/ScanFeature';
import { FeatureChecks } from 'modules/Preparation/PickAndPack/ChecksAndRecords/FeatureChecks';
import { ScanHandlingUnit } from 'modules/Preparation/PickAndPack/PagesContainer/ScanHandlingUnit';
import moment from 'moment';
import { ValidatePickAndPackForm } from 'modules/Preparation/PickAndPack/Forms/ValidatePickAndPack';
import { ScanArticleEAN } from 'modules/Preparation/PickAndPack/PagesContainer/ScanArticleEAN';
import { AutoValidatePickAndPackForm } from 'modules/Preparation/PickAndPack/Forms/AutoValidatePickAndPack';
import { HandlingUnitOutboundFinalChecks } from 'modules/Preparation/PickAndPack/ChecksAndRecords/HandlingUnitOutboundFinalChecks';
import { ScanFinalHandlingUnitOutbound } from 'modules/Preparation/PickAndPack/PagesContainer/ScanFinalHandlingUnitOutbound';

type PageComponent = FC & { layout: typeof MainLayout };

const PickAndPack: PageComponent = () => {
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
    const [finishUniqueFeatures, setFinishUniqueFeatures] = useState<boolean>(false);
    const [triggerHuClose, setTriggerHuClose] = useState<boolean>(false);
    const [isButtonDisplayed, setIsButtonDisplayed] = useState<boolean>(false);
    const [isAutoValidateLoading, setIsAutoValidateLoading] = useState<boolean>(false);
    const [showSimilarLocations, setShowSimilarLocations] = useState<boolean>(false);
    //define workflow parameters
    const workflow = {
        processName: 'pickAndPack',
        expectedSteps: [10, 20, 25, 30, 40, 50, 60, 70, 80]
    };
    // [0] : 10 -> SelectRoundForm
    // [1] : 20 -> Scan location
    // [2] : 25 -> SelectLocation
    // [3] : 30 -> Scan HU
    // [4] : 40 -> Scan Article
    // [5] : 50 -> Scan features
    // [6] : 60 -> Enter quantity
    // [7] : 70 -> (for detail only) scan finalHU
    // [8] : 80 -> Autovalidate pickAndPack
    const storedObject = JSON.parse(storage.get(workflow.processName) || '{}');

    console.log('pickAndPack', storedObject);

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
            storedObject[`step${workflow.expectedSteps[0]}`]?.data?.proposedRoundAdvisedAddresses
        ) {
            const round = storedObject[`step${workflow.expectedSteps[0]}`]?.data?.round;
            const totalProcessedQuantity = round.roundAdvisedAddresses.reduce(
                (sum: number, address: any) => {
                    return sum + address.roundLineDetail.processedQuantity;
                },
                0
            );
            const proposedRoundAdvisedAddress =
                storedObject[`step${workflow.expectedSteps[0]}`]?.data
                    ?.proposedRoundAdvisedAddresses[0];
            object[t('common:round')] = round.name;
            object[t('common:total-picked-quantity')] =
                totalProcessedQuantity + '/' + round.nbPickArticle;
            if (
                storedObject[`step${workflow.expectedSteps[0]}`]?.data?.pickAndPackType === 'detail'
            ) {
                object[t('common:handling-unit-final_abbr')] =
                    proposedRoundAdvisedAddress?.roundLineDetail?.handlingUnitContentOutbounds[0]?.handlingUnitOutbound?.name;
            }
            if (!storedObject[`step${workflow.expectedSteps[2]}`]?.data?.chosenLocation) {
                object[t('common:expected-location_abbr')] =
                    proposedRoundAdvisedAddress.location.name;
            } else {
                object[t('common:location_abbr')] =
                    storedObject[`step${workflow.expectedSteps[2]}`]?.data?.chosenLocation.name;
            }
            if (proposedRoundAdvisedAddress?.handlingUnitContent?.stockOwner) {
                if (!storedObject[`step${workflow.expectedSteps[3]}`]?.data?.handlingUnit) {
                    const handlingUnitContent = proposedRoundAdvisedAddress?.handlingUnitContent;
                    object[t('common:expected-stock-owner_abbr')] =
                        handlingUnitContent.stockOwner?.name;
                } else {
                    object[t('common:handling-unit_abbr')] =
                        storedObject[`step${workflow.expectedSteps[3]}`]?.data?.handlingUnit?.name;
                    object[t('common:stock-owner_abbr')] =
                        storedObject[
                            `step${workflow.expectedSteps[3]}`
                        ]?.data?.handlingUnit?.handlingUnitContents[0]?.stockOwner?.name;
                }
            }
            if (!storedObject[`step${workflow.expectedSteps[4]}`]?.data?.article) {
                object[t('common:expected-article_abbr')] =
                    proposedRoundAdvisedAddress.handlingUnitContent.article?.name;
            } else {
                object[t('common:article_abbr')] =
                    storedObject[`step${workflow.expectedSteps[4]}`]?.data?.article.name;
            }
            if (storedObject[`step${workflow.expectedSteps[4]}`]?.data?.content) {
                object[t('common:available-quantity')] =
                    storedObject[`step${workflow.expectedSteps[4]}`]?.data?.content.quantity;
            }
            if (storedObject[`step${workflow.expectedSteps[5]}`]?.data?.processedFeatures) {
                const processedFeatures =
                    storedObject[`step${workflow.expectedSteps[5]}`]?.data?.processedFeatures;
                processedFeatures.map((feature: any) => {
                    const { featureCode, value } = feature;
                    let formattedValue = value;
                    if (!Array.isArray(value)) {
                        // If it's a date type and a valid date in 'YYYY-MM-DD' format, format it
                        if (featureCode.dateType && moment(value, 'YYYY-MM-DD', true).isValid()) {
                            formattedValue = moment(value).format('YYYY-MM-DD');
                        }
                    } else {
                        formattedValue = value.join(' / ');
                    }
                    object[featureCode.name] = formattedValue;
                });
            }
            if (!storedObject[`step${workflow.expectedSteps[6]}`]?.data?.movingQuantity) {
                object[t('common:expected-quantity_abbr')] = storedObject[
                    `step${workflow.expectedSteps[0]}`
                ]?.data?.proposedRoundAdvisedAddresses.reduce(
                    (total: number, current: any) => total + current.quantity,
                    0
                );
            } else {
                object[t('common:quantity_abbr')] =
                    storedObject[`step${workflow.expectedSteps[6]}`]?.data?.movingQuantity +
                    '/' +
                    storedObject[
                        `step${workflow.expectedSteps[0]}`
                    ]?.data?.proposedRoundAdvisedAddresses.reduce(
                        (total: number, current: any) => total + current.quantity,
                        0
                    );
            }
        }
        setOriginDisplay(object);
        setFinalDisplay(object);
    }, [triggerRender, isAutoValidateLoading]);

    // retrieve location, article and qty to propose
    useEffect(() => {
        if (storedObject[`step${workflow.expectedSteps[0]}`]?.data?.proposedRoundAdvisedAddresses) {
            setLocationToPropose(
                storedObject[`step${workflow.expectedSteps[0]}`]?.data
                    ?.proposedRoundAdvisedAddresses[0].location?.name
            );
            setArticleToPropose(
                storedObject[`step${workflow.expectedSteps[0]}`]?.data
                    ?.proposedRoundAdvisedAddresses[0]?.handlingUnitContent?.article?.name
            );
        }

        if (storedObject[`step${workflow.expectedSteps[0]}`]?.data?.round) {
            const currentShippingPalletId =
                storedObject[`step${workflow.expectedSteps[0]}`]?.data?.round.extraText1;
            const isButtonDisplayed = currentShippingPalletId ? true : false;
            setIsButtonDisplayed(isButtonDisplayed);
        }
    }, [storedObject, triggerRender]);

    useEffect(() => {
        headerContent ? setDisplayed(finalDisplay) : setDisplayed(originDisplay);
    }, [originDisplay, finalDisplay, headerContent]);

    const onReset = () => {
        storage.removeAll();
        setHeaderContent(false);
        setShowEmptyLocations(false);
        setShowSimilarLocations(false);
        setTriggerRender(!triggerRender);
    };

    const previousPage = () => {
        router.back();
        storage.removeAll();
        setHeaderContent(false);
        setShowSimilarLocations(false);
        setShowEmptyLocations(false);
    };

    return (
        <PageContentWrapper>
            <HeaderContent
                title={t('common:pickAndPack')}
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
            {showSimilarLocations && storedObject[`step${workflow.expectedSteps[0]}`]?.data ? (
                <SimilarPickingLocations
                    articleId={
                        storedObject[`step${workflow.expectedSteps[0]}`].data
                            .proposedRoundAdvisedAddresses[0].handlingUnitContent.articleId
                    }
                    chosenContentId={
                        storedObject[`step${workflow.expectedSteps[0]}`].data
                            .proposedRoundAdvisedAddresses[0].handlingUnitContent.id
                    }
                    stockOwnerId={
                        storedObject[`step${workflow.expectedSteps[0]}`].data
                            .proposedRoundAdvisedAddresses[0].handlingUnitContent.stockOwnerId
                    }
                    stockStatus={
                        storedObject[`step${workflow.expectedSteps[0]}`].data
                            .proposedRoundAdvisedAddresses[0].handlingUnitContent.stockStatus
                    }
                />
            ) : (
                <></>
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
                <ScanLocation
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[1]}
                    label={t('common:location-var', {
                        name: `${locationToPropose}`
                    })}
                    trigger={{ triggerRender, setTriggerRender }}
                    triggerAlternativeSubmit1={{
                        triggerAlternativeSubmit1: triggerHuClose,
                        setTriggerAlternativeSubmit1: setTriggerHuClose
                    }}
                    buttons={{
                        submitButton: true,
                        backButton: true,
                        alternativeSubmitButton1: isButtonDisplayed,
                        locationButton: true
                    }}
                    checkComponent={(data: any) => <LocationChecks dataToCheck={data} />}
                    showSimilarLocations={{ showSimilarLocations, setShowSimilarLocations }}
                    showEmptyLocations={{ showEmptyLocations, setShowEmptyLocations }}
                    headerContent={{ headerContent, setHeaderContent }}
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
                <ScanHandlingUnit
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[3]}
                    label={t('common:handling-unit')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{
                        submitButton: true,
                        backButton: true
                    }}
                    checkComponent={(data: any) => <HandlingUnitChecks dataToCheck={data} />}
                    defaultValue={
                        storedObject[`step${workflow.expectedSteps[2]}`].data.handlingUnit ??
                        undefined
                    }
                ></ScanHandlingUnit>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[3]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[4]}`]?.data ? (
                <ScanArticleEAN
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[4]}
                    label={t('common:article-var', {
                        name: `${articleToPropose}`
                    })}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{
                        submitButton: true,
                        backButton: true
                    }}
                    contents={
                        storedObject[`step${workflow.expectedSteps[3]}`]?.data?.handlingUnit
                            ?.handlingUnitContents
                    }
                    checkComponent={(data: any) => <ArticleChecks dataToCheck={data} />}
                ></ScanArticleEAN>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[4]}`]?.data &&
            !(
                storedObject[`step${workflow.expectedSteps[5]}`]?.data?.remainingFeatures
                    ?.length === 0
            ) ? (
                <ScanFeature
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[5]}
                    label={t('common:feature-code')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{
                        submitButton: true,
                        backButton: true
                    }}
                    contentFeatures={
                        storedObject[`step${workflow.expectedSteps[4]}`]?.data?.content
                            ?.handlingUnitContentFeatures
                    }
                    action1Trigger={{
                        action1Trigger: finishUniqueFeatures,
                        setAction1Trigger: setFinishUniqueFeatures
                    }}
                    featureType={
                        storedObject[`step${workflow.expectedSteps[4]}`].data?.article?.featureType
                    }
                    processedFeatures={
                        storedObject[`step${workflow.expectedSteps[5]}`]?.data?.processedFeatures ??
                        undefined
                    }
                    nextFeatureCode={
                        storedObject[`step${workflow.expectedSteps[5]}`]?.data?.nextFeatureCode ??
                        undefined
                    }
                    checkComponent={(data: any) => <FeatureChecks dataToCheck={data} />}
                ></ScanFeature>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[5]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[6]}`]?.data ? (
                <EnterQuantity
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[6]}
                    label={t('common:quantity-var', {
                        number: `${storedObject[
                            `step${workflow.expectedSteps[0]}`
                        ].data.proposedRoundAdvisedAddresses.reduce(
                            (total: number, current: any) => total + current.quantity,
                            0
                        )}`
                    })}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{
                        submitButton: true,
                        backButton: true
                    }}
                    availableQuantity={Math.min(
                        storedObject[
                            `step${workflow.expectedSteps[0]}`
                        ].data.proposedRoundAdvisedAddresses.reduce(
                            (total: number, current: any) => total + current.quantity,
                            0
                        ),
                        storedObject[`step${workflow.expectedSteps[4]}`].data?.content?.quantity
                    )}
                    checkComponent={(data: any) => <QuantityChecks dataToCheck={data} />}
                ></EnterQuantity>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[6]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[7]}`]?.data ? (
                <ScanFinalHandlingUnitOutbound
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[7]}
                    label={t('common:handling-unit-final')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{
                        submitButton: true,
                        backButton: true
                    }}
                    checkComponent={(data: any) => (
                        <HandlingUnitOutboundFinalChecks dataToCheck={data} />
                    )}
                    defaultValue={
                        storedObject[`step${workflow.expectedSteps[0]}`]?.data?.pickAndPackType ===
                        'fullBox'
                            ? 'fullBox'
                            : undefined
                    }
                ></ScanFinalHandlingUnitOutbound>
            ) : (
                <></>
            )}
            {/* {storedObject[`step${workflow.expectedSteps[7]}`]?.data ? (
                <ValidatePickAndPackForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[8]}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    headerContent={{ setHeaderContent }}
                ></ValidatePickAndPackForm>
            ) : (
                <></>
            )} */}
            {storedObject[`step${workflow.expectedSteps[7]}`]?.data || isAutoValidateLoading ? (
                <AutoValidatePickAndPackForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[8]}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    headerContent={{ setHeaderContent }}
                    autoValidateLoading={{ isAutoValidateLoading, setIsAutoValidateLoading }}
                ></AutoValidatePickAndPackForm>
            ) : (
                <></>
            )}
        </PageContentWrapper>
    );
};

PickAndPack.layout = MainLayout;

export default PickAndPack;
