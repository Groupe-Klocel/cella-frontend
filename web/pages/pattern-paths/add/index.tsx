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
import { FC } from 'react';
import MainLayout from '../../../components/layouts/MainLayout';
import { PatternPathModelV2 } from 'models/PatternPathModelV2';
import { AddItemComponent } from 'modules/Crud/AddItemComponentV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { addPatternPathRoutes } from 'modules/PatternPaths/Static/patternPathRoutes';
import { META_DEFAULTS, usePatternPaths } from '@helpers';
import configs from '../../../../common/configs.json';

type PageComponent = FC & { layout: typeof MainLayout };

const AddPatternPathPage: PageComponent = () => {
    const { t } = useTranslation();
    const router = useRouter();

    const patternPaths = usePatternPaths(
        { status: configs.PATTERN_PATH_STATUS_IN_PROGRESS },
        1,
        100,
        null
    );
    let maxOrder = 0;
    if (patternPaths?.data?.patternPaths && patternPaths?.data?.patternPaths?.count > 0)
        // Use reduce to find the maximum order value
        maxOrder = patternPaths.data?.patternPaths?.results?.reduce((max: any, obj: any) => {
            const order = obj.order;

            // Check if the order is a valid number and greater than the current max
            if (typeof order === 'number' && !isNaN(order) && order > max) {
                return order;
            }

            return max;
        }, -Infinity); // Start with negative infinity to handle undefined or non-numeric values
    maxOrder++;

    const defaultValues = { order: maxOrder, status: configs.PATTERN_PATH_STATUS_IN_PROGRESS };

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <AddItemComponent
                dataModel={PatternPathModelV2}
                headerComponent={
                    <HeaderContent
                        title={t('actions:add-pattern-path')}
                        routes={addPatternPathRoutes}
                        onBack={() => router.push(`/pattern-paths`)}
                    />
                }
                extraData={
                    defaultValues || Object.keys(defaultValues).length !== 0
                        ? defaultValues
                        : undefined
                }
                routeAfterSuccess={`/pattern-paths/:id`}
            />
        </>
    );
};

AddPatternPathPage.layout = MainLayout;

export default AddPatternPathPage;
