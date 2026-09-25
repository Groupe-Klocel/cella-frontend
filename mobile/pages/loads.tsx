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
import { FC, useEffect } from 'react';
import { HeaderContent, RadioInfosHeader } from '@components';
import {
    applyRfActionButtonsConfig,
    buildHeaderDisplay,
    useTranslationWithFallback as useTranslation,
    ButtonManagementType,
    HeaderManagementType
} from '@helpers';
import { Form, Space } from 'antd';
import { ArrowLeftOutlined, UndoOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import { SelectLoadForm } from 'modules/Common/Loads/PagesContainer/SelectLoadForm';
import { HandlingUnitOutboundChecks } from 'modules/Preparation/Load/ChecksAndRecords/HandlingUnitOutboundChecks';
import { ScanPalletBox } from 'modules/Common/Loads/PagesContainer/ScanPalletBox';
import { CheckFinalStepLoadForm } from 'modules/Preparation/Load/Forms/CheckFinalStepLoad';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { RadioButtonWrapper } from 'helpers/utils/radioButtonWrapper';

type PageComponent = FC & { layout: typeof MainLayout };

const LoadsPage: PageComponent = () => {
    const { t } = useTranslation();
    const router = useRouter();
    const state = useAppState();
    const dispatch = useAppDispatch();
    const { parameters } = state;
    const [form] = Form.useForm();

    const processName = 'load';
    // 10 -> SelectLoadForm
    // 20 -> ScanPalletBox
    // 30 -> CheckFinalStepLoadForm (auto-validate)
    const storedObject = state[processName] || {};

    console.log(`${processName}`, storedObject);

    //#region header
    const load = storedObject['step10']?.data?.load;
    const handlingUnitOutbound = storedObject['step20']?.data?.handlingUnitOutbound;
    const headerManagement: HeaderManagementType = [
        { label: t('common:load-number'), value: load?.name, visible: !!load },
        { label: t('common:carrier'), value: load?.carrier?.name, visible: !!load },
        { label: t('common:quantity-HU-scanned'), value: load?.numberHuLoaded, visible: !!load },
        {
            label: t('common:support-box'),
            value: handlingUnitOutbound?.name,
            visible: !!handlingUnitOutbound
        }
    ];
    const headerDisplay = buildHeaderDisplay(headerManagement);
    //#endregion

    //#region global buttons
    const onReset = () => {
        dispatch({ type: 'DELETE_RF_PROCESS', processName });
        form.resetFields();
    };

    const previousPage = () => {
        dispatch({ type: 'DELETE_RF_PROCESS', processName });
        router.back();
    };

    const onBack = () => {
        dispatch({
            type: 'ON_BACK',
            processName,
            stepToReturn: `step${storedObject[`step${storedObject.currentStep}`]?.previousStep}`
        });
        form.resetFields();
    };
    //#endregion

    //#region module buttons
    const buttonManagement: ButtonManagementType = [
        {
            key: 'submit',
            label: t('actions:submit'),
            visibleOnSteps: [10, 20],
            onClick: () => form.submit(),
            position: 'bottom'
        },
        {
            key: 'back',
            label: t('actions:back'),
            visibleOnSteps: [20],
            onClick: () => onBack(),
            position: 'bottom'
        }
    ];
    const orderedButtonManagement = applyRfActionButtonsConfig(buttonManagement, parameters);
    //#endregion

    //#region reset form on step change
    useEffect(() => {
        form.resetFields();
    }, [storedObject.currentStep]);
    //#endregion

    return (
        <PageContentWrapper>
            <HeaderContent
                title={t('common:load')}
                actionsRight={
                    <Space>
                        {storedObject.currentStep > 10 ? (
                            <NavButton icon={<UndoOutlined />} onClick={onReset}></NavButton>
                        ) : (
                            <></>
                        )}
                        <NavButton icon={<ArrowLeftOutlined />} onClick={previousPage}></NavButton>
                    </Space>
                }
            />
            {Object.keys(headerDisplay).length === 0 ? (
                <></>
            ) : (
                <RadioInfosHeader input={{ displayed: headerDisplay }}></RadioInfosHeader>
            )}
            <RadioButtonWrapper
                buttonManagement={orderedButtonManagement}
                currentStep={storedObject.currentStep}
            >
                {!storedObject['step10']?.data ? (
                    // Step 1 : Scan and Check Load
                    <SelectLoadForm
                        processName={processName}
                        stepNumber={10}
                        formToUse={form}
                    ></SelectLoadForm>
                ) : (
                    <></>
                )}
                {storedObject['step10']?.data && !storedObject['step20']?.data ? (
                    // Step 2 : Scan and Check Support/Box
                    <ScanPalletBox
                        processName={processName}
                        stepNumber={20}
                        label={t('common:support-box')}
                        formToUse={form}
                        checkComponent={(data: any) => (
                            <HandlingUnitOutboundChecks dataToCheck={data} />
                        )}
                    ></ScanPalletBox>
                ) : (
                    <></>
                )}
                {storedObject['step20']?.data &&
                !storedObject['step30']?.data &&
                storedObject['step20']?.nextStep === 30 ? (
                    // Step 3 : automatic final validation
                    <CheckFinalStepLoadForm
                        processName={processName}
                        stepNumber={30}
                        box={storedObject['step20'].data?.handlingUnitOutbound}
                        load={storedObject['step10'].data.load}
                    ></CheckFinalStepLoadForm>
                ) : (
                    <></>
                )}
            </RadioButtonWrapper>
        </PageContentWrapper>
    );
};

LoadsPage.layout = MainLayout;

export default LoadsPage;
