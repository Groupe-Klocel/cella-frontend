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
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { AddItemComponent } from 'modules/Crud/AddItemComponentV2';
import { addPatternRoutes } from 'modules/Patterns/Static/patternsRoutes';
import { PatternPathLink_PatternModelV2 as model } from 'models/PatternPathLink_PatternModelV2';

type PageComponent = FC & { layout: typeof MainLayout };

const AddPatternPathPage: PageComponent = () => {
    const router = useRouter();
    const { t } = useTranslation('actions');

    //enter between {} the default values for the form (for instance status "In progress"))
    const { patternId, prevMaxOrder } = router.query;

    const defaultValues = {
        patternId: router.query.patternId,
        order: prevMaxOrder ? parseInt(prevMaxOrder as string) + 1 : 1
    };

    return (
        <>
            <AppHead title={t('associate', { name: t('common:pattern-path') })} />
            <AddItemComponent
                headerComponent={
                    <HeaderContent
                        title={t('associate', { name: t('common:pattern-path') })}
                        routes={addPatternRoutes}
                        onBack={() => router.push('/patterns/')}
                    />
                }
                dataModel={model}
                routeAfterSuccess={`/patterns/${patternId}`}
                routeOnCancel={`/patterns/${patternId}`}
                extraData={
                    defaultValues || Object.keys(defaultValues).length !== 0
                        ? defaultValues
                        : undefined
                }
            />
        </>
    );
};

AddPatternPathPage.layout = MainLayout;

export default AddPatternPathPage;
