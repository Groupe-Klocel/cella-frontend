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
import { showError, showSuccess } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect } from 'react';
import parameters from '../../../../../common/parameters.json';
import { Modal } from 'antd';
import configs from '../../../../../common/configs.json';
import { useAppDispatch, useAppState } from 'context/AppContext';

export interface IHandlingUnitOutboundChecksProps {
    dataToCheck: any;
}

export const HandlingUnitOutboundChecks = ({ dataToCheck }: IHandlingUnitOutboundChecksProps) => {
    const { t } = useTranslation();
    const state = useAppState();
    const dispatch = useAppDispatch();

    const {
        processName,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        handlingUnitOutboundInfos,
        setResetForm
    } = dataToCheck;

    const storedObject = state[processName] || {};

    useEffect(() => {
        if (scannedInfo && handlingUnitOutboundInfos) {
            if (
                // If Support/Box exist
                handlingUnitOutboundInfos.handlingUnitOutbounds?.count !== 0
            ) {
                if (
                    // If Support/Box is consistent with Load
                    handlingUnitOutboundInfos.handlingUnitOutbounds?.results[0].handlingUnit.type !=
                        parameters.HANDLING_UNIT_TYPE_PALLET &&
                    handlingUnitOutboundInfos.handlingUnitOutbounds?.results[0]?.carrierShippingMode
                        ?.toBePalletized == true
                ) {
                    showError(t('messages:wait-support'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                } else {
                    if (
                        // If Support/Box is a children
                        handlingUnitOutboundInfos.handlingUnitOutbounds?.results[0].handlingUnit
                            ?.parentHandlingUnitId != null
                    ) {
                        showError(t('messages:support-box-children'));
                        setResetForm(true);
                        setScannedInfo(undefined);
                    } else {
                        if (
                            // if Support/Box loaded
                            handlingUnitOutboundInfos.handlingUnitOutbounds?.results[0].status ==
                                configs.HANDLING_UNIT_OUTBOUND_STATUS_LOADED &&
                            handlingUnitOutboundInfos.handlingUnitOutbounds?.results[0].loadId ==
                                storedObject.step10.data.load.id
                        ) {
                            // Unload Support/Box
                            const box = handlingUnitOutboundInfos.handlingUnitOutbounds?.results[0];
                            const load = storedObject.step10.data.load;

                            const onFinish = async () => {
                                const res = await fetch(
                                    `/api/preparation-management/validateUnload/`,
                                    {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify({
                                            box,
                                            load
                                        })
                                    }
                                );

                                const { response } = res.ok
                                    ? await res.json()
                                    : { response: undefined };
                                if (res.ok && response?.updatedLoad) {
                                    showSuccess(t('messages:unload-success'));
                                    dispatch({
                                        type: 'UPDATE_BY_STEP',
                                        processName,
                                        stepName: 'step10',
                                        object: {
                                            ...storedObject.step10,
                                            data: {
                                                ...storedObject.step10.data,
                                                load: {
                                                    ...storedObject.step10.data.load,
                                                    numberHuLoaded:
                                                        response.updatedLoad.numberHuLoaded,
                                                    weight: response.updatedLoad.weight,
                                                    status: response.updatedLoad.status
                                                }
                                            }
                                        }
                                    });
                                    setResetForm(true);
                                    setScannedInfo(null);
                                } else {
                                    showError(t('messages:load-failed'));
                                }
                            };
                            const onBack = () => {
                                setResetForm(true);
                                setScannedInfo(null);
                            };
                            Modal.confirm({
                                title: (
                                    <span style={{ fontSize: '14px' }}>
                                        {t('messages:message-unload', {
                                            name: box.name
                                        })}
                                    </span>
                                ),
                                onOk: () => {
                                    onFinish();
                                },
                                onCancel: () => {
                                    onBack();
                                },
                                okText: t('messages:confirm'),
                                cancelText: t('messages:cancel'),
                                bodyStyle: { fontSize: '2px' }
                            });
                        } else {
                            if (
                                // If Support/Box is to be loaded
                                handlingUnitOutboundInfos.handlingUnitOutbounds?.results[0]
                                    .status ==
                                configs.HANDLING_UNIT_CONTENT_OUTBOUND_STATUS_TO_BE_LOADED //1400
                            ) {
                                // Check HU carrier vs load carrier
                                if (
                                    handlingUnitOutboundInfos.handlingUnitOutbounds.results[0]
                                        .carrierShippingMode.carrier.id !==
                                    storedObject.step10.data.load.carrierId
                                ) {
                                    showError(t('messages:incorrect-hu-carrier'));
                                    setResetForm(true);
                                    setScannedInfo(undefined);
                                } else {
                                    // Save handling unit outbound and move to the final check step
                                    const data: { [label: string]: any } = {};
                                    data['handlingUnitOutbound'] =
                                        handlingUnitOutboundInfos?.handlingUnitOutbounds?.results[0];
                                    const nextStep = 30;
                                    dispatch({
                                        type: 'UPDATE_BY_STEP',
                                        processName,
                                        stepName: `step${stepNumber}`,
                                        object: {
                                            ...storedObject[`step${stepNumber}`],
                                            data,
                                            nextStep
                                        },
                                        customFields: [{ key: 'currentStep', value: stepNumber }]
                                    });
                                }
                            } else {
                                if (
                                    // Support/Box status is < 1400 (to be loaded)
                                    handlingUnitOutboundInfos.handlingUnitOutbounds?.results[0]
                                        .status <
                                    configs.HANDLING_UNIT_CONTENT_OUTBOUND_STATUS_TO_BE_LOADED //1400
                                ) {
                                    showError(t('messages:box-not-ready'));
                                } else {
                                    // Support/Box status is > 1400 (to be loaded)
                                    showError(t('messages:box-dispatched'));
                                }
                                setResetForm(true);
                                setScannedInfo(undefined);
                            }
                        }
                    }
                }
            } else {
                showError(t('messages:no-support'));
                setResetForm(true);
                setScannedInfo(undefined);
            }
        }
    }, [handlingUnitOutboundInfos]);

    return (
        <WrapperForm>
            {scannedInfo && !handlingUnitOutboundInfos ? <ContentSpin /> : <></>}
        </WrapperForm>
    );
};
