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
import { ScanBoxForm } from '@CommonRadio';

type PageComponent = FC & { layout: typeof MainLayout };

const BoxInfo: PageComponent = () => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const router = useRouter();
    const [triggerRender, setTriggerRender] = useState<boolean>(true);
    const [originDisplay, setOriginDisplay] = useState<any>({});
    const [finalDisplay, setFinalDisplay] = useState<any>({});
    const [headerContent, setHeaderContent] = useState<boolean>(false);
    const [displayed, setDisplayed] = useState<any>({});
    const [, setShowEmptyLocations] = useState<boolean>(false);

    //define workflow parameters
    const workflow = {
        processName: 'boxInfo',
        expectedSteps: [10]
    };
    const boxInfo = JSON.parse(storage.get(workflow.processName) || '{}');

    //initialize workflow on step 0
    if (Object.keys(boxInfo).length === 0) {
        boxInfo[`step${workflow.expectedSteps[0]}`] = { previousStep: 0 };
        boxInfo['currentStep'] = workflow.expectedSteps[0];
        storage.set(workflow.processName, JSON.stringify(boxInfo));
    }

    //function to retrieve information to display in RadioInfosHeader
    useEffect(() => {
        const object: { [k: string]: any } = {};

        if (boxInfo[`step${workflow.expectedSteps[0]}`]?.data?.handlingUnitOutbound) {
            const infoBox = boxInfo[`step${workflow.expectedSteps[0]}`]?.data?.handlingUnitOutbound;

            object[t('common:shipping-unit-box_abbr')] = infoBox.name;
            {
                infoBox.delivery ? (object[t('common:order_abbr')] = infoBox.delivery.name) : null;
            }
            object[t('common:status')] = infoBox.statusText;
            {
                infoBox.stockOwner
                    ? (object[t('common:stock-owner_abbr')] = infoBox.handlingUnit.stockOwner.name)
                    : null;
            }

            object[t('common:handling-unit-model')] = infoBox.handlingUnitModel?.name;
            object[t('common:carrier')] = infoBox.carrierShippingMode?.carrier?.name;
            object[t('common:shipping-mode')] = infoBox.carrierShippingMode?.shippingMode;
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
    };

    return (
        <PageContentWrapper>
            <HeaderContent
                title={t('common:shipping-unit-box-info')}
                actionsRight={
                    <Space>
                        <NavButton icon={<UndoOutlined />} onClick={onReset}></NavButton>
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
            {!boxInfo[`step${workflow.expectedSteps[0]}`]?.data ? (
                <ScanBoxForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[0]}
                    label={t('common:shipping-unit-box')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true }}
                ></ScanBoxForm>
            ) : (
                <></>
            )}
        </PageContentWrapper>
    );
};

BoxInfo.layout = MainLayout;

export default BoxInfo;
