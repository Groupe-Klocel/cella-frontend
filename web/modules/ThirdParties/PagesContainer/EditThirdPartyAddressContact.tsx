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
import { ModeEnum, Table } from 'generated/graphql';
import { useAuth } from 'context/AuthContext';
import { FC, useEffect, useState } from 'react';
import { NextRouter } from 'next/router';
import styled from 'styled-components';
import { HeaderContent } from '@components';
import { getModesFromPermissions, showError } from '@helpers';
import { useAppState } from 'context/AppContext';
import { thirdPartiesRoutes as itemRoutes } from 'modules/ThirdParties/Static/thirdPartiesRoutes';
import { gql } from 'graphql-request';
import { EditThirdPartyAddressContactForm } from '../Forms/EditThirdPartyAddressContactForm';
import { data } from 'autoprefixer';

const StyledPageContent = styled(Layout.Content)`
    margin: 0px 30px 50px 30px;
    padding: 0px 20px;
`;

export interface EditThirdPartyProps {
    id: string | any;
    router: NextRouter;
}

export interface ThirdPartyData {
    id: string | any;
    contactName?: string | any;
    category?: number | any;
    categoryText?: string | any;
    status?: number | any;
    contactCivility?: string | any;
    contactFirstName?: string | any;
    contactLastName?: string | any;
    contactPhone?: string | any;
    contactMobile?: string | any;
    contactEmail?: string | any;
    contactLanguage?: string | any;
    created?: any | any;
    createdBy?: string | any;
    modified?: any | any;
    modifiedBy?: string | any;
    thirdPartyAddressId?: string | any;
    thirdPartyAddress?: {
        __typename?: 'ThirdPartyAddressType';
        entityName?: string | null;
    } | null;
}

const EditThirdPartyAddressContact: FC<EditThirdPartyProps> = ({
    id,
    router
}: EditThirdPartyProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();

    const { thirdPartyId, thirdPartyName } = router.query;

    useEffect(() => {
        const query = gql`
            query getThirdAddressContactById($id: String!) {
                thirdPartyAddressContact(id: $id) {
                    id
                    contactName
                    category
                    categoryText
                    status
                    contactCivility
                    contactFirstName
                    contactLastName
                    contactPhone
                    contactMobile
                    contactEmail
                    contactLanguage
                    created
                    createdBy
                    modified
                    modifiedBy
                    thirdPartyAddressId
                    thirdPartyAddress {
                        entityName
                    }
                }
            }
        `;
        const queryVariables = {
            id: id
        };

        graphqlRequestClient.request(query, queryVariables).then((data: any) => {
            setThirdParty(data?.thirdPartyAddressContact);
        });
    }, []);

    const [thirdParty, setThirdParty] = useState<ThirdPartyData>({ id });

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
                thirdParty.thirdPartyAddress?.entityName !== null
                    ? thirdParty.thirdPartyAddress?.entityName
                    : thirdParty.thirdPartyAddressId
            }`,
            path: '/third-parties/address/' + thirdParty.thirdPartyAddressId
        }
    ];
    const breadcrumb = [
        ...parentBreadcrumb,
        {
            breadcrumbName: `${thirdParty?.contactName !== null ? thirdParty?.contactName : id}`
        }
    ];

    const title = `${thirdPartyName} / ${
        thirdParty.thirdPartyAddress?.entityName !== null
            ? thirdParty.thirdPartyAddress?.entityName
            : thirdParty.thirdPartyAddressId
    }  / ${thirdParty?.contactName !== null ? thirdParty?.contactName : id}`;

    const pageTitle = `${t('common:third-party-address-contact')} ${title}`;

    // useEffect(() => {
    //     if (error) {
    //         showError(t('messages:error-getting-data'));
    //     }
    // }, [error]);

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
                                    details={thirdParty}
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
