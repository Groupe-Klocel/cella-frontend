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
import MainLayout from 'components/layouts/MainLayout';
import { FC } from 'react';
import { META_DEFAULTS } from '@helpers';
import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';
import { AddItemComponent } from 'modules/Crud/AddItemComponentV2';
import { addPatternRoutes } from 'modules/Patterns/Static/patternsRoutes';
import { PatternModelV2 as model } from 'models/PatternModelV2';
import configs from '../../../../common/configs.json';

type PageComponent = FC & { layout: typeof MainLayout };

const AddPatternPage: PageComponent = () => {
    const router = useRouter();
    const { t } = useTranslation('actions');

    //enter between {} the default values for the form (for instance status "In progress"))
    const defaultValues = { status: configs.PATTERN_STATUS_IN_PROGRESS };

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <AddItemComponent
                headerComponent={
                    <HeaderContent
                        title={t('add2', { name: t('common:pattern') })}
                        routes={addPatternRoutes}
                        onBack={() => router.push('/patterns/')}
                    />
                }
                dataModel={model}
                routeAfterSuccess={`/patterns/:id`}
                routeOnCancel={`/patterns`}
                extraData={
                    defaultValues || Object.keys(defaultValues).length !== 0
                        ? defaultValues
                        : undefined
                }
            />
        </>
    );
};

AddPatternPage.layout = MainLayout;

export default AddPatternPage;
