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
import { ScanForm, DatePickerForm } from '@CommonRadio';
import { useEffect, useState } from 'react';
import { useFeatureTypeDetails } from '@helpers';
import { LsIsSecured } from '@helpers';
import { useRouter } from 'next/router';
import { Typography } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import styled from 'styled-components';

export interface IScanFeatureProps {
    process: string;
    stepNumber: number;
    label: string;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    checkComponent: any;
    featureType?: any;
    processedFeatures?: any;
    nextFeatureCode?: any;
    action1Trigger?: any;
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
    process,
    stepNumber,
    label,
    trigger: { triggerRender, setTriggerRender },
    action1Trigger: { action1Trigger, setAction1Trigger },
    buttons,
    checkComponent,
    featureType,
    processedFeatures,
    nextFeatureCode
}: IScanFeatureProps) => {
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');
    const [scannedInfo, setScannedInfo] = useState<string>();
    const [resetForm, setResetForm] = useState<boolean>(false);
    const router = useRouter();
    const { t } = useTranslation();
    const [buttonsState, setButtonsState] = useState<any>({ ...buttons });

    //Pre-requisite: initialize current step
    useEffect(() => {
        //check workflow direction and assign current step accordingly
        if (featureType === null) {
            // N.B.: in this case previous step is kept at its previous value
            const data: { [label: string]: any } = {};
            data['feature'] = null;
            data['remainingFeatures'] = [];
            storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
            setTriggerRender(!triggerRender);
        } else if (storedObject.currentStep < stepNumber) {
            storedObject[`step${stepNumber}`] = {
                previousStep: storedObject.currentStep
            };
            storedObject.currentStep = stepNumber;
        }
        storage.set(process, JSON.stringify(storedObject));
    }, []);

    const featuresInfos = useFeatureTypeDetails(
        { featureType, atReception: true },
        1,
        100,
        { field: 'featureCode_unique', ascending: true },
        router.locale
    );

    //initialize features to process
    const [initialFeaturesList, setInitialFeaturesList] = useState<any>();
    const [currentFeatureCode, setCurrentFeatureCode] = useState<any>();
    useEffect(() => {
        if (featuresInfos?.data?.featureTypeDetails?.results) {
            const queriedFeatures = featuresInfos?.data?.featureTypeDetails?.results;
            setInitialFeaturesList(queriedFeatures);
            if (!nextFeatureCode) {
                setCurrentFeatureCode(queriedFeatures[0].featureCode);
            } else {
                setCurrentFeatureCode(nextFeatureCode);
            }
        }
    }, [featuresInfos.data, nextFeatureCode]);

    const dataToCheck = {
        process,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        featuresToProcess: initialFeaturesList,
        processedFeatures,
        currentFeatureCode,
        trigger: { triggerRender, setTriggerRender },
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
                <ScanForm
                    process={process}
                    stepNumber={stepNumber}
                    label={currentFeatureCode ? currentFeatureCode.name : label}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ ...buttonsState }}
                    action1Trigger={{ action1Trigger, setAction1Trigger }}
                    action1Label={t('common:finish-features-entry')}
                    setScannedInfo={setScannedInfo}
                    resetForm={{ resetForm, setResetForm }}
                    mask={currentFeatureCode?.mask}
                ></ScanForm>
            ) : (
                <DatePickerForm
                    process={process}
                    stepNumber={stepNumber}
                    label={currentFeatureCode ? currentFeatureCode.name : label}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ ...buttons }}
                    setScannedInfo={setScannedInfo}
                    resetForm={{ resetForm, setResetForm }}
                ></DatePickerForm>
            )}
            {checkComponent(dataToCheck)}
        </WrapperFeature>
    );
};
