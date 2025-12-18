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
import NextAuth from 'next-auth';
import { GraphQLClient, gql } from 'graphql-request';
import { NextApiRequest, NextApiResponse } from 'next';

declare module 'next-auth' {
    interface Session {
        jwtToken?: string;
    }

    interface JWT {
        jwtToken?: string;
    }
}

// get sso configuration from the warehouse
const getWarehouseSsoConfiguration = async () => {
    const graphqlRequestClient = new GraphQLClient(
        process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT as string
    );

    const query = gql`
        query ($warehouseId: ID!, $envSecret: String!) {
            warehouseSsoConfiguration(warehouseId: $warehouseId, secret: $envSecret) {
                type
                authUrl
                clientId
                clientSecret
                redirectUri
                tokenUrl
                scope
            }
        }
    `;

    const variables = {
        warehouseId: process.env.NEXT_PUBLIC_WAREHOUSE_ID,
        envSecret: process.env.NEXT_PUBLIC_SSO_SECRET
    };

    let result: {
        warehouseSsoConfiguration: {
            type: string;
            authUrl: string;
            clientId: string;
            clientSecret: string;
            redirectUri: string;
            tokenUrl: string;
            scope: string;
        };
    };

    try {
        result = await graphqlRequestClient.request<{
            warehouseSsoConfiguration: {
                type: string;
                authUrl: string;
                clientId: string;
                clientSecret: string;
                redirectUri: string;
                tokenUrl: string;
                scope: string;
            };
        }>(query, variables);
        return result.warehouseSsoConfiguration;
    } catch (error) {
        console.error('Error fetching SSO configuration:', error);
        return null;
    }
};

// next-auth provider configuration
export default async function auth(req: NextApiRequest, res: NextApiResponse) {
    const ssoConfiguration = await getWarehouseSsoConfiguration();
    if (!ssoConfiguration) {
        console.log('No SSO configuration found for the warehouse');
        return res.status(204).end();
    } else {
        return NextAuth(req, res, {
            providers: [
                {
                    id: 'oidc',
                    name: 'oidc',
                    type: 'oauth',
                    wellKnown: ssoConfiguration.redirectUri,
                    authorization: {
                        url: ssoConfiguration.authUrl,
                        params: {
                            response_type: 'code',
                            scope: ssoConfiguration.scope,
                            prompt: 'select_account'
                        }
                    },
                    token: ssoConfiguration.tokenUrl,
                    clientId: ssoConfiguration.clientId,
                    clientSecret: ssoConfiguration.clientSecret,
                    profile(profile) {
                        return {
                            id: profile.sub || profile.id,
                            name: profile.name,
                            email: profile.email,
                            image: profile.picture
                        };
                    }
                }
            ],
            secret: process.env.NEXTAUTH_SECRET,
            callbacks: {
                async jwt({ token, account }) {
                    if (account && account.id_token) {
                        token.jwtToken = account.id_token as string;
                    }
                    return token;
                },
                async session({ session, token }) {
                    session.jwtToken = token.jwtToken as string;
                    return session;
                }
            }
        });
    }
}
