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
import { useEffect } from 'react';
import dayjs from 'dayjs';

export interface IFeatureChecksProps {
    dataToCheck: any;
}

export const FeatureChecks = ({ dataToCheck }: IFeatureChecksProps) => {
    const { t } = useTranslation();
    const storage = LsIsSecured();

    const {
        process,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        featuresToProcess,
        processedFeatures,
        currentFeatureCode,
        trigger: { triggerRender, setTriggerRender },
        action1Trigger,
        setResetForm
    } = dataToCheck;

    const storedObject = JSON.parse(storage.get(process) || '{}');

    // ScanArticle: manage information for persistence storage and front-end errors
    useEffect(() => {
        const tmp_processedFeatures = processedFeatures ?? [];
        let updatedFeaturesToProcess;
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

                const data: { [label: string]: any } = {};
                data['remainingFeatures'] = updatedFeaturesToProcess;
                data['processedFeatures'] = tmp_processedFeatures;
                data['nextFeatureCode'] = updatedFeaturesToProcess[0]?.featureCode;
                setTriggerRender(!triggerRender);
                storedObject[`step${stepNumber}`] = {
                    ...storedObject[`step${stepNumber}`],
                    data
                };
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
            storage.set(process, JSON.stringify(storedObject));
        }
    }, [featuresToProcess, scannedInfo]);

    useEffect(() => {
        if (action1Trigger.action1Trigger) {
            const updatedData = { ...storedObject[`step${stepNumber}`].data };
            updatedData['remainingFeatures'] = [];
            updatedData['nextFeatureCode'] = undefined;
            setTriggerRender(!triggerRender);
            storedObject[`step${stepNumber}`] = {
                ...storedObject[`step${stepNumber}`],
                data: updatedData
            };
            setResetForm(true);
            setScannedInfo(undefined);
            action1Trigger.setAction1Trigger(false);
        }
        if (
            storedObject[`step${stepNumber}`] &&
            Object.keys(storedObject[`step${stepNumber}`]).length != 0
        ) {
            storage.set(process, JSON.stringify(storedObject));
        }
    }, [action1Trigger.action1Trigger]);

    return <WrapperForm>{scannedInfo && !featuresToProcess ? <ContentSpin /> : <></>}</WrapperForm>;
};
