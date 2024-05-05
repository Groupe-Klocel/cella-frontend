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
import { FC, useState } from 'react';
import MainLayout from '../../../../../components/layouts/MainLayout';
import { ThirdPartyAddressContactModelV2 as model } from 'models/ThirdPartyAddressContactModelV2';
import { EditItemComponent } from 'modules/Crud/EditItemComponentV2';
import useTranslation from 'next-translate/useTranslation';
import { thirdPartiesRoutes as itemRoutes } from 'modules/ThirdParties/Static/thirdPartiesRoutes';
import { META_DEFAULTS } from '@helpers';

type PageComponent = FC & { layout: typeof MainLayout };

const EditThirdPartyAddressContactPage: PageComponent = () => {
    const { t } = useTranslation();

    const router = useRouter();
    const [data, setData] = useState<any>();
    const { id, thirdPartyId, thirdPartyName } = router.query;

    const grandParentBreadcrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${thirdPartyName}`,
            path: '/third-parties/' + thirdPartyId
        }
    ];
    const parentBreadcrumb = [
        ...grandParentBreadcrumb,
        {
            breadcrumbName: `${
                data?.thirdPartyAddress_entityName !== null
                    ? data?.thirdPartyAddress_entityName
                    : data?.thirdPartyAddressId
            }`,
            path: '/third-parties/address/' + data?.thirdPartyAddressId
        }
    ];
    const breadcrumb = [
        ...parentBreadcrumb,
        {
            breadcrumbName: `${data?.contactName !== null ? data?.contactName : data?.id}`
        }
    ];

    const title = `${thirdPartyName} / ${
        data?.thirdPartyAddress_entityName !== null
            ? data?.thirdPartyAddress_entityName
            : data?.thirdPartyAddressId
    }  / ${data?.contactName !== null ? data?.contactName : data?.id}`;
    // const title =
    //     data?.thirdPartyAddress_thirdParty_name +
    //     ' / ' +
    //     data?.thirdPartyAddress_entityName +
    //     ' / ' +
    //     data?.contactName;
    const pageTitle = `${t('common:third-party-address-contact')} ${title}`;

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
                        onBack={() => router.push(`/third-parties/address/contact/${id}`)}
                    />
                }
                routeAfterSuccess={`/third-parties/address/contact/:id`}
            />
        </>
    );
};

EditThirdPartyAddressContactPage.layout = MainLayout;

export default EditThirdPartyAddressContactPage;
