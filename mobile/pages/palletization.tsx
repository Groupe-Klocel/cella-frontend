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
import { PageContentWrapper, NavButton } from '@components';
import MainLayout from 'components/layouts/MainLayout';
import { FC, useEffect, useState } from 'react';
import { HeaderContent, RadioInfosHeader } from '@components';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { LsIsSecured } from '@helpers';
import { Space } from 'antd';
import { ArrowLeftOutlined, UndoOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
//import { ScanHandlingUnit } from '@CommonRadio';
import { ScanHandlingUnit } from 'modules/Preparation/Palletization/PagesContainer/ScanHandlingUnit';
import { HandlingUnitChecks } from 'modules/Preparation/Palletization/ChecksAndRecords/HandlingUnitChecks';
import { PalletChecks } from 'modules/Preparation/Palletization/ChecksAndRecords/PalletChecks';
import { ValidateHandlingUnitPalletizationForm } from 'modules/Preparation/Palletization/Forms/validateHandlingUnitPalletizationForm';
import { SelectHuModelFormPalletization } from 'modules/Preparation/Palletization/Forms/SelectHuModelFormPalletization';
type PageComponent = FC & { layout: typeof MainLayout };

const PalletizationInfo: PageComponent = () => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const router = useRouter();
    const [triggerRender, setTriggerRender] = useState<boolean>(true);
    const [originDisplay, setOriginDisplay] = useState<any>({});
    const [isHuToCreate, setIsHuToCreate] = useState<boolean>(false);
    const workflow = {
        processName: 'palletization',
        expectedSteps: [10, 20, 25, 30]
    };
    // [0] : 10 -> Scan Pallet
    // [1] : 20 -> Select HUModel
    // [2] : 25 -> Scan HU
    // [3] : 30 -> Validate
    const palletizationInfos = JSON.parse(storage.get(workflow.processName) || '{}');
    const [triggerAlternativeSubmit1, setTriggerAlternativeSubmit1] = useState<boolean>(false);

    console.log('plt-infos: ', palletizationInfos);

    //initialize workflow on step 0
    if (Object.keys(palletizationInfos).length === 0) {
        palletizationInfos[`step${workflow.expectedSteps[0]}`] = { previousStep: 0 };
        palletizationInfos['currentStep'] = workflow.expectedSteps[0];
        storage.set(workflow.processName, JSON.stringify(palletizationInfos));
    }

    //function to retrieve information to display in RadioInfosHeader
    useEffect(() => {
        const object: { [k: string]: any } = {};

        if (palletizationInfos[`step${workflow.expectedSteps[0]}`].data) {
            object[t('common:pallet')] =
                palletizationInfos[`step${workflow.expectedSteps[0]}`].data.handlingUnit.name;
            if (
                palletizationInfos[`step${workflow.expectedSteps[0]}`].data?.handlingUnit
                    ?.handlingUnitOutbounds &&
                palletizationInfos[`step${workflow.expectedSteps[0]}`].data.handlingUnit
                    ?.handlingUnitOutbounds[0]?.carrier?.name
            ) {
                object[t('common:carrier')] =
                    palletizationInfos[
                        `step${workflow.expectedSteps[0]}`
                    ].data.handlingUnit?.handlingUnitOutbounds[0]?.carrier?.name;
            }
            if (palletizationInfos[`step${workflow.expectedSteps[1]}`]?.data) {
                object[t('common:handling-unit-model')] =
                    palletizationInfos[
                        `step${workflow.expectedSteps[1]}`
                    ].data.handlingUnitModel.name;
            }
            object[t('common:number-of-boxes')] = palletizationInfos[
                `step${workflow.expectedSteps[0]}`
            ].data.handlingUnit.childrenHandlingUnits
                ? palletizationInfos[`step${workflow.expectedSteps[0]}`].data.handlingUnit
                      .childrenHandlingUnits?.length
                : '0';
        }
        setOriginDisplay(object);
    }, [triggerRender]);

    const onReset = () => {
        storage.remove(process);
        setTriggerRender(!triggerRender);
    };

    const previousPage = () => {
        router.back();
        storage.remove(process);
    };
    useEffect(() => {
        const isHuToCreate = palletizationInfos[`step${workflow.expectedSteps[0]}`]?.data
            ?.handlingUnit.childrenHandlingUnits?.length
            ? true
            : false;
        setIsHuToCreate(isHuToCreate);
    }, [isHuToCreate]);

    return (
        <PageContentWrapper>
            <HeaderContent
                title={t('common:palletization')}
                actionsRight={
                    <Space>
                        {palletizationInfos.currentStep > workflow.expectedSteps[0] ? (
                            <NavButton icon={<UndoOutlined />} onClick={onReset}></NavButton>
                        ) : (
                            <></>
                        )}
                        <NavButton icon={<ArrowLeftOutlined />} onClick={previousPage}></NavButton>
                    </Space>
                }
            />
            {Object.keys(originDisplay).length === 0 ? (
                <></>
            ) : (
                <RadioInfosHeader
                    input={{
                        displayed: originDisplay
                    }}
                ></RadioInfosHeader>
            )}
            {!palletizationInfos[`step${workflow.expectedSteps[0]}`]?.data ? (
                <>
                    <ScanHandlingUnit
                        process={workflow.processName}
                        stepNumber={workflow.expectedSteps[0]}
                        label={t('common:pallet')}
                        trigger={{ triggerRender, setTriggerRender }}
                        buttons={{ submitButton: true }}
                        triggerAlternativeSubmit1={{
                            triggerAlternativeSubmit1,
                            setTriggerAlternativeSubmit1
                        }}
                        checkComponent={(data: any) => <PalletChecks dataToCheck={data} />}
                    ></ScanHandlingUnit>
                </>
            ) : (
                <></>
            )}
            {palletizationInfos[`step${workflow.expectedSteps[0]}`]?.data &&
            !palletizationInfos[`step${workflow.expectedSteps[1]}`]?.data ? (
                <SelectHuModelFormPalletization
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[1]}
                    label={t('common:handling-unit-model')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{
                        submitButton: true,
                        backButton: true
                    }}
                ></SelectHuModelFormPalletization>
            ) : (
                <></>
            )}

            {palletizationInfos[`step${workflow.expectedSteps[1]}`]?.data &&
            !palletizationInfos[`step${workflow.expectedSteps[2]}`]?.data ? (
                <ScanHandlingUnit
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[2]}
                    label={t('common:box')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{
                        submitButton: true,
                        backButton: true,
                        alternativeSubmitButton1: palletizationInfos[
                            `step${workflow.expectedSteps[0]}`
                        ]?.data?.handlingUnit.childrenHandlingUnits?.length
                            ? true
                            : false
                    }}
                    triggerAlternativeSubmit1={{
                        triggerAlternativeSubmit1,
                        setTriggerAlternativeSubmit1
                    }}
                    checkComponent={(data: any) => <HandlingUnitChecks dataToCheck={data} />}
                ></ScanHandlingUnit>
            ) : (
                <></>
            )}
            {palletizationInfos[`step${workflow.expectedSteps[1]}`]?.data &&
            palletizationInfos[`step${workflow.expectedSteps[2]}`]?.data ? (
                <ValidateHandlingUnitPalletizationForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[2]}
                    trigger={{ triggerRender, setTriggerRender }}
                    handlingUnit={
                        palletizationInfos[`step${workflow.expectedSteps[0]}`].data?.handlingUnit
                    }
                    hUModel={
                        palletizationInfos[`step${workflow.expectedSteps[1]}`].data
                            ?.handlingUnitModel
                    }
                    box={palletizationInfos[`step${workflow.expectedSteps[2]}`].data?.handlingUnit}
                ></ValidateHandlingUnitPalletizationForm>
            ) : (
                <></>
            )}
        </PageContentWrapper>
    );
};

PalletizationInfo.layout = MainLayout;

export default PalletizationInfo;
