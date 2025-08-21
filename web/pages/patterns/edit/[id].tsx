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
import { AppHead, HeaderContent, ContentSpin } from '@components';
import { META_DEFAULTS } from '@helpers';
import { PatternModelV2 as model } from 'models/PatternModelV2';
import { EditItemComponent } from 'modules/Crud/EditItemComponentV2';
import { patternsRoutes } from 'modules/Patterns/Static/patternsRoutes';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useRouter } from 'next/router';
import { FC, useState } from 'react';
import MainLayout from '../../../components/layouts/MainLayout';

type PageComponent = FC & { layout: typeof MainLayout };

const EditPatternPage: PageComponent = () => {
    const router = useRouter();
    const { t } = useTranslation('actions');
    const { id } = router.query;
    const [data, setData] = useState<any>();

    const breadsCrumb = [
        ...patternsRoutes,
        {
            breadcrumbName: `${data?.name}`
        }
    ];

    return (
        <>
            <AppHead title={`${t('common:pattern')} ${data?.name}`} />
            <EditItemComponent
                id={id!}
                dataModel={model}
                setData={setData}
                headerComponent={
                    data ? (
                        <HeaderContent
                            title={`${t('common:pattern')} ${data?.name}`}
                            routes={breadsCrumb}
                            onBack={() => router.back()}
                        />
                    ) : (
                        <ContentSpin />
                    )
                }
                routeAfterSuccess={`/patterns/:id`}
                routeOnCancel={`/patterns/`}
            />
        </>
    );
};

EditPatternPage.layout = MainLayout;

export default EditPatternPage;
