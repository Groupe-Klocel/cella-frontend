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
import { ContentSpin } from '@components';
import { Alert, Layout } from 'antd';
import useTranslation from 'next-translate/useTranslation';
import {
    GetThirdAddressContactByIdQuery,
    ModeEnum,
    Table,
    useGetThirdAddressContactByIdQuery
} from 'generated/graphql';
import { useAuth } from 'context/AuthContext';
import { FC, useEffect } from 'react';
import { NextRouter } from 'next/router';
import styled from 'styled-components';
import { HeaderContent } from '@components';
import { getModesFromPermissions, showError } from '@helpers';
import { useAppState } from 'context/AppContext';
import { thirdPartiesRoutes as itemRoutes } from 'modules/ThirdParties/Static/thirdPartiesRoutes';
import { EditThirdPartyAddressContactForm } from '../Forms/EditThirdPartyAddressContactForm';

const StyledPageContent = styled(Layout.Content)`
    margin: 0px 30px 50px 30px;
    padding: 0px 20px;
`;

export interface EditThirdPartyProps {
    id: string | any;
    router: NextRouter;
}

const EditThirdPartyAddressContact: FC<EditThirdPartyProps> = ({
    id,
    router
}: EditThirdPartyProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const { thirdPartyId, thirdPartyName } = router.query;

    const { isLoading, data, error } = useGetThirdAddressContactByIdQuery<
        GetThirdAddressContactByIdQuery,
        Error
    >(graphqlRequestClient, {
        id: id
    });

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
                data?.thirdPartyAddressContact?.thirdPartyAddress?.entityName !== null
                    ? data?.thirdPartyAddressContact?.thirdPartyAddress?.entityName
                    : data?.thirdPartyAddressContact?.thirdPartyAddressId
            }`,
            path: '/third-parties/address/' + data?.thirdPartyAddressContact?.thirdPartyAddressId
        }
    ];
    const breadcrumb = [
        ...parentBreadcrumb,
        {
            breadcrumbName: `${data?.thirdPartyAddressContact?.contactName !== null ? data?.thirdPartyAddressContact?.contactName : id}`
        }
    ];

    const title = `${thirdPartyName} / ${
        data?.thirdPartyAddressContact?.thirdPartyAddress?.entityName !== null
            ? data?.thirdPartyAddressContact?.thirdPartyAddress?.entityName
            : data?.thirdPartyAddressContact?.thirdPartyAddressId
    }  / ${data?.thirdPartyAddressContact?.contactName !== null ? data?.thirdPartyAddressContact?.contactName : id}`;

    const pageTitle = `${t('common:third-party-address-contact')} ${title}`;

    useEffect(() => {
        if (error) {
            showError(t('messages:error-getting-data'));
        }
    }, [error]);

    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.Order);

    return (
        <>
            {permissions ? (
                !modes.includes(ModeEnum.Update) ? (
                    <>
                        <Alert
                            message={t('messages:error')}
                            description={t('errors:APP-000200')}
                            type="error"
                            showIcon
                        />
                    </>
                ) : (
                    <>
                        <HeaderContent
                            title={`${pageTitle}`}
                            routes={breadcrumb}
                            onBack={() => router.back()}
                        />
                        <StyledPageContent>
                            {data ? (
                                <EditThirdPartyAddressContactForm
                                    thirdPartyAdressContactId={id}
                                    details={data?.thirdPartyAddressContact}
                                />
                            ) : (
                                <ContentSpin />
                            )}
                        </StyledPageContent>
                    </>
                )
            ) : (
                <ContentSpin />
            )}
        </>
    );
};

EditThirdPartyAddressContact.displayName = 'EditThirdPartyAddressContact';

export { EditThirdPartyAddressContact };
