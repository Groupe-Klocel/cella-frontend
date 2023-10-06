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
import { AppHead } from '@components';
import { META_DEFAULTS } from '@helpers';
import MainLayout from 'components/layouts/MainLayout';
import { AddArticleSetDetail } from 'modules/ArticleSets/PagesContainer/AddArticleSetDetail';
import { useRouter } from 'next/router';
import { FC } from 'react';

type PageComponent = FC & { layout: typeof MainLayout };

const AddArticleSetDetailPage: PageComponent = () => {
    const router = useRouter();

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <AddArticleSetDetail
                articleSetId={router.query.articleSetId}
                articleSetName={router.query.articleSetName}
                articleId={router.query.articleId}
                articleName={router.query.articleName}
                stockOwnerId={router.query?.stockOwnerId}
                stockOwnerName={router.query?.stockOwnerName}
            />
        </>
    );
};

AddArticleSetDetailPage.layout = MainLayout;

export default AddArticleSetDetailPage;
