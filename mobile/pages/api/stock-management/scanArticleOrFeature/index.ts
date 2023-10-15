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
import { gql, GraphQLClient } from 'graphql-request';
import type { NextApiRequest, NextApiResponse } from 'next';
import configs from '../../../../../common/configs.json';
import parameters from '../../../../../common/parameters.json';
import { HandlingUnitContentFeatureFieldName } from 'generated/graphql';

const parseCookie = (str: string) =>
    str
        .split(';')
        .map((v) => v.split('='))
        .reduce((acc: any, v) => {
            acc[decodeURIComponent(v[0].trim())] = decodeURIComponent(v[1].trim());
            return acc;
        }, {});

export default async (req: NextApiRequest, res: NextApiResponse) => {
    const cookie = parseCookie(req.headers.cookie ?? '');
    const token = cookie['token'];

    const requestHeader = {
        authorization: `Bearer ${token}`
    };

    const graphqlRequestClient = new GraphQLClient(
        process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT as string,
        {
            headers: requestHeader
        }
    );

    const { scannedInfo } = req.body;

    const hucFeatureFilter = {
        filters: { value: scannedInfo }
    };

    const huFeaturesQuery = gql`
        query GetHUCFeatures(
            $filters: HandlingUnitContentFeatureSearchFilters
            $orderBy: [HandlingUnitContentFeatureOrderByCriterion!]
        ) {
            handlingUnitContentFeatures(filters: $filters, orderBy: $orderBy) {
                count
                results {
                    featureCode {
                        name
                        unique
                    }
                    value
                    handlingUnitContent {
                        articleId
                        article {
                            name
                            description
                            stockOwnerId
                            stockOwner {
                                name
                            }
                        }
                    }
                }
            }
        }
    `;

    const articleLuBarcodeFilter = {
        filters: { barcode_Name: scannedInfo }
    };

    const articleLuBarcodesQuery = gql`
        query GetArticleLuBarcodes(
            $filters: ArticleLuBarcodeSearchFilters
            $orderBy: [ArticleLuBarcodeOrderByCriterion!]
        ) {
            articleLuBarcodes(filters: $filters, orderBy: $orderBy) {
                count
                itemsPerPage
                totalPages
                results {
                    id
                    articleId
                    article {
                        name
                        description
                    }
                    barcodeId
                    barcode {
                        name
                    }
                    stockOwnerId
                    stockOwner {
                        name
                    }
                    articleLuId
                }
            }
        }
    `;

    const HUCFeatureResponse = await graphqlRequestClient.request(
        huFeaturesQuery,
        hucFeatureFilter,
        requestHeader
    );

    let response;
    if (HUCFeatureResponse && HUCFeatureResponse.handlingUnitContentFeatures.count === 1) {
        const extractHUCFResponse = HUCFeatureResponse.handlingUnitContentFeatures?.results[0];
        const { articleId, article } = extractHUCFResponse.handlingUnitContent;
        const { featureCode, value } = extractHUCFResponse;
        response = {
            resType: 'serialNumber',
            article: {
                articleId,
                article: { description: article.description, name: article.name },
                stockOwnerId: article?.stockOwnerId,
                stockOwner: article?.stockOwner
            },
            handlingUnitContentFeature: { featureCode, value }
        };
    } else {
        const articleLuBarcodeResponse = await graphqlRequestClient.request(
            articleLuBarcodesQuery,
            articleLuBarcodeFilter,
            requestHeader
        );

        if (articleLuBarcodeResponse && articleLuBarcodeResponse.articleLuBarcodes.count !== 0) {
            const extractALUBResponse = articleLuBarcodeResponse.articleLuBarcodes?.results;
            response = {
                resType: 'barcode',
                articleLuBarcodes: extractALUBResponse
            };
        } else {
            res.status(500).json({
                error: {
                    is_error: true,
                    code: 'FAPI_000001',
                    message: 'element not found'
                }
            });
        }
    }

    if (response) {
        res.status(200).json({ response: response });
    }
};
