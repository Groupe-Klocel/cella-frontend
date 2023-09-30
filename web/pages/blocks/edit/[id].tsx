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
import { AppHead, ContentSpin, HeaderContent } from '@components';
import { useRouter } from 'next/router';
import { FC, useEffect, useState } from 'react';
import MainLayout from '../../../components/layouts/MainLayout';
import { EditItemComponent } from 'modules/Crud/EditItemComponentV2';
import useTranslation from 'next-translate/useTranslation';
import { META_DEFAULTS, useBuildings } from '@helpers';
import { FormDataType, FormOptionType } from 'models/Models';
import { useListParametersForAScopeQuery } from 'generated/graphql';
import { blocksRoutes } from 'modules/Blocks/Static/blocksRoutes';
import { BlockModelV2 } from 'models/BlockModelV2';
import { useAuth } from 'context/AuthContext';

type PageComponent = FC & { layout: typeof MainLayout };

const EditBlockPage: PageComponent = () => {
    const { t } = useTranslation();

    const router = useRouter();
    const [data, setData] = useState<any>();
    const { id } = router.query;

    const breadsCrumb = [
        ...blocksRoutes,
        {
            breadcrumbName: `${data?.name}`
        }
    ];

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <EditItemComponent
                id={id!}
                dataModel={BlockModelV2}
                setData={setData}
                headerComponent={
                    data ? (
                        <HeaderContent
                            title={`${t('common:block')} ${data?.name}`}
                            routes={breadsCrumb}
                            onBack={() => router.push(`/blocks/${id}`)}
                        />
                    ) : (
                        <ContentSpin />
                    )
                }
                routeAfterSuccess={`/blocks/${id}`}
                routeOnCancel={`/blocks/${id}`}
            />
        </>
    );
};

EditBlockPage.layout = MainLayout;

export default EditBlockPage;
