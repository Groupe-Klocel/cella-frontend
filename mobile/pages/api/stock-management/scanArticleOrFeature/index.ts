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
import { GraphQLResponseType } from '@helpers';

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
        filters: { value: scannedInfo, featureCode_Unique: true }
    };

    const huFeaturesQuery = gql`
        query GetHUCFeatures(
            $filters: HandlingUnitContentFeatureSearchFilters
            $orderBy: [HandlingUnitContentFeatureOrderByCriterion!]
        ) {
            handlingUnitContentFeatures(filters: $filters, orderBy: $orderBy) {
                count
                results {
                    id
                    featureCodeId
                    featureCode {
                        id
                        name
                        unique
                    }
                    value
                    handlingUnitContentId
                    handlingUnitContent {
                        id
                        articleId
                        quantity
                        stockStatus
                        stockStatusText
                        reservation
                        stockOwnerId
                        stockOwner {
                            id
                            name
                        }
                        article {
                            id
                            name
                            description
                            genericArticleComment
                            stockOwnerId
                            stockOwner {
                                id
                                name
                            }
                            baseUnitWeight
                        }
                        handlingUnitId
                        handlingUnit {
                            id
                            name
                            barcode
                            status
                            statusText
                            type
                            typeText
                            category
                            categoryText
                            locationId
                            location {
                                id
                                name
                            }
                            stockOwnerId
                            stockOwner {
                                id
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
                        id
                        name
                        description
                        genericArticleComment
                        stockOwnerId
                        stockOwner {
                            id
                            name
                        }
                        baseUnitWeight
                    }
                    barcodeId
                    barcode {
                        id
                        name
                    }
                    stockOwnerId
                    stockOwner {
                        id
                        name
                    }
                    articleLuId
                }
            }
        }
    `;

    const HUCFeatureResponse: GraphQLResponseType = await graphqlRequestClient.request(
        huFeaturesQuery,
        hucFeatureFilter,
        requestHeader
    );

    let response;
    if (HUCFeatureResponse && HUCFeatureResponse.handlingUnitContentFeatures.count === 1) {
        const extractHUCFResponse = HUCFeatureResponse.handlingUnitContentFeatures?.results[0];
        const { articleId, article, handlingUnit } = extractHUCFResponse.handlingUnitContent;
        const {
            id,
            featureCodeId,
            featureCode,
            handlingUnitContentId,
            handlingUnitContent,
            value
        } = extractHUCFResponse;
        response = {
            resType: 'serialNumber',
            article: {
                articleId,
                description: article.description,
                genericArticleComment: article.genericArticleComment,
                name: article.name,
                stockOwnerId: article?.stockOwnerId,
                stockOwner: article?.stockOwner
            },
            handlingUnit,
            handlingUnitContentFeature: {
                id,
                featureCodeId,
                featureCode,
                handlingUnitContentId,
                handlingUnitContent,
                value
            }
        };
    } else {
        const articleLuBarcodeResponse: GraphQLResponseType = await graphqlRequestClient.request(
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
