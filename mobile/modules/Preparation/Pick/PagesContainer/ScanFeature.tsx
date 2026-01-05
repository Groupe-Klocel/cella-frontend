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
import { ScanForm_reducer, DatePickerForm_reducer } from '@CommonRadio';
import { useEffect, useState } from 'react';
import { LsIsSecured } from '@helpers';
import { useRouter } from 'next/router';
import { Typography } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import styled from 'styled-components';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';
import { useAppDispatch, useAppState } from 'context/AppContext';

export interface IScanFeatureProps {
    processName: string;
    stepNumber: number;
    label: string;
    buttons: { [label: string]: any };
    checkComponent: any;
    featureType?: any;
    processedFeatures?: any;
    nextFeatureCode?: any;
    action1Trigger?: any;
    dataInfos?: any;
}
const { Title } = Typography;

const StyledTitle = styled(Title)`
    margin: 0 !important;
`;

const WrapperFeature = styled.div`
    padding: 2px 5px 2px 5px;
    margin: 2px;
    border: 1px solid;
    border-radius: 5px;
`;

export const ScanFeature = ({
    processName,
    stepNumber,
    label,
    action1Trigger: { action1Trigger, setAction1Trigger },
    buttons,
    checkComponent,
    featureType,
    processedFeatures,
    nextFeatureCode,
    dataInfos
}: IScanFeatureProps) => {
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    const [scannedInfo, setScannedInfo] = useState<string>();
    const [resetForm, setResetForm] = useState<boolean>(false);
    const router = useRouter();
    const { t } = useTranslation();
    const [buttonsState, setButtonsState] = useState<any>({ ...buttons });
    const { graphqlRequestClient } = useAuth();
    const { contents, articleLuBarcode, article } = dataInfos;
    //N.B.: Version1 autorecovers information from previous step as there is only one HUC and no features scan check.
    //Pre-requisite: initialize current step
    useEffect(() => {
        //check workflow direction and assign current step accordingly
        if (contents.length === 1 || featureType.length === 0) {
            // N.B.: in this case previous step is kept at its previous value
            const proposedRoundAdvisedAddressData =
                storedObject['step10'].data.proposedRoundAdvisedAddresses[0];
            const data: { [label: string]: any } = {};
            if (contents.length === 1) {
                data['processedFeatures'] = contents[0].handlingUnitContentFeatures;
                data['content'] = contents[0];
            } else {
                const matchedContent = contents.find(
                    (content: any) =>
                        content.articleId === articleLuBarcode.articleId &&
                        proposedRoundAdvisedAddressData.handlingUnitContent.handlingUnitContentFeatures.every(
                            (hucf: any) =>
                                content.handlingUnitContentFeatures.some(
                                    (feature: any) =>
                                        feature.featureCode.id === hucf.featureCodeId &&
                                        feature.value === hucf.value
                                )
                        )
                );

                data['content'] = matchedContent;
                data['processedFeatures'] = matchedContent?.handlingUnitContentFeatures;
            }
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: `step${stepNumber}`,
                object: { data }
            });
            setScannedInfo(undefined);
            setResetForm(true);
            return;
        } else {
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: `step${stepNumber}`,
                object: { previousStep: storedObject.currentStep },
                customFields: [{ key: 'currentStep', value: stepNumber }]
            });
        }
    }, []);

    //initialize features to process
    const [currentFeatureCode, setCurrentFeatureCode] = useState<any>();

    useEffect(() => {
        if (featureType.length === 0) {
            return;
        }
        if (!nextFeatureCode && contents.length > 1) {
            setCurrentFeatureCode(featureType[0].featureCode);
        } else {
            setCurrentFeatureCode(nextFeatureCode);
        }
    }, [nextFeatureCode]);

    const dataToCheck = {
        processName,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        featuresToProcess: featureType,
        processedFeatures: processedFeatures,
        currentFeatureCode,
        contents,
        action1Trigger: { action1Trigger, setAction1Trigger },
        setResetForm
    };

    useEffect(() => {
        if (currentFeatureCode?.unique) {
            const currentUniqueFeature = processedFeatures
                ? processedFeatures.find((item: any) => {
                      return item.featureCode.id === currentFeatureCode.id;
                  })
                : {};
            if (currentUniqueFeature && Object.keys(currentUniqueFeature).length > 0) {
                setButtonsState((prevButtons: any) => ({
                    ...prevButtons,
                    action1Button: true
                }));
            }
        }
    }, [currentFeatureCode]);

    return (
        <WrapperFeature>
            <StyledTitle level={5}>{t('common:feature-codes-entry')}</StyledTitle>
            {!currentFeatureCode?.dateType ? (
                <ScanForm_reducer
                    processName={processName}
                    stepNumber={stepNumber}
                    label={currentFeatureCode ? currentFeatureCode.name : label}
                    buttons={{ ...buttonsState }}
                    action1Trigger={{ action1Trigger, setAction1Trigger }}
                    action1Label={t('common:finish-features-entry')}
                    setScannedInfo={setScannedInfo}
                    resetForm={{ resetForm, setResetForm }}
                ></ScanForm_reducer>
            ) : (
                <DatePickerForm_reducer
                    processName={processName}
                    stepNumber={stepNumber}
                    label={currentFeatureCode ? currentFeatureCode.name : label}
                    buttons={{ ...buttons }}
                    setScannedInfo={setScannedInfo}
                    resetForm={{ resetForm, setResetForm }}
                ></DatePickerForm_reducer>
            )}
            {checkComponent(dataToCheck)}
        </WrapperFeature>
    );
};
