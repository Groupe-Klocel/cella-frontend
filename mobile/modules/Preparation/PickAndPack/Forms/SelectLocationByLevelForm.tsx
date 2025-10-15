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
import { useAppDispatch, useAppState } from 'context/AppContext';

export interface ISelectLocationByLevelProps {
    processName: string;
    stepNumber: number;
    buttons: { [label: string]: any };
    showSimilarLocations?: any;
    locations: Array<any>;
    roundsCheck?: boolean;
    dontAskBeforeLocationChange?: boolean;
}

export const SelectLocationByLevelForm = ({
    processName,
    stepNumber,
    buttons,
    showSimilarLocations,
    locations,
    roundsCheck,
    dontAskBeforeLocationChange
}: ISelectLocationByLevelProps) => {
    const { t } = useTranslation();
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    const { graphqlRequestClient } = useAuth();

    // TYPED SAFE ALL
    const [levelsChoices, setLevelsChoices] = useState<Array<any>>();

    //camera scanner section
    const [form] = Form.useForm();
    const [camData, setCamData] = useState();
    const [popModal, setPopModal] = useState(0);

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
        dispatch({
            type: 'ON_BACK',
            processName: processName,
            stepToReturn: `step${storedObject[`step${stepNumber}`].previousStep}`
        });
    };

    function selectLocation(newChosenLocation: any) {
        // N.B.: in this case previous step is kept at its previous value
        const data: { [label: string]: any } = {};

        data.chosenLocation = newChosenLocation;

        const variables = {
            locationId: data['chosenLocation'].id
        };
        const nextStep = () => {
            if (data['chosenLocation']?.handlingUnits?.length === 1) {
                data['handlingUnit'] = data['chosenLocation']?.handlingUnits[0];
            }
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: `step${stepNumber}`,
                object: {
                    data,
                    ...(storedObject[`step${stepNumber}`]?.previousStep !== undefined && {
                        previousStep: storedObject[`step${stepNumber}`].previousStep
                    })
                }
            });
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
    }

    async function changePRAA(
        location: any,
        matchingHandlingUnitContent: any,
        chosenLocation: any
    ) {
        const proposedRaaIds = storedObject[`step10`].data.proposedRoundAdvisedAddresses.map(
            (raa: any) => raa.id
        );
        //check whether the modal is already visible before opening it again and avoid useEffect re-rendering
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
        const updateRoundAdvisedAddressesResponse = await graphqlRequestClient.request(
            updateRoundAdvisedAddressesMutation,
            updateRoundAdvisedAddressesVariables
        );
        if (updateRoundAdvisedAddressesResponse.updateRoundAdvisedAddresses) {
            const raaQuery = gql`
                query roundAdvisedAddresses($filters: RoundAdvisedAddressSearchFilters!) {
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
                                    featureType
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
                                    featureCodeId
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

            const raaResults = await graphqlRequestClient.request(raaQuery, raaVariables);
            if (raaResults?.roundAdvisedAddresses?.count > 0) {
                const step10Data = storedObject.step10.data;
                const newStep10Data = {
                    round: step10Data.round,
                    proposedRoundAdvisedAddresses: raaResults?.roundAdvisedAddresses?.results,
                    pickAndPackType: step10Data.pickAndPackType
                };
                showSimilarLocations.setShowSimilarLocations(false);
                dispatch({
                    type: 'UPDATE_BY_STEP',
                    processName: processName,
                    stepName: `step10`,
                    object: { data: newStep10Data }
                });
            }
        }
        return true;
    }

    function checkChosenLocation(chosenLocation: any) {
        if (chosenLocation) {
            const location = chosenLocation;
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
                selectLocation(chosenLocation);
                return true;
            } else if (matchingHandlingUnitContent) {
                if (dontAskBeforeLocationChange) {
                    changePRAA(location, matchingHandlingUnitContent, chosenLocation);
                    selectLocation(chosenLocation);
                    return true;
                }
                Modal.confirm({
                    title: (
                        <span style={{ fontSize: '14px' }}>
                            {t('messages:change-picking-location-confirm')}
                        </span>
                    ),
                    onOk: () => {
                        console.log('Change location confirmed');
                        changePRAA(location, matchingHandlingUnitContent, chosenLocation);
                        selectLocation(chosenLocation);
                        //N.B.: in this case previous step is kept at its previous value
                        return true;
                    },
                    onCancel: () => {
                        console.log('Reset', locations);
                        form.resetFields();
                        if (locations.length === 1) {
                            dispatch({
                                type: 'ON_BACK',
                                processName: processName,
                                stepToReturn: 'step20'
                            });
                        }
                        showSimilarLocations.setShowSimilarLocations(false);
                        return false;
                    },
                    okText: t('messages:confirm'),
                    cancelText: t('messages:cancel'),
                    bodyStyle: { fontSize: '2px' }
                });
            } else {
                showError(t('messages:unexpected-scanned-item'));
                form.resetFields();
                dispatch({
                    type: 'ON_BACK',
                    processName: processName,
                    stepToReturn: 'step20'
                });
                return false;
            }
        }
    }

    //Pre-requisite: initialize current step
    useEffect(() => {
        //automatically set chosenLocation when single location
        if (locations) {
            if (locations.length === 1) {
                checkChosenLocation(locations[0]);
            } else if (storedObject.currentStep < stepNumber) {
                //check workflow direction and assign current step accordingly
                dispatch({
                    type: 'UPDATE_BY_STEP',
                    processName: processName,
                    stepName: `step${stepNumber}`,
                    object: { previousStep: storedObject.currentStep },
                    customFields: [{ key: 'currentStep', value: stepNumber }]
                });
            }
        }
    }, []);

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
    const onFinish = async (values: any) => {
        const data: { [label: string]: any } = {};
        data['chosenLocation'] = locations?.find((e: any) => {
            return e.level == values.level;
        });

        checkChosenLocation(data['chosenLocation']);
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
