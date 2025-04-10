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
//DESCRIPTION: select manually or automatically one location in a list of locations according to their level

import { WrapperForm, StyledForm, StyledFormItem, RadioButtons } from '@components';
import { LsIsSecured, showError } from '@helpers';
import { Select, Form, Modal } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useState } from 'react';
import CameraScanner from 'modules/Common/CameraScanner';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';
import configs from '../../../../../common/configs.json';

export interface ISelectLocationByLevelProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    showSimilarLocations?: any;
    locations: Array<any>;
    roundsCheck?: boolean;
}

export const SelectLocationByLevelForm = ({
    process,
    stepNumber,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    showSimilarLocations,
    locations,
    roundsCheck
}: ISelectLocationByLevelProps) => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');
    const { graphqlRequestClient } = useAuth();

    // TYPED SAFE ALL
    const [levelsChoices, setLevelsChoices] = useState<Array<any>>();

    //camera scanner section
    const [form] = Form.useForm();
    const [camData, setCamData] = useState();
    const [popModal, setPopModal] = useState(0);
    const [reload, setReload] = useState(false);

    const getLocations = async (scannedInfo: any): Promise<{ [key: string]: any } | undefined> => {
        if (scannedInfo) {
            const query = gql`
                query GetLocationIds($filters: LocationSearchFilters) {
                    locations(filters: $filters) {
                        count
                        itemsPerPage
                        totalPages
                        results {
                            id
                            name
                            barcode
                            aisle
                            column
                            level
                            position
                            replenish
                            blockId
                            block {
                                name
                            }
                            replenishType
                            constraint
                            comment
                            baseUnitRotation
                            allowCycleCountStockMin
                            category
                            categoryText
                            stockStatus
                            stockStatusText
                            status
                            statusText
                            handlingUnits {
                                id
                                name
                                type
                                typeText
                                barcode
                                category
                                categoryText
                                code
                                parentHandlingUnitId
                                parentHandlingUnit {
                                    id
                                    name
                                    type
                                    typeText
                                }
                                childrenHandlingUnits {
                                    id
                                    name
                                    type
                                    typeText
                                    barcode
                                    category
                                    categoryText
                                    code
                                    handlingUnitContents {
                                        id
                                        quantity
                                        reservation
                                        stockStatus
                                        stockStatusText
                                        stockOwnerId
                                        handlingUnit {
                                            id
                                            name
                                            locationId
                                            location {
                                                id
                                                name
                                            }
                                        }
                                        stockOwner {
                                            id
                                            name
                                        }
                                        articleId
                                        article {
                                            id
                                            name
                                            stockOwnerId
                                            stockOwner {
                                                name
                                            }
                                            baseUnitWeight
                                        }
                                        handlingUnitContentFeatures {
                                            id
                                            featureCode {
                                                name
                                                unique
                                            }
                                            value
                                        }
                                    }
                                }
                                reservation
                                status
                                stockOwnerId
                                stockOwner {
                                    name
                                }
                                locationId
                                location {
                                    name
                                    category
                                    categoryText
                                }
                                handlingUnitContents {
                                    id
                                    quantity
                                    reservation
                                    stockStatus
                                    stockStatusText
                                    stockOwnerId
                                    handlingUnit {
                                        id
                                        name
                                        locationId
                                        location {
                                            id
                                            name
                                        }
                                    }
                                    stockOwner {
                                        id
                                        name
                                    }
                                    articleId
                                    article {
                                        id
                                        name
                                        stockOwnerId
                                        stockOwner {
                                            name
                                        }
                                        baseUnitWeight
                                    }
                                    handlingUnitContentFeatures {
                                        id
                                        featureCode {
                                            id
                                            name
                                            unique
                                            dateType
                                        }
                                        value
                                    }
                                }
                            }
                        }
                    }
                }
            `;

            const variables = {
                filters: { barcode: [`${scannedInfo}`] }
            };
            const locationInfos = await graphqlRequestClient.request(query, variables);

            return locationInfos;
        }
    };

    const query = gql`
        query roundAdvisedAddresses($locationId: String!) {
            roundAdvisedAddresses(
                filters: {
                    location_id: $locationId
                    round_Status: [400, 450]
                    round_Category: 71210
                }
            ) {
                count
                results {
                    id
                }
            }
        }
    `;

    useEffect(() => {
        if (camData) {
            if (levelsChoices?.some((option) => option.text === camData)) {
                const levelToFind = levelsChoices?.find((option) => option.text === camData);
                form.setFieldsValue({ level: levelToFind.key });
            } else {
                showError(t('messages:unexpected-scanned-item'));
            }
        }
    }, [camData, levelsChoices]);

    const handleCleanData = () => {
        form.resetFields();
        setCamData(undefined);
    };
    // end camera scanner section

    //SelectLocationByLevel-2b: handle back to previous step settings
    const onBack = () => {
        setTriggerRender(!triggerRender);
        for (let i = storedObject[`step${stepNumber}`]?.previousStep ?? 0; i <= stepNumber; i++) {
            delete storedObject[`step${i}`]?.data;
        }
        storedObject.currentStep = storedObject[`step${stepNumber}`]?.previousStep ?? 0;
        storage.set(process, JSON.stringify(storedObject));
    };

    function checkChosenLocation(chosenLocation: any, data: any) {
        if (chosenLocation) {
            const location = chosenLocation;
            const storedObject = JSON.parse(storage.get(process) || '{}');
            const proposedRoundAdvisedAddress =
                storedObject[`step10`]?.data?.proposedRoundAdvisedAddresses?.[0];
            const { articleId, stockOwnerId, stockStatus, reservation } =
                proposedRoundAdvisedAddress?.handlingUnitContent || {};

            const matchingHandlingUnitContent = location.handlingUnits
                ?.flatMap((unit: any) => unit.handlingUnitContents)
                ?.find(
                    (content: any) =>
                        content.articleId === articleId &&
                        content.stockOwnerId === stockOwnerId &&
                        content.stockStatus === stockStatus &&
                        content.reservation === reservation &&
                        content.quantity > 0
                );

            if (
                location.id === proposedRoundAdvisedAddress?.locationId &&
                matchingHandlingUnitContent
            ) {
                data['locations'] = [
                    {
                        id: chosenLocation.id,
                        name: chosenLocation.name,
                        barcode: chosenLocation.barcode,
                        level: chosenLocation.level,
                        handlingUnits: chosenLocation.handlingUnits
                    }
                ];
                storedObject[`step20`] = {
                    ...storedObject[`step20`],
                    data
                };
                storage.set(process, JSON.stringify(storedObject));
                setTriggerRender(!triggerRender);
                return true;
            } else if (
                location.category === configs.LOCATION_CATEGORY_PICKING &&
                matchingHandlingUnitContent
            ) {
                const proposedRaaIds = storedObject[
                    `step10`
                ].data.proposedRoundAdvisedAddresses.map((raa: any) => raa.id);
                Modal.confirm({
                    title: (
                        <span style={{ fontSize: '14px' }}>
                            {t('messages:change-picking-location-confirm')}
                        </span>
                    ),
                    onOk: async () => {
                        //check whether the modal is already visible before opening it again and avoid useEffect re-rendering
                        console.log('Otherlocation');
                        const updateRoundAdvisedAddressesMutation = gql`
                            mutation updateRoundAdvisedAddresses(
                                $ids: [String!]!
                                $input: UpdateRoundAdvisedAddressInput!
                            ) {
                                updateRoundAdvisedAddresses(ids: $ids, input: $input)
                            }
                        `;
                        const updateRoundAdvisedAddressesVariables = {
                            ids: proposedRaaIds,
                            input: {
                                locationId: location.id,
                                handlingUnitContentId: matchingHandlingUnitContent.id
                            }
                        };
                        const updateRoundAdvisedAddressesResponse =
                            await graphqlRequestClient.request(
                                updateRoundAdvisedAddressesMutation,
                                updateRoundAdvisedAddressesVariables
                            );

                        if (updateRoundAdvisedAddressesResponse.updateRoundAdvisedAddresses) {
                            const raaQuery = gql`
                                query roundAdvisedAddresses(
                                    $filters: RoundAdvisedAddressSearchFilters!
                                ) {
                                    roundAdvisedAddresses(filters: $filters) {
                                        count
                                        results {
                                            id
                                            roundOrderId
                                            quantity
                                            status
                                            statusText
                                            locationId
                                            location {
                                                name
                                            }
                                            handlingUnitContentId
                                            handlingUnitContent {
                                                quantity
                                                reservation
                                                stockStatus
                                                articleId
                                                article {
                                                    id
                                                    name
                                                    stockOwnerId
                                                    stockOwner {
                                                        name
                                                    }
                                                    baseUnitWeight
                                                }
                                                stockOwnerId
                                                stockOwner {
                                                    name
                                                }
                                                handlingUnitContentFeatures {
                                                    featureCode {
                                                        name
                                                        unique
                                                    }
                                                    value
                                                }
                                                handlingUnitId
                                                handlingUnit {
                                                    id
                                                    name
                                                    barcode
                                                    status
                                                    statusText
                                                    type
                                                    typeText
                                                    category
                                                    categoryText
                                                    stockOwnerId
                                                    stockOwner {
                                                        name
                                                    }
                                                }
                                            }
                                            roundLineDetailId
                                            roundLineDetail {
                                                status
                                                statusText
                                                quantityToBeProcessed
                                                handlingUnitContentOutbounds {
                                                    id
                                                    handlingUnitOutbound {
                                                        id
                                                        name
                                                    }
                                                }
                                                processedQuantity
                                                roundLineId
                                                roundLine {
                                                    lineNumber
                                                    articleId
                                                    status
                                                    statusText
                                                }
                                                deliveryLineId
                                                deliveryLine {
                                                    id
                                                    stockOwnerId
                                                    deliveryId
                                                    stockStatus
                                                    stockStatusText
                                                    reservation
                                                    articleId
                                                }
                                            }
                                        }
                                    }
                                }
                            `;

                            const raaVariables = {
                                filters: {
                                    id: proposedRaaIds
                                }
                            };

                            const raaResults = await graphqlRequestClient.request(
                                raaQuery,
                                raaVariables
                            );
                            if (raaResults?.roundAdvisedAddresses?.count > 0) {
                                const data: { [label: string]: any } = {};
                                const locationInfos: any = await getLocations(location.barcode);
                                data['locations'] = locationInfos?.locations?.results.map(
                                    ({
                                        id,
                                        name,
                                        barcode,
                                        level,
                                        handlingUnits
                                    }: {
                                        id: string;
                                        name: string;
                                        barcode: string;
                                        level: number;
                                        handlingUnits: any;
                                    }) => {
                                        return { id, name, barcode, level, handlingUnits };
                                    }
                                );
                                const step10Data = storedObject.step10.data;
                                storage.remove(process);
                                const newStoredObject = JSON.parse(storage.get(process) || '{}');
                                newStoredObject['currentStep'] = 20;
                                const newStep10Data = {
                                    round: step10Data.round,
                                    proposedRoundAdvisedAddresses:
                                        raaResults?.roundAdvisedAddresses?.results,
                                    pickAndPackType: step10Data.pickAndPackType
                                };
                                newStoredObject[`step10`] = {
                                    previousStep: 0,
                                    data: newStep10Data
                                };
                                if (storedObject.step15) {
                                    newStoredObject[`step15`] = storedObject.step15;
                                }
                                newStoredObject[`step20`] = {
                                    ...storedObject.step20,
                                    previousStep: storedObject.step15 ? 15 : 10,
                                    data
                                };
                                showSimilarLocations.setShowSimilarLocations(false);
                                storage.set(process, JSON.stringify(newStoredObject));
                                setTriggerRender(!triggerRender);
                                setReload((prev) => !prev);
                            }
                        }
                        return true;
                    },
                    onCancel: () => {
                        console.log('Reset');
                        form.resetFields();
                        return false;
                    },
                    okText: t('messages:confirm'),
                    cancelText: t('messages:cancel'),
                    bodyStyle: { fontSize: '2px' }
                });
            } else {
                console.log('No matching handling unit content', chosenLocation, data);
                showError(t('messages:unexpected-scanned-item'));
                form.resetFields();
                const newStoredObject = JSON.parse(storage.get(process) || '{}');
                newStoredObject[`step20`] = {};
                storage.set(process, JSON.stringify(newStoredObject));
                setTriggerRender(!triggerRender);
                return false;
            }
        }
    }

    //Pre-requisite: initialize current step
    useEffect(() => {
        //automatically set chosenLocation when single location
        if (locations) {
            if (locations.length === 1) {
                // N.B.: in this case previous step is kept at its previous value
                const data: { [label: string]: any } = {};

                data.chosenLocation = locations[0];

                if (!checkChosenLocation(data['chosenLocation'], data)) return;

                const variables = {
                    locationId: data['chosenLocation'].id
                };
                const nextStep = () => {
                    if (data['chosenLocation']?.handlingUnits?.length === 1) {
                        data['handlingUnit'] = data['chosenLocation']?.handlingUnits[0];
                    }
                    storedObject[`step${stepNumber}`] = {
                        ...storedObject[`step${stepNumber}`],
                        data
                    };
                    storage.set(process, JSON.stringify(storedObject));
                    setTriggerRender(!triggerRender);
                };
                if (!roundsCheck) {
                    nextStep();
                }
                if (popModal === 2 && roundsCheck) {
                    graphqlRequestClient.request(query, variables).then((result: any) => {
                        if (result.roundAdvisedAddresses.count > 0) {
                            Modal.confirm({
                                title: t('messages:round-planned-for-location'),
                                onOk: () => nextStep(),
                                onCancel: () => onBack(),
                                okText: t('messages:confirm'),
                                cancelText: t('messages:cancel')
                            });
                        } else {
                            nextStep();
                        }
                    });
                }
                setPopModal((prev) => prev + 1);
            } else if (storedObject.currentStep < stepNumber) {
                //check workflow direction and assign current step accordingly
                storedObject[`step${stepNumber}`] = { previousStep: storedObject.currentStep };
                storedObject.currentStep = stepNumber;
            }
            storage.set(process, JSON.stringify(storedObject));
        }
    }, [reload]);

    //SelectLocationByLevel-1: retrieve levels choices for select
    useEffect(() => {
        const newIdOpts: Array<any> = [];
        locations?.forEach((e: any) => {
            newIdOpts.push({ text: e.level!, key: e.level! });
        });
        function compare(a: any, b: any) {
            if (a.key < b.key) {
                return -1;
            }
            if (a.key > b.key) {
                return 1;
            }
            return 0;
        }
        newIdOpts.sort(compare);
        setLevelsChoices(newIdOpts);
    }, [locations]);

    //SelectLocationByLevel-2a: retrieve chosen level from select and set information
    const onFinish = (values: any) => {
        const data: { [label: string]: any } = {};
        data['chosenLocation'] = locations?.find((e: any) => {
            return e.level == values.level;
        });

        if (!checkChosenLocation(data['chosenLocation'], data)) return;

        const variables = {
            locationId: data['chosenLocation'].id
        };
        const nextStep = () => {
            if (data['chosenLocation']?.handlingUnits?.length === 1) {
                data['handlingUnit'] = data['chosenLocation']?.handlingUnits[0];
            }
            storedObject[`step${stepNumber}`] = {
                ...storedObject[`step${stepNumber}`],
                data
            };
            storage.set(process, JSON.stringify(storedObject));
            setTriggerRender(!triggerRender);
        };
        if (!roundsCheck) {
            nextStep();
        } else {
            graphqlRequestClient.request(query, variables).then((result: any) => {
                if (result.roundAdvisedAddresses.count > 0) {
                    Modal.confirm({
                        title: t('messages:round-planned-for-location'),
                        onOk: () => nextStep(),
                        onCancel: () => onBack(),
                        okText: t('messages:confirm'),
                        cancelText: t('messages:cancel')
                    });
                } else {
                    nextStep();
                }
            });
        }
    };

    return (
        <WrapperForm>
            <StyledForm
                name="basic"
                layout="vertical"
                onFinish={onFinish}
                autoComplete="off"
                scrollToFirstError
                size="small"
                form={form}
            >
                <StyledFormItem
                    label={t('common:level')}
                    name="level"
                    rules={[{ required: true, message: t('messages:error-message-empty-input') }]}
                >
                    <Select
                        style={{ height: '20px', marginBottom: '5px' }}
                        showSearch
                        filterOption={(inputValue, option) =>
                            option!.props.children
                                .toUpperCase()
                                .indexOf(inputValue.toUpperCase()) !== -1
                        }
                        allowClear
                    >
                        {levelsChoices?.map((option: any) => (
                            <Select.Option key={option.key} value={option.key}>
                                {option.text}
                            </Select.Option>
                        ))}
                    </Select>
                </StyledFormItem>
                <CameraScanner camData={{ setCamData }} handleCleanData={handleCleanData} />
                <RadioButtons input={{ ...buttons }} output={{ onBack }}></RadioButtons>
            </StyledForm>
        </WrapperForm>
    );
};
