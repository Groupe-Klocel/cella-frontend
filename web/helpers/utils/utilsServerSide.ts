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
import { GraphQLClient } from 'graphql-request';
import { gql } from 'graphql-request';

export const fetchInitialData = async (context: any, model: any) => {
    const { id } = context.params as { id: string };
    const cookie = context.req.headers.cookie || '';
    const locale = context.locale || 'en';
    const token =
        cookie
            .split(';')
            .find((c: String) => c.trim().startsWith('token='))
            ?.split('=')[1] || '';
    const requestHeader = {
        authorization: `Bearer ${token}`
    };

    try {
        const graphqlRequestClient = new GraphQLClient(
            process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT as string,
            {
                headers: requestHeader
            }
        );

        const detailFields = Object.keys(model.fieldsInfo).filter(
            (key) => model.fieldsInfo[key].isDetailRequested
        );

        const query = gql`
      query Detail($id: String!, $language: String = "en") {
        ${model.endpoints.detail}(id: $id, language: $language) {
          ${detailFields.join('\n')}
        }
      }
    `;

        const data = await graphqlRequestClient.request<Record<string, any>>(query, {
            id,
            language: locale === 'en-US' ? 'en' : locale
        });

        const initialData = data[model.endpoints.detail];

        return {
            initialData,
            id,
            model
        };
    } catch (error) {
        return {
            error: true,
            errorMessage: 'Error fetching data' + error,
            id,
            model
        };
    }
};
