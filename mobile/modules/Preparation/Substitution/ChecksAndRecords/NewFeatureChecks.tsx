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
import { WrapperForm, ContentSpin } from '@components';
import { showError, LsIsSecured } from '@helpers';
import { useAuth } from 'context/AuthContext';
import {
    GetHandlingUnitContentFeaturesQuery,
    useGetHandlingUnitContentFeaturesQuery
} from 'generated/graphql';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';
import parameters from '../../../../../common/parameters.json';
import { gql } from 'graphql-request';

export interface INewFeatureChecksProps {
    dataToCheck: any;
}

// TO BE REVIEWED: THIS IS A COPY COMING FROM CONTENT MOVEMENT

export const NewFeatureChecks = ({ dataToCheck }: INewFeatureChecksProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const storage = LsIsSecured();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [featuresToCheckAgainst, setFeaturesToCheckAgainst] = useState<Array<any>>();
    const [dataFeatures, setDataFeatures] = useState<any>();

    const {
        process,
        stepNumber,
        inputFeatures,
        scannedInfo: { scannedInfo, setScannedInfo },
        trigger: { triggerRender, setTriggerRender },
        setResetForm
    } = dataToCheck;

    const storedObject = JSON.parse(storage.get(process) || '{}');
    // TYPED SAFE ALL

    //ScanFeature-1 : query data
    // const featuresList = useGetHandlingUnitContentFeaturesQuery<
    //     Partial<GetHandlingUnitContentFeaturesQuery>,
    //     Error
    // >(graphqlRequestClient, {
    //     filters: {
    //         handlingUnitContent_HandlingUnit_StockOwnerId: [
    //             inputFeatures.handlingUnitContent.handlingUnit.stockOwnerId
    //         ],
    //         handlingUnitContent_ArticleId: [inputFeatures.handlingUnitContent.articleId],
    //         handlingUnitContent_HandlingUnit_Category: [parameters.HANDLING_UNIT_CATEGORY_STOCK],
    //         featureCode_Name: ['id', 'ID'],
    //         value: scannedInfo
    //     },
    //     orderBy: null,
    //     page: 1,
    //     itemsPerPage: 100
    // });

    // useEffect(() => {
    //     if (featuresList) {
    //         const tmp_features = featuresList?.data?.handlingUnitContentFeatures?.results;
    //         if (tmp_features) {
    //             const tmp_data = tmp_features.filter((e: any) => {
    //                 return e.extraStatus1 !== 458;
    //             });
    //             setFeaturesToCheckAgainst(tmp_data);
    //         }
    //     }
    // }, [featuresList.data]);

    // console.log('FeaturesToCheckAgainst', featuresToCheckAgainst);

    async function getFeatures(scannedInfo: string): Promise<{ [key: string]: any } | undefined> {
        const featuresQuery = gql`
            query handlingUnitContentFeatures($filters: HandlingUnitContentFeatureSearchFilters) {
                handlingUnitContentFeatures(filters: $filters) {
                    count
                    results {
                        id
                        extraStatus1
                        value
                        featureCodeId
                        featureCode {
                            id
                            name
                        }
                        handlingUnitContentId
                        handlingUnitContent {
                            id
                            stockStatus
                            stockStatusText
                            quantity
                            handlingUnitId
                            handlingUnit {
                                id
                                name
                                locationId
                                location {
                                    id
                                    name
                                    category
                                    categoryText
                                }
                                stockOwnerId
                                stockOwner {
                                    id
                                    name
                                }
                                parentHandlingUnitId
                                parentHandlingUnit {
                                    id
                                    name
                                }
                            }
                            articleId
                            article {
                                id
                                name
                                stockOwnerId
                            }
                            handlingUnitContentFeatures {
                                id
                                extraStatus1
                                value
                                featureCodeId
                                featureCode {
                                    name
                                }
                            }
                        }
                    }
                }
            }
        `;

        const featuresVariables = {
            filters: {
                handlingUnitContent_HandlingUnit_StockOwnerId:
                    inputFeatures.handlingUnitContent.handlingUnit.stockOwnerId,
                handlingUnitContent_ArticleId: inputFeatures.handlingUnitContent.articleId,
                handlingUnitContent_HandlingUnit_Category: parameters.HANDLING_UNIT_CATEGORY_STOCK,
                featureCode_Name: ['id', 'ID'],
                value: scannedInfo
            }
        };

        const featuresList = await graphqlRequestClient.request(featuresQuery, featuresVariables);

        return featuresList;
    }

    useEffect(() => {
        async function fetchData() {
            const dataFeatures = await getFeatures(scannedInfo);
            const result = await dataFeatures;
            if (result) setDataFeatures(result);
        }
        fetchData();
    }, [scannedInfo]);

    //ScanArticleOrFeature-2: call and process frontAPIResponse
    useEffect(() => {
        if (scannedInfo) {
            if (
                dataFeatures &&
                dataFeatures.handlingUnitContentFeatures.results.length > 0 &&
                dataFeatures.handlingUnitContentFeatures.results[0].extraStatus1 !== 458
            ) {
                setIsLoading(true);
                // for (let i = 0; i < featuresToCheckAgainst.length; i++) {
                //     if (featuresToCheckAgainst[i].value === scannedInfo) {
                //         found = true;
                //         break;
                //     }
                // }
                // const selectedNewFeature = featuresToCheckAgainst?.find((e: any) => {
                //     return e.value == scannedInfo;
                // });

                const data: { [label: string]: any } = {};
                data['newFeature'] = dataFeatures.handlingUnitContentFeatures.results[0];
                setTriggerRender(!triggerRender);
                storedObject[`step${stepNumber}`] = {
                    ...storedObject[`step${stepNumber}`],
                    data
                };
                setIsLoading(false);
            } else {
                showError(t('messages:unexpected-scanned-item'));
                setResetForm(true);
                setScannedInfo(undefined);
                setIsLoading(false);
            }
        }
        if (
            storedObject[`step${stepNumber}`] &&
            Object.keys(storedObject[`step${stepNumber}`]).length != 0
        ) {
            storage.set(process, JSON.stringify(storedObject));
        }
    }, [dataFeatures]);

    return <WrapperForm>{isLoading ? <ContentSpin /> : <></>}</WrapperForm>;
};
