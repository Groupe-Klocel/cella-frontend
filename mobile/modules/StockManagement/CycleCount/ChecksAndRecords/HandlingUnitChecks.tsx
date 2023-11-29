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
import { showError, LsIsSecured } from '@helpers';
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
        triggerAlternativeSubmit,
        alternativeSubmitInput,
        setResetForm
    } = dataToCheck;

    const modalRef = useRef<boolean | null>(null);

    const storedObject = JSON.parse(storage.get(process) || '{}');

    // TYPED SAFE ALL
    //retrieve necessary values for CC specifc checks
    const currentCycleCountId: string = storedObject.step10?.data?.currentCycleCountLine?.id;
    const currentCycleCountLineId: string = storedObject.step10?.data?.currentCycleCountLine?.id;
    const expectedHu: string =
        storedObject.step10?.data?.currentCycleCountLine?.handlingUnitNameStr;
    const expectedLocationId: string = storedObject.step10?.data?.currentCycleCountLine?.locationId;
    const currentCCMovements: any[] =
        storedObject.step10?.data?.currentCycleCountLine?.cycleCountMovements;
    //ScanPallet-3: manage information for persistence storage and front-end errors
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
            //HU does not exist and if exists is not in the location
            if (
                handlingUnitInfos.data.handlingUnits?.count === 0 &&
                (handlingUnitInfos?.data?.handlingUnits?.results[0]?.locationId ?? null) !==
                    expectedLocationId
            ) {
                const matchingCCM = currentCCMovements?.find((e: any) => {
                    return e.handlingUnitNameStr === scannedInfo;
                });
                //HU exists in another location or in the CC's movements
                if (handlingUnitInfos.data.handlingUnits?.count !== 0 || matchingCCM) {
                    const foundLocation =
                        handlingUnitInfos.data?.handlingUnits?.results[0].location.name ??
                        matchingCCM.location;
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
                    Modal.confirm({
                        title: (
                            <span style={{ fontSize: '14px' }}>
                                {t('messages:hu-creation-confirm')}
                            </span>
                        ),
                        onOk: () => {
                            //check whether the modal is already visible before opening it again and avoid useEffect re-rendering
                            if (modalRef.current !== null) {
                                return;
                            }
                            modalRef.current = true;
                            const type =
                                scannedInfo[0] == '0' || scannedInfo[0] == 'P'
                                    ? parameters.HANDLING_UNIT_TYPE_PALLET
                                    : parameters.HANDLING_UNIT_TYPE_BOX;

                            const huToCreate = {
                                name: scannedInfo,
                                barcode: scannedInfo,
                                code: scannedInfo,
                                type,
                                status: configs.HANDLING_UNIT_STATUS_VALIDATED,
                                category: parameters.HANDLING_UNIT_CATEGORY_STOCK,
                                locationId: expectedLocationId
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
                        },
                        onCancel: () => {
                            console.log('Reset');
                            setResetForm(true);
                            setScannedInfo(undefined);
                            modalRef.current = null;
                        },
                        okText: t('messages:confirm'),
                        cancelText: t('messages:cancel'),
                        bodyStyle: { fontSize: '2px' }
                    });
                }
            } else {
                const data: { [label: string]: any } = {};
                data['handlingUnit'] = handlingUnitInfos.data?.handlingUnits?.results[0];
                setTriggerRender(!triggerRender);
                storedObject[`step${stepNumber}`] = {
                    ...storedObject[`step${stepNumber}`],
                    data
                };
                storage.set(process, JSON.stringify(storedObject));
            }
        }
    }, [handlingUnitInfos]);

    // Location closure function
    const [isLocationClosureLoading, setIsLocationClosureLoading] = useState(false);
    async function closeHU(CclInputs: any) {
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
                input: CclInputs
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
                const storedObject = JSON.parse(storage.get(process) || '{}');
                storage.remove(process);
                const newStoredObject = JSON.parse(storage.get(process) || '{}');
                newStoredObject[`step10`] = storedObject[`step10`];
                storage.set(process, JSON.stringify(newStoredObject));
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
        if (triggerAlternativeSubmit.triggerAlternativeSubmit) {
            if (!alternativeSubmitInput) {
                showError(t('messages:no-location-to-close'));
                triggerAlternativeSubmit.setTriggerAlternativeSubmit(false);
            } else {
                closeHU([currentCycleCountLineId]);
            }
        }
    }, [triggerAlternativeSubmit]);

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
