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
        disconnectUrl?: string | null;
    }

    interface JWT {
        jwtToken?: string;
    }
}

type WarehouseSsoConfiguration = {
    type?: string | null;
    authUrl?: string | null;
    clientId?: string | null;
    clientSecret?: string | null;
    redirectUri?: string | null;
    tokenUrl?: string | null;
    disconnectUrl?: string | null;
    scope?: string | null;
};

const SSO_CONFIGURATION_QUERY = gql`
    query ($warehouseId: ID!, $envSecret: String!) {
        warehouseSsoConfiguration(warehouseId: $warehouseId, secret: $envSecret) {
            type
            authUrl
            clientId
            clientSecret
            redirectUri
            tokenUrl
            disconnectUrl
            scope
        }
    }
`;

function isSsoConfigured(
    config: WarehouseSsoConfiguration | null
): config is WarehouseSsoConfiguration & {
    type: string;
    authUrl: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    tokenUrl: string;
    scope: string;
} {
    return !!(
        config &&
        config.type &&
        config.authUrl &&
        config.clientId &&
        config.clientSecret &&
        config.redirectUri &&
        config.tokenUrl &&
        config.scope
    );
}

// get sso configuration from the warehouse
async function getWarehouseSsoConfiguration(): Promise<WarehouseSsoConfiguration | null> {
    if (!process.env.NEXT_PUBLIC_SSO_SECRET) {
        return null;
    }
    try {
        const graphqlRequestClient = new GraphQLClient(
            process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT as string
        );
        const result = await graphqlRequestClient.request<{
            warehouseSsoConfiguration: WarehouseSsoConfiguration;
        }>(SSO_CONFIGURATION_QUERY, {
            warehouseId: process.env.NEXT_PUBLIC_WAREHOUSE_ID,
            envSecret: process.env.NEXT_PUBLIC_SSO_SECRET
        });
        return result.warehouseSsoConfiguration ?? null;
    } catch (error) {
        console.error('Error fetching SSO configuration:', error);
        return null;
    }
}

// next-auth provider configuration
export default async function auth(req: NextApiRequest, res: NextApiResponse) {
    const ssoConfiguration = await getWarehouseSsoConfiguration();
    if (!isSsoConfigured(ssoConfiguration)) {
        return res.status(200).json({});
    }

    return NextAuth(req, res, {
        providers: [
            {
                id: 'oidc',
                name: 'oidc',
                type: 'oauth',
                // Despite the name, `redirectUri` here holds the IdP's OIDC discovery base
                // URL, not our app's own callback URL — confirmed working in staging. Do not
                // "fix" this without re-verifying against a real warehouse first.
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
                // getProviders() (client-safe, no secrets) tells the login page whether to show
                // the SSO button; disconnectUrl rides along on the session the same way, since
                // it's equally harmless to expose and AuthContext already reads useSession().
                session.disconnectUrl = ssoConfiguration.disconnectUrl ?? null;
                return session;
            }
        }
    });
}
