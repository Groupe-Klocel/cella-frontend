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

import { cartographyRoutes } from 'modules/Buildings/Static/buildingsRoutes';

export const patternsRoutes: any = [
    ...cartographyRoutes,
    {
        path: '/patterns',
        breadcrumbName: 'menu:patterns'
    }
];

export const addPatternRoutes = [
    ...patternsRoutes,
    {
        path: '/add-pattern',
        breadcrumbName: 'actions:add-pattern'
    }
];

export const setsRoutes = [
    ...patternsRoutes,
    {
        path: '/sets',
        breadcrumbName: 'menu:sets'
    }
];

export const addPatternSetRoutes = [
    ...setsRoutes,
    {
        path: '/add-pattern-set',
        breadcrumbName: 'menu:add-article-set'
    }
];
