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
import {
    SelectArticleByStockOwnerForm,
    SelectContentForArticleForm,
    ScanArticleOrFeature
} from '@CommonRadio';
import { ArticleOrFeatureChecks } from 'modules/Misc/ArticleInfo/ChecksAndRecords/ArticleOrFeatureChecks';

type PageComponent = FC & { layout: typeof MainLayout };

const ArticleInfo: PageComponent = () => {
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
        processName: 'articleInfo',
        expectedSteps: [10, 20, 30]
    };
    const articleInfo = JSON.parse(storage.get(workflow.processName) || '{}');

    //initialize workflow on step 0
    if (Object.keys(articleInfo).length === 0) {
        articleInfo[`step${workflow.expectedSteps[0]}`] = { previousStep: 0 };
        articleInfo['currentStep'] = workflow.expectedSteps[0];
        storage.set(workflow.processName, JSON.stringify(articleInfo));
    }

    //function to retrieve information to display in RadioInfosHeader
    useEffect(() => {
        const object: { [k: string]: any } = {};

        if (articleInfo[`step${workflow.expectedSteps[1]}`]?.data?.chosenArticleLuBarcode) {
            const chosenArticleLuBarcode =
                articleInfo[`step${workflow.expectedSteps[1]}`]?.data?.chosenArticleLuBarcode;

            object[t('common:article_abbr')] = chosenArticleLuBarcode.stockOwner
                ? chosenArticleLuBarcode.article.name +
                  ' (' +
                  chosenArticleLuBarcode.stockOwner.name +
                  ')'
                : chosenArticleLuBarcode.article.name;
            object[t('common:article-description')] = chosenArticleLuBarcode.article.description;
            chosenArticleLuBarcode.barcode
                ? (object[t('common:barcode')] = chosenArticleLuBarcode.barcode.name)
                : undefined;
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
                title={t('common:article-info')}
                actionsRight={
                    <Space>
                        {articleInfo.currentStep > workflow.expectedSteps[0] ? (
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
            {!articleInfo[`step${workflow.expectedSteps[0]}`]?.data ? (
                <ScanArticleOrFeature
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[0]}
                    label={t('common:article')}
                    buttons={{ submitButton: true, backButton: true }}
                    trigger={{ triggerRender, setTriggerRender }}
                    checkComponent={(data: any) => <ArticleOrFeatureChecks dataToCheck={data} />}
                ></ScanArticleOrFeature>
            ) : (
                <></>
            )}
            {/* {!articleInfo[`step${workflow.expectedSteps[0]}`]?.data ? (
                <ScanArticleForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[0]}
                    label={t('common:article')}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true }}
                ></ScanArticleForm>
            ) : (
                <></>
            )} */}
            {articleInfo[`step${workflow.expectedSteps[0]}`]?.data &&
            !articleInfo[`step${workflow.expectedSteps[1]}`]?.data ? (
                <SelectArticleByStockOwnerForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[1]}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: true }}
                    articleLuBarcodes={
                        articleInfo[`step${workflow.expectedSteps[0]}`].data.articleLuBarcodes
                    }
                ></SelectArticleByStockOwnerForm>
            ) : (
                <></>
            )}
            {articleInfo[`step${workflow.expectedSteps[1]}`]?.data ? (
                <SelectContentForArticleForm
                    process={workflow.processName}
                    stepNumber={workflow.expectedSteps[2]}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ submitButton: false }}
                    articleId={
                        articleInfo[`step${workflow.expectedSteps[1]}`].data.chosenArticleLuBarcode
                            .articleId
                    }
                    hideSelect={true}
                    uniqueId={
                        articleInfo[`step${workflow.expectedSteps[0]}`].data?.feature?.value ??
                        undefined
                    }
                ></SelectContentForArticleForm>
            ) : (
                <></>
            )}
        </PageContentWrapper>
    );
};

ArticleInfo.layout = MainLayout;

export default ArticleInfo;
