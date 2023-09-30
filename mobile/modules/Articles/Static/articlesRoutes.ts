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
        breadcrumbName: 'menu:articles'
    }
];

export const featuresRoutes = [
    ...articlesRoutes,
    {
        breadcrumbName: 'menu:features'
    }
];

export const featuresCodesRoutes = [
    ...featuresRoutes,
    {
        path: '/feature-codes',
        breadcrumbName: 'menu:feature-codes'
    }
];

export const addFeatureCodeRoutes = [
    ...featuresCodesRoutes,
    {
        path: '/add-feature-code',
        breadcrumbName: 'menu:add-feature-code'
    }
];

export const featuresTypesRoutes = [
    ...featuresRoutes,
    {
        path: '/feature-codes',
        breadcrumbName: 'menu:feature-codes'
    }
];

export const addFeatureTypeRoutes = [
    ...featuresTypesRoutes,
    {
        path: '/add-feature-type',
        breadcrumbName: 'menu:add-feature-type'
    }
];

export const articlesSubRoutes = [
    ...articlesRoutes,
    {
        path: '/articles',
        breadcrumbName: 'menu:articles'
    }
];

export const addArticleRoutes = [
    ...articlesSubRoutes,
    {
        path: '/add-article',
        breadcrumbName: 'menu:add-article'
    }
];

export const barcodesRoutes = [
    ...articlesRoutes,
    {
        path: '/barcodes',
        breadcrumbName: 'menu:barcodes'
    }
];

export const addBarcodeRoutes = [
    ...barcodesRoutes,
    {
        path: '/add-barcode',
        breadcrumbName: 'menu:add-barcode'
    }
];

export const blacklistedBarcodesRoutes = [
    ...articlesRoutes,
    {
        path: '/blacklisted-barcodes',
        breadcrumbName: 'menu:blacklisted-barcodes'
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
        path: '/add-article-set',
        breadcrumbName: 'menu:add-article-set'
    }
];
