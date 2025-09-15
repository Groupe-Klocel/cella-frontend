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
import { UpperMobileSpinner } from 'components/common/dumb/Spinners/UpperMobileSpinner';
import { SelectPrinter } from 'modules/Preparation/boxChecking/Forms/selectPrinter';
import { ScanHandlingUnit } from 'modules/Preparation/boxChecking/Forms/ScanHandlingUnit';
import { HandlingUnitChecks } from 'modules/Preparation/boxChecking/ChecksAndRecords/HandlingUnitChecks';
import { ScanArticleEAN } from 'modules/Preparation/boxChecking/PagesContainer/ScanArticleEAN';
import { ArticleChecks } from 'modules/Preparation/boxChecking/ChecksAndRecords/ArticleChecks';
import { AutoValidateBoxChecking } from 'modules/Preparation/boxChecking/Forms/AutoValidateBoxChecking';

type PageComponent = FC & { layout: typeof MainLayout };

const BoxChecking: PageComponent = () => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const router = useRouter();
    const [triggerRender, setTriggerRender] = useState<boolean>(true);
    const [originDisplay, setOriginDisplay] = useState<any>({});
    const [finalDisplay, setFinalDisplay] = useState<any>({});
    const [headerContent, setHeaderContent] = useState<boolean>(false);
    const [displayed, setDisplayed] = useState<any>({});
    const [, setShowEmptyLocations] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const processName: 'boxChecking' = 'boxChecking';

    // 10 -> select printer
    // 20 -> select UM
    // 30 -> select article
    // 40 -> autovalidate

    const storedObject = JSON.parse(storage.get(processName) || '{}');

    //initialize workflow on step 0
    if (Object.keys(storedObject).length === 0) {
        storedObject['step10'] = { previousStep: 0 };
        storedObject['currentStep'] = 10;
        storage.set(processName, JSON.stringify(storedObject));
    }

    console.log('storedObject', storedObject);

    //function to retrieve information to display in RadioInfosHeader
    useEffect(() => {
        const object: { [k: string]: any } = {};

        if (storedObject['step10']?.data?.printers) {
            object[t('common:printer')] = storedObject['step10']?.data?.printers.value;
        }
        if (storedObject['step20']?.data) {
            object[t('common:handling-unit_abbr')] = storedObject['step20']?.data?.name;
        }

        setOriginDisplay(object);
        setFinalDisplay(object);
    }, [triggerRender]);

    useEffect(() => {
        headerContent ? setDisplayed(finalDisplay) : setDisplayed(originDisplay);
    }, [originDisplay, finalDisplay, headerContent]);

    const onReset = () => {
        storage.remove(processName);
        setHeaderContent(false);
        setShowEmptyLocations(false);
        setTriggerRender(!triggerRender);
    };

    const previousPage = () => {
        router.back();
        storage.remove(processName);
        setHeaderContent(false);
        setShowEmptyLocations(false);
    };

    // useEffect(() => {
    //     switch (storedObject.currentStep) {
    //         default:
    //             setIsLoading(false);
    //     }
    // }, [storedObject]);

    return (
        <PageContentWrapper>
            <HeaderContent
                title={t('common:box-checking')}
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
            {Object.keys(originDisplay).length === 0 && Object.keys(finalDisplay).length === 0 ? (
                <></>
            ) : (
                <RadioInfosHeader
                    input={{
                        displayed: displayed
                    }}
                ></RadioInfosHeader>
            )}
            {isLoading ? <UpperMobileSpinner></UpperMobileSpinner> : <></>}
            <div hidden={isLoading}>
                {!storedObject['step10']?.data ? (
                    <SelectPrinter
                        process={processName}
                        stepNumber={10}
                        trigger={{ triggerRender, setTriggerRender }}
                        buttons={{ submitButton: true, backButton: false }}
                    ></SelectPrinter>
                ) : (
                    <></>
                )}
                {storedObject['step10']?.data && !storedObject['step20']?.data ? (
                    <ScanHandlingUnit
                        process={processName}
                        stepNumber={20}
                        label={t('common:handling-unit')}
                        trigger={{ triggerRender, setTriggerRender }}
                        buttons={{
                            submitButton: true,
                            backButton: true
                        }}
                        checkComponent={(data: any) => <HandlingUnitChecks dataToCheck={data} />}
                    ></ScanHandlingUnit>
                ) : (
                    <></>
                )}
                {storedObject['step20']?.data && !storedObject['step30']?.data ? (
                    <ScanArticleEAN
                        process={processName}
                        stepNumber={30}
                        label={t('common:article')}
                        trigger={{ triggerRender, setTriggerRender }}
                        buttons={{
                            submitButton: true,
                            backButton: true
                        }}
                        checkComponent={(data: any) => <ArticleChecks dataToCheck={data} />}
                    ></ScanArticleEAN>
                ) : (
                    <></>
                )}
                {storedObject['step30']?.data && !storedObject['step40']?.data ? (
                    <AutoValidateBoxChecking
                        process={processName}
                        stepNumber={40}
                        trigger={{ triggerRender, setTriggerRender }}
                        buttons={{
                            submitButton: true,
                            backButton: true
                        }}
                        headerContent={{ setHeaderContent }}
                        autoValidateLoading={{ isAutoValidateLoading: setIsLoading }}
                    ></AutoValidateBoxChecking>
                ) : (
                    <></>
                )}
            </div>
        </PageContentWrapper>
    );
};

BoxChecking.layout = MainLayout;

export default BoxChecking;
