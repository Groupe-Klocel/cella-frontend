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
import { FC, useEffect, useState } from 'react';
import MainLayout from '../../../../components/layouts/MainLayout';
import { ThirdPartyAddressModelV2 as model } from 'models/ThirdPartyAddressModelV2';
import { EditItemComponent } from 'modules/Crud/EditItemComponentV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { thirdPartiesRoutes as itemRoutes } from 'modules/ThirdParties/Static/thirdPartiesRoutes';
import { META_DEFAULTS } from '@helpers';
import { FormDataType, FormOptionType } from 'models/Models';

type PageComponent = FC & { layout: typeof MainLayout };

const EditThirdPartyAddressPage: PageComponent = () => {
    const { t } = useTranslation();

    const router = useRouter();
    const [data, setData] = useState<any>();
    const { id } = router.query;

    const parentBreadcrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.thirdParty_name}`,
            path: '/third-parties/' + data?.thirdPartyId
        }
    ];
    const breadcrumb = [
        ...parentBreadcrumb,
        {
            breadcrumbName: `${data?.entityName !== null ? data?.entityName : data?.id}`
        }
    ];

    const title = `${data?.thirdParty_name} / ${
        data?.entityName !== null ? data?.entityName : data?.id
    }`;
    const pageTitle = `${t('common:third-party-address')} ${title}`;

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <EditItemComponent
                id={id!}
                setData={setData}
                dataModel={model}
                headerComponent={
                    <HeaderContent
                        title={`${pageTitle}`}
                        routes={breadcrumb}
                        onBack={() => router.push(`/third-parties/address/${id}`)}
                    />
                }
                routeAfterSuccess={`/third-parties/address/:id`}
                stringCodeScopes={['payment_terms', 'payment_method', 'bank_account']}
            />
        </>
    );
};

EditThirdPartyAddressPage.layout = MainLayout;

export default EditThirdPartyAddressPage;
