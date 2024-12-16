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
import useTranslation from 'next-translate/useTranslation';
import { LsIsSecured } from '@helpers';
import { Space } from 'antd';
import { ArrowLeftOutlined, UndoOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import { SelectLoadForm } from 'modules/Common/Loads/PagesContainer/SelectLoadForm';
import { HandlingUnitOutboundChecks } from 'modules/Preparation/Load/ChecksAndRecords/HandlingUnitOutboundChecks';
import { ScanPalletBox } from 'modules/Common/Loads/PagesContainer/ScanPalletBox';
import { ValidateLoadForm } from 'modules/Preparation/Load/Forms/ValidateLoad';
import { CheckFinalStepLoadForm } from 'modules/Preparation/Load/Forms/CheckFinalStepLoad';

type PageComponent = FC & { layout: typeof MainLayout };

const LoadsPage: PageComponent = () => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const router = useRouter();
    const [triggerRender, setTriggerRender] = useState<boolean>(true);
    const [originDisplay, setOriginDisplay] = useState<any>({});
    const [finalDisplay, setFinalDisplay] = useState<any>({});
    const [headerContent, setHeaderContent] = useState<boolean>(false);
    const [displayed, setDisplayed] = useState<any>({});
    const [showEmptyLocations, setShowEmptyLocations] = useState<boolean>(false);
    //define workflow parameters
    const workflow = {
        processName: 'load',
        expectedSteps: [10, 20, 25, 30]
    };
    const storedObject = JSON.parse(storage.get(workflow.processName) || '{}');
    console.log(storedObject);
    //initialize workflow on step 0
    if (Object.keys(storedObject).length === 0) {
        storedObject[`step${workflow.expectedSteps[0]}`] = { previousStep: 0 };
        storedObject['currentStep'] = workflow.expectedSteps[0];
        storage.set(workflow.processName, JSON.stringify(storedObject));
    }
    //function to retrieve information to display in RadioInfosHeader
    useEffect(() => {
        const object: { [k: string]: any } = {};
        if (storedObject[`step${workflow.expectedSteps[0]}`]?.data?.load) {
            const load = storedObject[`step${workflow.expectedSteps[0]}`]?.data?.load;
            object[t('common:load-number')] = load.name;
            object[t('common:carrier')] = load.carrier.name;
            object[t('common:quantity-HU-scanned')] = load.numberHuLoaded;
        }
        if (storedObject[`step${workflow.expectedSteps[1]}`]?.data?.handlingUnitOutbound) {
            const handlingUnitOutbound =
                storedObject[`step${workflow.expectedSteps[1]}`]?.data?.handlingUnitOutbound;
            object[t('common:support-box')] = handlingUnitOutbound.name;
        }
        setOriginDisplay(object);
        setFinalDisplay(object);
    }, [triggerRender]);

    useEffect(() => {
        headerContent ? setDisplayed(finalDisplay) : setDisplayed(originDisplay);
    }, [originDisplay, finalDisplay, headerContent]);

    const onReset = () => {
        storage.removeAll();
        setHeaderContent(false);
        setShowEmptyLocations(false);
        setTriggerRender(!triggerRender);
    };

    const previousPage = () => {
        router.back();
        storage.removeAll();
        setHeaderContent(false);
        setShowEmptyLocations(false);
    };

    return (
        <PageContentWrapper>
            <HeaderContent
                title={t('common:load')}
                actionsRight={
                    <Space>
                        {storedObject.currentStep > workflow.expectedSteps[0] ? (
                            <NavButton icon={<UndoOutlined />} onClick={onReset}></NavButton>
                        ) : (
                            <></>
                        )}
                        <NavButton icon={<ArrowLeftOutlined />} onClick={previousPage}></NavButton>
                    </Space>
                }
            />
            {Object.keys(originDisplay).length === 0 && Object.keys(finalDisplay).length === 0 ? (
                <></>
            ) : (
                <RadioInfosHeader
                    input={{
                        displayed: displayed
                    }}
                ></RadioInfosHeader>
            )}
            {!storedObject[`step${workflow.expectedSteps[0]}`]?.data ? (
                // Step 1 : Scan and Check Load
                <SelectLoadForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[0]}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true, backButton: false }}
                ></SelectLoadForm>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[0]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[1]}`]?.data ? (
                // Step 2 : Scan and Check Support/Box
                <ScanPalletBox
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[1]}
                    label={t('common:support-box')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true, backButton: true }}
                    checkComponent={(data: any) => (
                        <HandlingUnitOutboundChecks dataToCheck={data} />
                    )}
                ></ScanPalletBox>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[1]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[3]}`]?.data ? (
                storedObject[`step${workflow.expectedSteps[1]}`]?.nextStep === 30 ? (
                    <CheckFinalStepLoadForm
                        process={workflow.processName}
                        stepNumber={workflow.expectedSteps[3]}
                        trigger={{ triggerRender, setTriggerRender }}
                        box={
                            storedObject[`step${workflow.expectedSteps[1]}`].data
                                ?.handlingUnitOutbound
                        }
                        load={storedObject[`step${workflow.expectedSteps[0]}`].data.load}
                        headerContent={{ setHeaderContent }}
                    ></CheckFinalStepLoadForm>
                ) : (
                    // ---------------- For manual validation ---------------- //
                    // <ValidateLoadForm
                    //     process={workflow.processName}
                    //     stepNumber={workflow.expectedSteps[3]}
                    //     buttons={{ submitButton: true, backButton: true }}
                    //     trigger={{ triggerRender, setTriggerRender }}
                    //     headerContent={{ setHeaderContent }}
                    // ></ValidateLoadForm>
                    (() => {
                        storedObject.currentStep = workflow.expectedSteps[1];
                        storage.set(workflow.processName, JSON.stringify(storedObject));
                        setTriggerRender(!triggerRender);
                        return null;
                    })()
                )
            ) : (
                <></>
            )}
        </PageContentWrapper>
    );
};

LoadsPage.layout = MainLayout;

export default LoadsPage;
