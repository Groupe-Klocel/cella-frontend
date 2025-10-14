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
import dayjs from 'dayjs';
import { useAppDispatch, useAppState } from 'context/AppContext';

export interface IFeatureChecksProps {
    dataToCheck: any;
}

export const FeatureChecks = ({ dataToCheck }: IFeatureChecksProps) => {
    const { t } = useTranslation();
    const storage = LsIsSecured();

    const {
        processName,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        featuresToProcess,
        processedFeatures,
        currentFeatureCode,
        contents,
        action1Trigger,
        setResetForm
    } = dataToCheck;

    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};

    // ScanArticle: manage information for persistence storage and front-end errors
    useEffect(() => {
        if (scannedInfo && featuresToProcess && currentFeatureCode) {
            if (featuresToProcess.length > 0) {
                const formattedScannedInfo =
                    dayjs(scannedInfo).isValid() && currentFeatureCode.dateType
                        ? dayjs(scannedInfo).format('YYYY-MM-DD')
                        : scannedInfo;
                //contentsFiltered is the variable that contains the contents filtered by the processedFeatures
                const contentsFiltered = processedFeatures
                    ? contents.filter((content: any) =>
                          content.handlingUnitContentFeatures.some((feature: any) =>
                              processedFeatures?.some(
                                  (processed: any) =>
                                      processed.featureCodeId === feature.featureCode.id &&
                                      processed.value === feature.value
                              )
                          )
                      )
                    : contents;

                // Check if the scannedInfo is valid and if the currentFeatureCode is a date type
                const checkNewFeatureExists = contentsFiltered.some((content: any) =>
                    content.handlingUnitContentFeatures.some(
                        (feature: any) =>
                            feature.featureCode.id === currentFeatureCode.id &&
                            feature.value === formattedScannedInfo &&
                            content.quantity > 0
                    )
                );

                if (!checkNewFeatureExists) {
                    showError(t('messages:combination-of-features-data-missing'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                    return;
                }

                const data: { [label: string]: any } = {};

                const tmp_featuresToProcess = featuresToProcess.find(
                    (feature: any) => feature.featureCodeId === currentFeatureCode.id
                );

                if (tmp_featuresToProcess) {
                    const processedFeature = {
                        ...tmp_featuresToProcess,
                        value: formattedScannedInfo
                    };

                    data['processedFeatures'] = [...(processedFeatures || []), processedFeature];
                }

                data['nextFeatureCode'] = featuresToProcess.find(
                    (feature: any) =>
                        feature.featureCodeId !== currentFeatureCode.id &&
                        !processedFeatures?.some(
                            (processed: any) => processed.featureCodeId === feature.featureCodeId
                        )
                )?.featureCode;
                dispatch({
                    type: 'UPDATE_BY_STEP',
                    processName,
                    stepName: `step${stepNumber}`,
                    object: {
                        ...storedObject[`step${stepNumber}`],
                        data
                    }
                });
                setResetForm(true);
                setScannedInfo(undefined);
            } else {
                showError(t('messages:no-feature'));
                setResetForm(true);
                setScannedInfo(undefined);
            }
        }
    }, [featuresToProcess, scannedInfo]);

    useEffect(() => {
        if (action1Trigger.action1Trigger) {
            const updatedData = { ...storedObject[`step${stepNumber}`].data };
            updatedData['nextFeatureCode'] = undefined;
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: `step${stepNumber}`,
                object: {
                    ...storedObject[`step${stepNumber}`],
                    updatedData
                }
            });
            setResetForm(true);
            setScannedInfo(undefined);
            action1Trigger.setAction1Trigger(false);
        }
    }, [action1Trigger.action1Trigger]);

    return <WrapperForm>{scannedInfo && !featuresToProcess ? <ContentSpin /> : <></>}</WrapperForm>;
};
