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
import { useEffect, useState, useRef } from 'react';
import configs from '../../../../../common/configs.json';
import parameters from '../../../../../common/parameters.json';
import { Modal } from 'antd';
export interface IHandlingUnitChecksProps {
    dataToCheck: any;
}

export const HandlingUnitChecks = ({ dataToCheck }: IHandlingUnitChecksProps) => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const [isClosureLoading, setIsClosureLoading] = useState<boolean>(false);
    const {
        process,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        handlingUnitInfos,
        triggerAlternativeSubmit1,
        alternativeSubmitInput1,
        trigger: { triggerRender, setTriggerRender },
        setResetForm,
        formData: { formData, setFormData }
    } = dataToCheck;

    const modalRef = useRef<boolean | null>(null);
    const storedObject = JSON.parse(storage.get(process) || '{}');

    useEffect(() => {
        if (scannedInfo && handlingUnitInfos) {
            const firstBox = storedObject.step10.data.isHuToCreate ? true : false;
            if (
                handlingUnitInfos.handlingUnits?.count !== 0 &&
                handlingUnitInfos.handlingUnits.results[0].type ===
                    parameters.HANDLING_UNIT_TYPE_BOX &&
                handlingUnitInfos.handlingUnits.results[0].handlingUnitOutbounds[0]?.status >=
                    configs.HANDLING_UNIT_OUTBOUND_STATUS_PREPARED &&
                handlingUnitInfos.handlingUnits.results[0].handlingUnitOutbounds[0]?.status <=
                    configs.HANDLING_UNIT_OUTBOUND_STATUS_TO_BE_LOADED
            ) {
                //if first box do not check location
                if (
                    !firstBox &&
                    handlingUnitInfos.handlingUnits.results[0].handlingUnitOutbounds[0]
                        ?.carrierId !=
                        storedObject.step10.data.handlingUnit?.handlingUnitOutbounds[0]?.carrierId
                ) {
                    showError(t('messages:scanned-hu-cannot-be-palletized-on-this-pallet'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                } else {
                    const data: { [label: string]: any } = {};
                    data['handlingUnit'] = handlingUnitInfos.handlingUnits?.results[0];
                    setTriggerRender(!triggerRender);
                    storedObject[`step${stepNumber}`] = {
                        ...storedObject[`step${stepNumber}`],
                        data
                    };
                }
            } else {
                showError(t('messages:scanned-hu-cannot-be-palletized'));
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
    }, [handlingUnitInfos]);

    // handle pallet closure
    useEffect(() => {
        if (triggerAlternativeSubmit1.triggerAlternativeSubmit1) {
            if (!alternativeSubmitInput1) {
                showError(t('messages:no-pallet-to-close'));
                triggerAlternativeSubmit1.setTriggerAlternativeSubmit1(false);
            } else {
                setIsClosureLoading(true);
                const fetchData = async () => {
                    const res = await fetch(`/api/preparation-management/closePallet`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            handlingUnitOutbound: alternativeSubmitInput1
                        })
                    });
                    const response = await res.json();
                    if (res.ok) {
                        setIsClosureLoading(false);
                        triggerAlternativeSubmit1.setTriggerAlternativeSubmit1(false);
                        storage.remove(process);
                        storedObject[`step10`] = { previousStep: 0 };
                        storedObject[`step20`] = undefined;
                        storedObject[`step30`] = undefined;
                        storedObject['currentStep'] = 10;
                        storage.set(process, JSON.stringify(storedObject));
                        setTriggerRender(!triggerRender);
                    }
                    if (!res.ok) {
                        if (response.error.is_error) {
                            // specific error
                            showError(t(`errors:${response.error.code}`));
                        } else {
                            // generic error
                            showError(t('messages:closure-failed'));
                        }
                        setIsClosureLoading(false);
                        triggerAlternativeSubmit1.setTriggerAlternativeSubmit1(false);
                    }
                };
                fetchData();
            }
        }
    }, [triggerAlternativeSubmit1]);

    return <WrapperForm>{scannedInfo && !handlingUnitInfos ? <ContentSpin /> : <></>}</WrapperForm>;
};
