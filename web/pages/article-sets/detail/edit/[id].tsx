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
import { AppHead, HeaderContent } from '@components';
import { useRouter } from 'next/router';
import { FC, useEffect, useState } from 'react';
import { EditItemComponent } from 'modules/Crud/EditItemComponentV2';
import useTranslation from 'next-translate/useTranslation';
import { META_DEFAULTS, useArticles, useArticleSets } from '@helpers';
import { FormDataType, FormOptionType } from 'models/Models';
import MainLayout from 'components/layouts/MainLayout';
import { articleSetsRoutes } from 'modules/ArticleSets/Static/articleSetRoutes';
import { ArticleSetDetailModelV2 } from 'models/ArticleSetDetailModelV2';

type PageComponent = FC & { layout: typeof MainLayout };

const EditArticleSetDetailPage: PageComponent = () => {
    const { t } = useTranslation();
    const errorMessageEmptyInput = t('messages:error-message-empty-input');

    const [articleSet, setArticleSet] = useState<Array<FormOptionType>>();
    const [article, setArticle] = useState<Array<FormOptionType>>();
    const [stockOwnerOptions, setStockOwner] = useState<Array<FormOptionType>>();
    const articleSetData = useArticleSets({}, 1, 100, null);
    const articleData = useArticles({}, 1, 100, null);
    const stockOwnerData = useArticleSets({}, 1, 100, null);

    const router = useRouter();
    const { id } = router.query;
    const [data, setData] = useState<any>();

    const articleSetDetailBreadCrumb = [
        ...articleSetsRoutes,
        {
            breadcrumbName: `${data?.articleSet_name}`,
            path: '/article-sets/' + data?.articleSetId
        }
    ];
    const breadsCrumb = [
        ...articleSetDetailBreadCrumb,
        {
            breadcrumbName: `${data?.articleSet_name}`
        }
    ];

    useEffect(() => {
        if (articleSetData.data) {
            const newIdOpts: Array<FormOptionType> = [];
            articleSetData.data.articleSets?.results.forEach(({ id, name }) => {
                newIdOpts.push({ text: name!, key: id! });
            });
            setArticleSet(newIdOpts);
        }
    }, [articleSetData.data]);

    useEffect(() => {
        if (articleData.data) {
            const newIdOpts: Array<FormOptionType> = [];
            articleData.data.articles?.results.forEach(({ id, name }) => {
                newIdOpts.push({ text: name!, key: id! });
            });
            setArticle(newIdOpts);
        }
    }, [articleData.data]);

    useEffect(() => {
        const newIdOpts: Array<FormOptionType> = [];
        newIdOpts.push({ text: data?.stockOwner_name, key: data?.stockOwnerId });
        setStockOwner(newIdOpts);
    }, [stockOwnerData.data]);

    const title = data?.articleSet_name + ' / ' + data?.articleSet_name;

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <EditItemComponent
                id={id!}
                dataModel={ArticleSetDetailModelV2}
                setData={setData}
                headerComponent={
                    <HeaderContent
                        title={`${t('common:edit-article-set-detail')} ${title}`}
                        routes={breadsCrumb}
                        onBack={() => router.back()}
                    />
                }
                editSteps={[
                    [
                        {
                            name: 'articleSetId',
                            type: FormDataType.Dropdown,
                            subOptions: articleSet,
                            rules: [{ required: true, message: errorMessageEmptyInput }],
                            disabled: true
                        },
                        {
                            name: 'stockOwnerId',
                            displayName: t('d:stockOwner'),
                            type: FormDataType.Dropdown,
                            subOptions: stockOwnerOptions,
                            rules: [{ required: true, message: errorMessageEmptyInput }],
                            disabled: true
                        },
                        {
                            name: 'articleId',
                            displayName: t('d:article'),
                            type: FormDataType.Dropdown,
                            rules: [{ required: true, message: errorMessageEmptyInput }],
                            subOptions: article
                        },
                        {
                            name: 'quantity',
                            type: FormDataType.Number
                        }
                    ]
                ]}
                routeAfterSuccess={`/article-sets/detail/:id`}
            />
        </>
    );
};

EditArticleSetDetailPage.layout = MainLayout;

export default EditArticleSetDetailPage;
