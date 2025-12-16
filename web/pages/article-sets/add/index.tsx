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
import { AppHead, HeaderContent, WrapperForm } from '@components';
import { useRouter } from 'next/router';
import { FC, useEffect, useState } from 'react';
import MainLayout from '../../../components/layouts/MainLayout';
import { AddEditItemComponent } from 'modules/Crud/AddEditItemComponentV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { META_DEFAULTS, useArticleIds, useStockOwnerIds } from '@helpers';
import { FormDataType, FormOptionType } from 'models/Models';
import { ArticleSetModelV2 } from '@helpers';
import { addSetRoutes } from 'modules/ArticleSets/Static/articleSetRoutes';
import configs from '../../../../common/configs.json';

type PageComponent = FC & { layout: typeof MainLayout };

const AddArticleSetsPage: PageComponent = () => {
    const { t } = useTranslation();
    const errorMessageEmptyInput = t('messages:error-message-empty-input');
    const [articlesOptions, setArticlesOptions] = useState<Array<FormOptionType>>();
    const stockOwnerData = useStockOwnerIds(
        { status: configs.STOCK_OWNER_STATUS_IN_PROGRESS },
        1,
        100,
        null
    );
    const [sidOptions, setSIdOptions] = useState<Array<FormOptionType>>([]);
    const [articleId, setArticleId] = useState<string>();
    const [articleName, setArticleName] = useState<string>('');
    const ArticleData = useArticleIds(
        { status: configs.ARTICLE_STATUS_IN_PROGRESS, name: `${articleName}%` },
        1,
        100,
        null
    );

    const router = useRouter();

    useEffect(() => {
        if (stockOwnerData.data) {
            const newIdOpts: Array<FormOptionType> = [];
            stockOwnerData.data.stockOwners?.results.forEach(({ id, name }) => {
                newIdOpts.push({ text: name!, key: id! });
            });
            setSIdOptions(newIdOpts);
        }
    }, [stockOwnerData.data]);

    useEffect(() => {
        if (ArticleData.data) {
            const newArticle: Array<FormOptionType> = [];
            ArticleData.data.articles?.results.forEach(({ id, name }) => {
                newArticle.push({ text: name!, key: id! });
            });
            setArticlesOptions(newArticle);
        }
    }, [articleName, ArticleData.data]);

    return (
        <>
            <AppHead title={t('actions:add-article-set')} />
            <AddEditItemComponent
                dataModel={ArticleSetModelV2}
                headerComponent={
                    <HeaderContent
                        title={t('actions:add-article-set')}
                        routes={addSetRoutes}
                        onBack={() => router.push(`/article-sets`)}
                    />
                }
                routeAfterSuccess={`/article-sets/:id`}
            />
        </>
    );
};

AddArticleSetsPage.layout = MainLayout;

export default AddArticleSetsPage;
