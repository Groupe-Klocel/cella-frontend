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
import { useEffect } from 'react';
import parameters from '../../../../../common/parameters.json';
import { Modal } from 'antd';

export interface IHandlingUnitOutboundChecksProps {
    dataToCheck: any;
}

export const HandlingUnitOutboundChecks = ({ dataToCheck }: IHandlingUnitOutboundChecksProps) => {
    const { t } = useTranslation();
    const storage = LsIsSecured();

    const {
        process,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        handlingUnitOutboundInfos,
        trigger: { triggerRender, setTriggerRender },
        setResetForm
    } = dataToCheck;

    const storedObject = JSON.parse(storage.get(process) || '{}');

    useEffect(() => {
        if (scannedInfo && handlingUnitOutboundInfos.data) {
            if (
                // If Support/Box exist
                handlingUnitOutboundInfos.data.handlingUnitOutbounds?.count !== 0
            ) {
                if (
                    // If Support/Box is consistent with Load
                    handlingUnitOutboundInfos.data.handlingUnitOutbounds?.results[0].handlingUnit
                        .type != parameters.HANDLING_UNIT_TYPE_PALLET &&
                    handlingUnitOutboundInfos.data.handlingUnitOutbounds?.results[0]
                        ?.carrierShippingMode?.toBePalletized == true
                ) {
                    showError(t('messages:wait-support'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                } else {
                    if (
                        // If Support/Box is a children
                        handlingUnitOutboundInfos.data.handlingUnitOutbounds?.results[0]
                            .handlingUnit?.parentHandlingUnitId != null
                    ) {
                        showError(t('messages:support-box-children'));
                        setResetForm(true);
                        setScannedInfo(undefined);
                    } else {
                        if (
                            // if Support/Box loaded
                            handlingUnitOutboundInfos.data.handlingUnitOutbounds?.results[0]
                                .status == 1500
                        ) {
                            storedObject.step10.countLoop = storedObject.step10.countLoop + 1;
                            if (storedObject.step10.countLoop == 1) {
                                // Unload Support/Box
                                const box =
                                    handlingUnitOutboundInfos.data.handlingUnitOutbounds
                                        ?.results[0];
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
                                    if (res.ok) {
                                        showSuccess(t('messages:unload-success'));
                                        delete storedObject.step10.countLoop;
                                        storedObject.step10.data.load.numberHuLoaded =
                                            storedObject.step10.data.load.numberHuLoaded - 1;
                                        storedObject.step10.data.load.weight =
                                            storedObject.step10.data.load.weight -
                                            box.theoriticalWeight;
                                        storage.set(process, JSON.stringify(storedObject));
                                        setResetForm(true);
                                        setScannedInfo(null);
                                        setTriggerRender(!triggerRender);
                                    } else {
                                        showError(t('messages:load-failed'));
                                    }
                                };
                                const onBack = () => {
                                    delete storedObject.step10.countLoop;
                                    storage.set(process, JSON.stringify(storedObject));
                                    setResetForm(true);
                                    setScannedInfo(null);
                                    setTriggerRender(!triggerRender);
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
                            }
                        } else {
                            if (
                                // If Support/Box is to be loaded
                                handlingUnitOutboundInfos.data.handlingUnitOutbounds?.results[0]
                                    .status == 1400
                            ) {
                                // Save in local storage
                                const data: { [label: string]: any } = {};
                                data['handlingUnitOutbound'] =
                                    handlingUnitOutboundInfos.data?.handlingUnitOutbounds?.results[0];
                                const nextStep = 30;
                                setTriggerRender(!triggerRender);
                                storedObject[`step${stepNumber}`] = {
                                    ...storedObject[`step${stepNumber}`],
                                    data,
                                    nextStep
                                };
                            } else {
                                if (
                                    // Support/Box status is < 1400 (to be loaded)
                                    handlingUnitOutboundInfos.data.handlingUnitOutbounds?.results[0]
                                        .status < 1400
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
        if (
            storedObject[`step${stepNumber}`] &&
            Object.keys(storedObject[`step${stepNumber}`]).length != 0
        ) {
            storage.set(process, JSON.stringify(storedObject));
        }
    }, [handlingUnitOutboundInfos]);

    return (
        <WrapperForm>
            {scannedInfo && !handlingUnitOutboundInfos ? <ContentSpin /> : <></>}
        </WrapperForm>
    );
};
