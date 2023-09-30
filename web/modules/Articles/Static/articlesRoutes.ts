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
// Breadcrumb Name should be the same as in the translation file
export const articlesRoutes = [
    {
        breadcrumbName: 'menu:configuration'
    },
    {
        breadcrumbName: 'menu:articles',
        path: '/articles'
    }
];
export const articlesSubRoutes = [
    ...articlesRoutes,
    {
        path: '/articles',
        breadcrumbName: 'menu:articles'
    }
];
export const barcodesSubRoutes = [
    ...articlesRoutes,
    {
        path: '/barcodes',
        breadcrumbName: 'menu:barcodes'
    }
];
export const addArticleRoutes = [
    ...articlesRoutes,
    {
        path: '/add-article',
        breadcrumbName: 'actions:add-article'
    }
];
export const setsRoutes = [
    ...articlesRoutes,
    {
        path: '/sets',
        breadcrumbName: 'menu:sets'
    }
];
export const addArticleSetRoutes = [
    ...setsRoutes,
    {
        path: '/add-set',
        breadcrumbName: 'actions:add-set'
    }
];
export const addArticleSetDetailRoutes = [
    ...setsRoutes,
    {
        path: '/add-article-set-detail',
        breadcrumbName: 'actions:add-article-set-detail'
    }
];
