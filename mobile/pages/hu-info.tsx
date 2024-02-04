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
import { ScanHandlingUnit } from '@CommonRadio';
import { HandlingUnitChecks } from 'modules/Misc/HuInfo/ChecksAndRecords/HandlingUnitChecks';
import { SelectContentForHuForm } from 'modules/Misc/HuInfo/Forms/SelectContentForHuForm';
import { SelectChildHuForHuForm } from 'modules/Misc/HuInfo/Forms/SelectChildHuForHuForm';

type PageComponent = FC & { layout: typeof MainLayout };

const HuInfo: PageComponent = () => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const router = useRouter();
    const [triggerRender, setTriggerRender] = useState<boolean>(true);
    const [originDisplay, setOriginDisplay] = useState<any>({});
    const [finalDisplay, setFinalDisplay] = useState<any>({});
    const [headerContent, setHeaderContent] = useState<boolean>(false);
    const [displayed, setDisplayed] = useState<any>({});
    const workflow = {
        processName: 'handlingUnitInfo',
        expectedSteps: [10, 20, 30]
    };
    const handlingUnitInfo = JSON.parse(storage.get(workflow.processName) || '{}');

    // console.log('HUI', handlingUnitInfo);

    //initialize workflow on step 0
    if (Object.keys(handlingUnitInfo).length === 0) {
        handlingUnitInfo[`step${workflow.expectedSteps[0]}`] = { previousStep: 0 };
        handlingUnitInfo['currentStep'] = workflow.expectedSteps[0];
        storage.set(workflow.processName, JSON.stringify(handlingUnitInfo));
    }

    const chosenChildHu = handlingUnitInfo[`step${workflow.expectedSteps[1]}`]?.data?.chosenChildHu;

    //function to retrieve information to display in RadioInfosHeader
    useEffect(() => {
        const object: { [k: string]: any } = {};

        setHeaderContent(false);

        if (handlingUnitInfo[`step${workflow.expectedSteps[0]}`].data) {
            object[t('common:handling-unit')] =
                handlingUnitInfo[`step${workflow.expectedSteps[0]}`].data.handlingUnit.name;
            object[t('common:handling-unit-parent_abbr')] =
                handlingUnitInfo[
                    `step${workflow.expectedSteps[0]}`
                ].data.handlingUnit.parentHandlingUnit?.name;
            object[t('common:type')] =
                handlingUnitInfo[`step${workflow.expectedSteps[0]}`].data.handlingUnit.typeText;
            object[t('common:category')] =
                handlingUnitInfo[`step${workflow.expectedSteps[0]}`].data.handlingUnit.categoryText;
            object[t('common:location')] =
                handlingUnitInfo[
                    `step${workflow.expectedSteps[0]}`
                ].data.handlingUnit.location?.name;
        }
        setOriginDisplay(object);
    }, [triggerRender]);

    useEffect(() => {
        const object: { [k: string]: any } = {};

        if (chosenChildHu) {
            setHeaderContent(true);

            object[t('common:handling-unit')] = chosenChildHu.name;
            //object[t('common:handling-unit-parent_abbr')] = chosenChildHu.name;

            object[t('common:type')] = chosenChildHu.typeText;
            object[t('common:category')] = chosenChildHu.categoryText;
        }

        setFinalDisplay(object);
    }, [triggerRender]);

    useEffect(() => {
        headerContent ? setDisplayed(finalDisplay) : setDisplayed(originDisplay);
    }, [originDisplay, finalDisplay, headerContent]);

    const onReset = () => {
        storage.removeAll();
        setHeaderContent(false);
        setTriggerRender(!triggerRender);
    };

    const previousPage = () => {
        router.back();
        storage.removeAll();
        setHeaderContent(false);
    };

    return (
        <PageContentWrapper>
            <HeaderContent
                title={t('common:handling-unit')}
                actionsRight={
                    <Space>
                        {handlingUnitInfo.currentStep > workflow.expectedSteps[0] ? (
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
            {!handlingUnitInfo[`step${workflow.expectedSteps[0]}`]?.data ? (
                <ScanHandlingUnit
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[0]}
                    label={t('common:handling-unit')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true, backButton: true }}
                    checkComponent={(data: any) => <HandlingUnitChecks dataToCheck={data} />}
                ></ScanHandlingUnit>
            ) : (
                <></>
            )}

            {handlingUnitInfo[`step${workflow.expectedSteps[0]}`]?.data &&
            !handlingUnitInfo[`step${workflow.expectedSteps[1]}`]?.data ? (
                handlingUnitInfo[`step${workflow.expectedSteps[0]}`]?.data.handlingUnit
                    .childrenHandlingUnits.length >= 1 ? (
                    <SelectChildHuForHuForm
                        process={workflow.processName}
                        stepNumber={workflow.expectedSteps[1]}
                        trigger={{ triggerRender, setTriggerRender }}
                        buttons={{ submitButton: false }}
                        huId={
                            handlingUnitInfo[`step${workflow.expectedSteps[0]}`].data?.handlingUnit
                                .id
                        }
                    ></SelectChildHuForHuForm>
                ) : handlingUnitInfo[`step${workflow.expectedSteps[0]}`]?.data.handlingUnit
                      .handlingUnitContents.length >= 1 ? (
                    <SelectContentForHuForm
                        process={workflow.processName}
                        stepNumber={workflow.expectedSteps[1]}
                        trigger={{ triggerRender, setTriggerRender }}
                        buttons={{ submitButton: false }}
                        huId={
                            handlingUnitInfo[`step${workflow.expectedSteps[0]}`].data?.handlingUnit
                                .id
                        }
                        headerContent={{}}
                    ></SelectContentForHuForm>
                ) : (
                    <></>
                )
            ) : (
                <></>
            )}

            {handlingUnitInfo[`step${workflow.expectedSteps[0]}`]?.data &&
            handlingUnitInfo[`step${workflow.expectedSteps[1]}`]?.data &&
            !handlingUnitInfo[`step${workflow.expectedSteps[2]}`]?.data &&
            chosenChildHu ? (
                <SelectContentForHuForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[2]}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: false }}
                    huId={chosenChildHu.id}
                    headerContent={{ headerContent, setHeaderContent }}
                ></SelectContentForHuForm>
            ) : (
                <></>
            )}
        </PageContentWrapper>
    );
};

HuInfo.layout = MainLayout;

export default HuInfo;
