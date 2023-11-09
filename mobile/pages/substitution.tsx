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
import { EnterQuantity, ScanFeature, ScanHandlingUnit } from '@CommonRadio';
// import { QuantityChecks } from 'modules/Preparation/RoundPicking/ChecksAndRecords/QuantityChecks';
import { SelectRoundForm } from 'modules/Preparation/Substitution/Forms/SelectRoundForm';
import { SubstitutedFeatureChecks } from 'modules/Preparation/Substitution/ChecksAndRecords/SubstitutedFeatureChecks';
import { NewFeatureChecks } from 'modules/Preparation/Substitution/ChecksAndRecords/NewFeatureChecks';
import { ValidateSubstitutionForm } from 'modules/Preparation/Substitution/Forms/ValidateSubstitutionForm';
// import { ArticleOrFeatureChecks } from 'modules/Preparation/RoundPicking/ChecksAndRecords/ArticleOrFeatureChecks';
// import { HandlingUnitChecks } from 'modules/Preparation/RoundPicking/ChecksAndRecords/HandlingUnitChecks';
// import { ValidateRoundPickingForm } from 'modules/Preparation/RoundPicking/Forms/ValidateRoundPickingForm';

type PageComponent = FC & { layout: typeof MainLayout };

const Substitution: PageComponent = () => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const router = useRouter();
    const [triggerRender, setTriggerRender] = useState<boolean>(true);
    const [originDisplay, setOriginDisplay] = useState<any>({});
    const [finalDisplay, setFinalDisplay] = useState<any>({});
    const [headerContent, setHeaderContent] = useState<boolean>(false);
    const [displayed, setDisplayed] = useState<any>({});
    const [locationToPropose, setLocationToPropose] = useState<string>();
    const [articleToPropose, setArticleToPropose] = useState<string>();
    //define workflow parameters
    const workflow = {
        processName: 'substitution',
        expectedSteps: [10, 20, 30, 40]
    };
    const storedObject = JSON.parse(storage.get(workflow.processName) || '{}');

    console.log('substitution', storedObject);

    //initialize workflow on step 0
    if (Object.keys(storedObject).length === 0) {
        storedObject[`step${workflow.expectedSteps[0]}`] = { previousStep: 0 };
        storedObject['currentStep'] = workflow.expectedSteps[0];
        storage.set(workflow.processName, JSON.stringify(storedObject));
    }

    //function to retrieve information to display in RadioInfosHeader
    useEffect(() => {
        const object: { [k: string]: any } = {};
        if (storedObject[`step${workflow.expectedSteps[0]}`]?.data?.round) {
            const round = storedObject[`step${workflow.expectedSteps[0]}`]?.data?.round;
            object[t('common:round')] = round.name;
        }
        if (storedObject[`step${workflow.expectedSteps[1]}`]?.data?.substitutedFeature) {
            const article =
                storedObject[`step${workflow.expectedSteps[1]}`]?.data?.substitutedFeature
                    .handlingUnitContent.article;
            const id =
                storedObject[`step${workflow.expectedSteps[1]}`]?.data?.substitutedFeature.value;
            object[t('common:article_abbr')] = article.name;
            object[t('common:article-to-substitute')] = id;
        }
        if (storedObject[`step${workflow.expectedSteps[2]}`]?.data?.newFeature) {
            const newId = storedObject[`step${workflow.expectedSteps[2]}`]?.data?.newFeature.value;
            object[t('common:substitution-article')] = newId;
        }
        setOriginDisplay(object);
        setFinalDisplay(object);
    }, [triggerRender]);

    // retrieve location, article and qty to propose
    // useEffect(() => {
    //     if (storedObject[`step${workflow.expectedSteps[0]}`]?.data?.proposedRoundAdvisedAddress) {
    //         setLocationToPropose(
    //             storedObject[`step${workflow.expectedSteps[0]}`]?.data?.proposedRoundAdvisedAddress
    //                 .location?.name
    //         );
    //         setArticleToPropose(
    //             storedObject[`step${workflow.expectedSteps[0]}`]?.data?.proposedRoundAdvisedAddress
    //                 ?.handlingUnitContent?.article?.name
    //         );
    //     }
    // }, [storedObject, triggerRender]);

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
                title={t('common:substitution')}
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
                <SelectRoundForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[0]}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true, backButton: false }}
                ></SelectRoundForm>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[0]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[1]}`]?.data ? (
                <ScanFeature
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[1]}
                    label={t('common:article-to-substitute')}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    inputFeatures={
                        storedObject[`step${workflow.expectedSteps[0]}`]?.data
                            ?.substitutableFeatures
                    }
                    checkComponent={(data: any) => <SubstitutedFeatureChecks dataToCheck={data} />}
                ></ScanFeature>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[1]}`]?.data &&
            !storedObject[`step${workflow.expectedSteps[2]}`]?.data ? (
                <ScanFeature
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[2]}
                    label={t('common:substitution-article')}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    inputFeatures={
                        storedObject[`step${workflow.expectedSteps[1]}`]?.data?.substitutedFeature
                    }
                    checkComponent={(data: any) => <NewFeatureChecks dataToCheck={data} />}
                ></ScanFeature>
            ) : (
                <></>
            )}
            {storedObject[`step${workflow.expectedSteps[2]}`]?.data ? (
                <ValidateSubstitutionForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[3]}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    headerContent={{ setHeaderContent }}
                ></ValidateSubstitutionForm>
            ) : (
                <></>
            )}
        </PageContentWrapper>
    );
};

Substitution.layout = MainLayout;

export default Substitution;
