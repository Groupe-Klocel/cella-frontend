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
import { showError } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect } from 'react';
import dayjs from 'dayjs';
import { useAppDispatch, useAppState } from 'context/AppContext';

//TO BE REWORKED

export interface IFeatureChecksProps {
    dataToCheck: any;
}

export const FeatureChecks = ({ dataToCheck }: IFeatureChecksProps) => {
    const { t } = useTranslation();
    const state = useAppState();
    const dispatch = useAppDispatch();

    const {
        processName,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        featuresToProcess,
        processedFeatures,
        currentFeatureCode,
        action1Trigger,
        setResetForm
    } = dataToCheck;

    const storedObject = state[processName] || {};

    // ScanArticle: manage information for persistence storage and front-end errors
    useEffect(() => {
        const tmp_processedFeatures = processedFeatures ?? [];
        let updatedFeaturesToProcess;
        const data: { [label: string]: any } = {};
        if (scannedInfo && featuresToProcess && currentFeatureCode) {
            if (featuresToProcess.length > 0) {
                const featureToUpdate = featuresToProcess.find((item: any) => {
                    return item.featureCode.id === currentFeatureCode.id;
                });

                //this to record only date when scannedInfo is a valid date
                let shortDate;
                if (dayjs(scannedInfo).isValid() && currentFeatureCode.dateType) {
                    shortDate = dayjs(scannedInfo).format('YYYY-MM-DD');
                }
                if (!currentFeatureCode.unique) {
                    const updatedFeature = {
                        ...featureToUpdate,
                        value:
                            dayjs(scannedInfo).isValid() && currentFeatureCode.dateType
                                ? shortDate
                                : scannedInfo
                    };

                    tmp_processedFeatures.push(updatedFeature);

                    if (!storedObject[`step${stepNumber}`]?.data?.remainingFeatures) {
                        updatedFeaturesToProcess = featuresToProcess.filter((item: any) => {
                            return item.featureCode.id !== currentFeatureCode.id;
                        });
                    } else {
                        updatedFeaturesToProcess = storedObject[
                            `step${stepNumber}`
                        ]?.data?.remainingFeatures.filter((item: any) => {
                            return item.featureCode.id !== currentFeatureCode.id;
                        });
                    }
                } else {
                    let isUniqueFeaturesEnd = false;
                    const currentUniqueFeature = tmp_processedFeatures.find((item: any) => {
                        return item.featureCode.id === currentFeatureCode.id;
                    });

                    let tmp_uniqueFeatures = currentUniqueFeature ? currentUniqueFeature.value : [];

                    if (scannedInfo) {
                        tmp_uniqueFeatures.push(scannedInfo);
                    }

                    const updatedFeature = {
                        ...featureToUpdate,
                        value: tmp_uniqueFeatures
                    };
                    const existingIndex = tmp_processedFeatures.findIndex(
                        (item: any) => item.featureCode.id === currentFeatureCode.id
                    );
                    if (existingIndex === -1) {
                        tmp_processedFeatures.push(updatedFeature);
                    } else {
                        tmp_processedFeatures[existingIndex] = updatedFeature;
                    }

                    if (
                        processedFeatures &&
                        !storedObject[`step${stepNumber}`]?.data?.remainingFeatures
                    ) {
                        updatedFeaturesToProcess = featuresToProcess.filter((item: any) => {
                            return item.featureCode.id !== currentFeatureCode.id;
                        });
                    } else if (isUniqueFeaturesEnd) {
                        updatedFeaturesToProcess = storedObject[
                            `step${stepNumber}`
                        ]?.data?.remainingFeatures.filter((item: any) => {
                            return item.featureCode.id !== currentFeatureCode.id;
                        });
                    } else {
                        updatedFeaturesToProcess =
                            storedObject[`step${stepNumber}`]?.data?.remainingFeatures ??
                            featuresToProcess.filter((item: any) => {
                                return item.featureCode.id === currentFeatureCode.id;
                            });
                    }
                }
                data['remainingFeatures'] = updatedFeaturesToProcess;
                data['processedFeatures'] = tmp_processedFeatures;
                data['nextFeatureCode'] = updatedFeaturesToProcess[0]?.featureCode;
                setResetForm(true);
                setScannedInfo(undefined);
            } else {
                showError(t('messages:no-feature'));
                setResetForm(true);
                setScannedInfo(undefined);
            }
        }
        if (
            storedObject[`step${stepNumber}`] &&
            Object.keys(storedObject[`step${stepNumber}`]).length != 0
        ) {
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: `step${stepNumber}`,
                object: {
                    ...storedObject[`step${stepNumber}`],
                    data
                },
                customFields: [{ key: 'currentStep', value: stepNumber }]
            });
        }
    }, [featuresToProcess, scannedInfo]);

    useEffect(() => {
        let updatedData = {};
        if (action1Trigger.action1Trigger) {
            const updatedData = {
                ...storedObject[`step${stepNumber}`].data,
                remainingFeatures: [],
                nextFeatureCode: undefined
            };
            setResetForm(true);
            setScannedInfo(undefined);
            action1Trigger.setAction1Trigger(false);
        }
        if (storedObject[`step${stepNumber}`] && Object.keys(updatedData).length != 0) {
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: `step${stepNumber}`,
                object: {
                    ...storedObject[`step${stepNumber}`],
                    data: updatedData
                },
                customFields: [{ key: 'currentStep', value: stepNumber }]
            });
        }
    }, [action1Trigger.action1Trigger]);

    return <WrapperForm>{scannedInfo && !featuresToProcess ? <ContentSpin /> : <></>}</WrapperForm>;
};
