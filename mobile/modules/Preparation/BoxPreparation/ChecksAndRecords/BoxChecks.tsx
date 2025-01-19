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
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect } from 'react';
import configs from '../../../../../common/configs.json';

export interface IBoxChecksProps {
    dataToCheck: any;
}

export const BoxChecks = ({ dataToCheck }: IBoxChecksProps) => {
    const { t } = useTranslation();
    const storage = LsIsSecured();

    const {
        process,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        boxesInfos,
        trigger: { triggerRender, setTriggerRender },
        setResetForm
    } = dataToCheck;

    const storedObject = JSON.parse(storage.get(process) || '{}');
    // TYPED SAFE ALL
    // ScanBox-3: manage information for persistence storage and front-end errors
    useEffect(() => {
        if (scannedInfo && boxesInfos.data) {
            if (boxesInfos.data.handlingUnitOutbounds?.count !== 0) {
                const box = boxesInfos.data.handlingUnitOutbounds?.results[0];
                if (
                    (box.status == configs.HANDLING_UNIT_OUTBOUND_STATUS_STARTED ||
                        box.status == configs.HANDLING_UNIT_OUTBOUND_STATUS_IN_PREPARATION) &&
                    !box.roundId
                ) {
                    const data: { [label: string]: any } = {};
                    data['box'] = box;
                    //Retrieve the first box_line location to be picked
                    const boxLines = box.handlingUnitContentOutbounds
                        .filter(
                            (boxLine: any) =>
                                boxLine.pickedQuantity === null ||
                                boxLine.pickedQuantity < boxLine.quantityToBePicked
                        )
                        .sort((a: any, b: any) => {
                            return a.pickedQuantity === null && b.pickedQuantity === null
                                ? a.lineNumber - b.lineNumber
                                : a.pickedQuantity === null
                                  ? -1
                                  : b.pickedQuantity === null
                                    ? 1
                                    : a.pickedQuantity - b.pickedQuantity;
                        });
                    data['proposedBoxLine'] = boxLines[0];
                    setTriggerRender(!triggerRender);
                    storedObject[`step${stepNumber}`] = {
                        ...storedObject[`step${stepNumber}`],
                        data
                    };
                } else {
                    showError(t('messages:unexpected-scanned-item'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                }
            } else {
                showError(t('messages:no-box'));
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
    }, [boxesInfos]);

    return <WrapperForm>{scannedInfo && !boxesInfos ? <ContentSpin /> : <></>}</WrapperForm>;
};
