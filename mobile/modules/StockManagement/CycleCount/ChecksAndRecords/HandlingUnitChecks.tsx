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
import { WrapperForm, ContentSpin } from '@components';
import { showError, LsIsSecured, showSuccess } from '@helpers';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useRef, useState } from 'react';
import configs from '../../../../../common/configs.json';
import parameters from '../../../../../common/parameters.json';
import { createCycleCountError } from 'helpers/utils/crudFunctions/cycleCount';
import { Modal } from 'antd';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';

export interface IHandlingUnitChecksProps {
    dataToCheck: any;
}

export const HandlingUnitChecks = ({ dataToCheck }: IHandlingUnitChecksProps) => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const { graphqlRequestClient } = useAuth();

    const {
        process,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        handlingUnitInfos,
        trigger: { triggerRender, setTriggerRender },
        triggerAlternativeSubmit1,
        alternativeSubmitInput,
        setResetForm
    } = dataToCheck;

    const [isHuCreateModalVisible, setIsHuCreateModalVisible] = useState(false);

    const storedObject = JSON.parse(storage.get(process) || '{}');

    // TYPED SAFE ALL
    //retrieve necessary values for CC specifc checks
    const currentCycleCountId: string = storedObject.step10?.data?.cycleCount?.id;
    const currentCycleCountLineId: string = storedObject.step10?.data?.currentCycleCountLine?.id;
    const expectedHu: string =
        storedObject.step10?.data?.currentCycleCountLine?.handlingUnitNameStr;
    const expectedLocationId: string = storedObject.step10?.data?.currentCycleCountLine?.locationId;

    const getCCMs = async (
        scannedInfo: any,
        cycleCountLineId?: any,
        locationId?: any,
        createdByCycleCount?: boolean
    ): Promise<{ [key: string]: any } | undefined> => {
        if (scannedInfo) {
            const query = gql`
                query cycleCountMovements(
                    $filters: CycleCountMovementSearchFilters
                    $advancedFilters: [CycleCountMovementAdvancedSearchFilters!]
                    $itemsPerPage: Int
                ) {
                    cycleCountMovements(
                        filters: $filters
                        itemsPerPage: $itemsPerPage
                        advancedFilters: $advancedFilters
                    ) {
                        count
                        itemsPerPage
                        totalPages
                        results {
                            id
                            type
                            status
                            statusText
                            cycleCountId
                            cycleCountLineId
                            originalQuantity
                            originalQuantityPass1
                            quantityPass1
                            gapPass1
                            operatorPass1
                            originalQuantityPass2
                            quantityPass2
                            gapPass2
                            operatorPass2
                            originalQuantityPass3
                            quantityPass3
                            gapPass3
                            operatorPass3
                            articleId
                            articleNameStr
                            stockOwnerId
                            stockOwnerNameStr
                            locationId
                            locationNameStr
                            handlingUnitId
                            handlingUnitNameStr
                            parentHandlingUnitNameStr
                            handlingUnitContentId
                            contentStatus
                            handlingUnitContentFeatureId
                            createdByCycleCount
                            features
                        }
                    }
                }
            `;

            const variables = {
                filters: {
                    handlingUnitNameStr: `${scannedInfo}`,
                    cycleCountLineId,
                    cycleCountId: currentCycleCountId,
                    createdByCycleCount
                },
                advancedFilters: locationId
                    ? {
                          filter: { field: { locationId }, searchType: 'DIFFERENT' }
                      }
                    : undefined,
                itemsPerPage: 1000
            };
            const ccMovementsInfos = await graphqlRequestClient.request(query, variables);
            return ccMovementsInfos;
        }
    };

    // manage information for persistence storage and front-end errors
    useEffect(() => {
        if (scannedInfo && handlingUnitInfos.data) {
            if (expectedHu) {
                if (expectedHu !== scannedInfo) {
                    createCycleCountError(
                        currentCycleCountId,
                        `Step ${stepNumber} - ${t(
                            'messages:unexpected-scanned-item'
                        )} - ${scannedInfo}`
                    );
                    showError(t('messages:unexpected-scanned-item'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                }
            }
            const existingCCMInLocation = async () => {
                const currentHuCcm = await getCCMs(
                    scannedInfo,
                    currentCycleCountLineId,
                    undefined,
                    true
                );
                return currentHuCcm;
            };

            existingCCMInLocation().then((ccmInLocation) => {
                let foundCcmsInLocation;
                if (ccmInLocation?.cycleCountMovements?.count != 0) {
                    foundCcmsInLocation = ccmInLocation?.cycleCountMovements?.results;
                }
                //HU does not exist and if exists is not in the location (comes from previous pass)
                if (
                    foundCcmsInLocation?.length > 0 ||
                    (handlingUnitInfos.data.handlingUnits?.count !== 0 &&
                        (handlingUnitInfos?.data?.handlingUnits?.results[0]?.locationId ?? null) ===
                            expectedLocationId)
                ) {
                    //handl if HU comes from stock or from previous CCM
                    let hu: any;
                    let isHuFromCCM = false;
                    if (handlingUnitInfos.data?.handlingUnits?.results.length > 0) {
                        hu = handlingUnitInfos.data?.handlingUnits?.results[0];
                    } else if (foundCcmsInLocation?.length > 0) {
                        hu = {
                            name: foundCcmsInLocation[0].handlingUnitNameStr
                        };
                        isHuFromCCM = true;
                    }

                    const data: { [label: string]: any } = {};
                    data['handlingUnit'] = hu;
                    data['isHuFromCCM'] = isHuFromCCM;
                    setTriggerRender(!triggerRender);
                    storedObject[`step${stepNumber}`] = {
                        ...storedObject[`step${stepNumber}`],
                        data
                    };
                    storage.set(process, JSON.stringify(storedObject));
                } else {
                    const huOtherCCMLocation = async () => {
                        const allCCmsExceptCurrentOne = await getCCMs(
                            scannedInfo,
                            undefined,
                            expectedLocationId
                        );
                        return allCCmsExceptCurrentOne;
                    };
                    huOtherCCMLocation().then((result) => {
                        let ccmInOtherLocation: any;
                        if (result?.cycleCountMovements?.results.count != 0) {
                            ccmInOtherLocation = result?.cycleCountMovements?.results[0];
                        }
                        //HU exists in another location or in the CC's movements
                        if (
                            handlingUnitInfos.data.handlingUnits?.count !== 0 ||
                            ccmInOtherLocation
                        ) {
                            const foundLocation =
                                handlingUnitInfos.data?.handlingUnits?.results[0].location.name ??
                                ccmInOtherLocation?.location;
                            createCycleCountError(
                                currentCycleCountId,
                                `Step ${stepNumber} - ${t('messages:hu-exists-other-location', {
                                    locationName: foundLocation
                                })} - ${scannedInfo}`
                            );
                            showError(
                                t('messages:hu-exists-other-location', {
                                    locationName: foundLocation
                                })
                            );
                            setResetForm(true);
                            setScannedInfo(undefined);
                        } else {
                            if (!isHuCreateModalVisible) {
                                setIsHuCreateModalVisible(true);
                                Modal.confirm({
                                    title: (
                                        <span style={{ fontSize: '14px' }}>
                                            {t('messages:hu-creation-confirm')}
                                        </span>
                                    ),
                                    onOk: () => {
                                        const type =
                                            scannedInfo[0] == '0' || scannedInfo[0] == 'P'
                                                ? parameters.HANDLING_UNIT_TYPE_PALLET
                                                : parameters.HANDLING_UNIT_TYPE_BOX;

                                        const huToCreate = {
                                            name: scannedInfo
                                        };

                                        const data: { [label: string]: any } = {};
                                        data['isHuToCreate'] = true;
                                        data['huToCreate'] = huToCreate;
                                        setTriggerRender(!triggerRender);
                                        storedObject[`step${stepNumber}`] = {
                                            ...storedObject[`step${stepNumber}`],
                                            data
                                        };
                                        storage.set(process, JSON.stringify(storedObject));
                                        setIsHuCreateModalVisible(false);
                                    },
                                    onCancel: () => {
                                        console.log('Reset');
                                        setResetForm(true);
                                        setScannedInfo(undefined);
                                        setIsHuCreateModalVisible(false);
                                    },
                                    okText: t('messages:confirm'),
                                    cancelText: t('messages:cancel'),
                                    bodyStyle: { fontSize: '2px' }
                                });
                            }
                        }
                    });
                }
            });
        }
    }, [handlingUnitInfos]);

    // Location closure function
    const [isLocationClosureLoading, setIsLocationClosureLoading] = useState(false);
    async function closeLocation(cycleCountLineIds: any) {
        setIsLocationClosureLoading(true);
        const query = gql`
            mutation executeFunction($functionName: String!, $event: JSON!) {
                executeFunction(functionName: $functionName, event: $event) {
                    status
                    output
                }
            }
        `;

        const variables = {
            functionName: 'K_updateCycleCountLines',
            event: {
                input: { cycleCountLineIds }
            }
        };

        try {
            const cc_result = await graphqlRequestClient.request(query, variables);
            if (cc_result.executeFunction.status === 'ERROR') {
                showError(cc_result.executeFunction.output);
            } else if (
                cc_result.executeFunction.status === 'OK' &&
                cc_result.executeFunction.output.status === 'KO'
            ) {
                showError(t(`errors:${cc_result.executeFunction.output.output.code}`));
                console.log('Backend_message', cc_result.executeFunction.output.output);
            } else {
                storage.remove(process);
                const newStoredObject = JSON.parse(storage.get(process) || '{}');

                const cc_output = cc_result.executeFunction.output;
                const updatedCycleCount = cc_output.cycleCount;
                const updatedCurrentCycleCountLines = cc_output.cycleCountLines;

                let isCurrentCCLineValidated = false;
                let nextCycleCountLine: any;
                if (
                    updatedCycleCount?.status === configs.CYCLE_COUNT_STATUS_PASS_1_VALIDATED ||
                    updatedCycleCount?.status === configs.CYCLE_COUNT_STATUS_PASS_2_VALIDATED ||
                    updatedCycleCount?.status === configs.CYCLE_COUNT_STATUS_VALIDATED
                ) {
                    storage.remove(process);
                    showSuccess(t('messages:cycle-count-finished'));
                } else {
                    isCurrentCCLineValidated = updatedCurrentCycleCountLines.every(
                        (item: any) =>
                            item.status >= updatedCycleCount?.status &&
                            [
                                configs.CYCLE_COUNT_STATUS_PASS_1_VALIDATED,
                                configs.CYCLE_COUNT_STATUS_PASS_2_VALIDATED,
                                configs.CYCLE_COUNT_STATUS_VALIDATED
                            ].includes(item.status)
                    );
                    if (isCurrentCCLineValidated) {
                        showSuccess(t('messages:cycle-count-line-finished'));
                        //handle CClines to return the relevant one.
                        const updatedCycleCountLines = updatedCycleCount?.cycleCountLines.filter(
                            (ccl: any) => ccl.status <= updatedCycleCount.status
                        );
                        if (updatedCycleCountLines[0].status != updatedCycleCount.status) {
                            // Begin Update CCL status
                            const updateCycleCountLineMutation = gql`
                                mutation updateCycleCountLine(
                                    $id: String!
                                    $input: UpdateCycleCountLineInput!
                                ) {
                                    updateCycleCountLine(id: $id, input: $input) {
                                        id
                                        status
                                        statusText
                                        order
                                        articleId
                                        articleNameStr
                                        stockOwnerId
                                        stockOwnerNameStr
                                        locationId
                                        locationNameStr
                                        handlingUnitId
                                        handlingUnitNameStr
                                        parentHandlingUnitNameStr
                                        handlingUnitContentId
                                        cycleCountId
                                    }
                                }
                            `;
                            const updateCycleCountLineVariables = {
                                id: updatedCycleCountLines[0].id,
                                input: {
                                    status: updatedCycleCount.status
                                }
                            };
                            const updateCycleCountLineResponse = await graphqlRequestClient.request(
                                updateCycleCountLineMutation,
                                updateCycleCountLineVariables
                            );
                            nextCycleCountLine = updateCycleCountLineResponse.updateCycleCountLine;
                        } else {
                            nextCycleCountLine = updatedCycleCountLines[0];
                        }
                    } else {
                        nextCycleCountLine = updatedCurrentCycleCountLines;
                    }
                    if (nextCycleCountLine) {
                        newStoredObject['currentStep'] = 20;
                        const step10Data: { [label: string]: any } = {};
                        step10Data['cycleCount'] = updatedCycleCount;
                        step10Data['currentCycleCountLine'] = nextCycleCountLine;
                        newStoredObject[`step10`] = { previousStep: 0, data: step10Data };

                        storage.set(process, JSON.stringify(newStoredObject));
                    }
                }
                setTriggerRender(!triggerRender);
            }
            setIsLocationClosureLoading(false);
        } catch (error) {
            showError(t('messages:error-executing-function'));
            console.log('executeFunctionError', error);
            setIsLocationClosureLoading(false);
        }
    }

    useEffect(() => {
        if (triggerAlternativeSubmit1.triggerAlternativeSubmit1) {
            if (!alternativeSubmitInput) {
                showError(t('messages:no-location-to-close'));
                triggerAlternativeSubmit1.setTriggerAlternativeSubmit1(false);
            } else {
                triggerAlternativeSubmit1.setTriggerAlternativeSubmit1(false);
                closeLocation([currentCycleCountLineId]);
            }
        }
    }, [triggerAlternativeSubmit1]);

    return (
        <WrapperForm>
            {(scannedInfo && !handlingUnitInfos) || isLocationClosureLoading ? (
                <ContentSpin />
            ) : (
                <></>
            )}
        </WrapperForm>
    );
};
