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
import { NotificationModelV2 as model } from 'models/NotificationModelV2';
import { HeaderData } from 'modules/Crud/ListComponentV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC } from 'react';
import { excelImportsRoutes as itemRoutes } from 'modules/ExcelImports/Static/excelImportsRoutes';
import { ExcelImportComponent } from 'modules/ExcelImports/Elements/ExcelImportComponent';
type PageComponent = FC & { layout: typeof MainLayout };

const ExcelImportPages: PageComponent = () => {
    const { t } = useTranslation();

    const headerData: HeaderData = {
        title: t('common:excel-imports'),
        routes: itemRoutes,
        actionsComponent: null
    };

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <ExcelImportComponent headerData={headerData} dataModel={model} />
        </>
    );
};

ExcelImportPages.layout = MainLayout;

export default ExcelImportPages;
