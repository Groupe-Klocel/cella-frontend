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
import { gql } from 'graphql-request';
import { useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { isString } from 'lodash';
import {
    isStringDateTime,
    setUTCDateTime,
    isStringDate,
    setUTCDate,
    showError
} from 'helpers/utils/utils';
import { useTranslationWithFallback as useTranslation } from '@helpers';

/**
 * Getting list of items from CRUD API.
 * @param resolverName resolverName to query.
 * @param queryName endpoint of list query
 * @param fields list of fields to fetch
 * @param search search filter dictionary if you need filtering
 * @param page page number to query
 * @param itemsPerPage number of items to request in each page
 * @param sort sorting information dictionary {field:string,ascending:boolean}
 * @returns { data, isLoading, reload } where isLoading and result are state variable and reload is method to call for reloading list.
 */
const useList = (
    resolverName: string,
    queryName: string,
    fields: Array<string>,
    search: any,
    page: number,
    itemsPerPage: number,
    sort: any,
    language?: string,
    defaultModelSort?: any,
    advancedFilters?: any,
    functions?: any
) => {
    const { graphqlRequestClient } = useAuth();
    const { t } = useTranslation();

    const query = gql`
        query CustomListQuery(
            $filters: ${resolverName}SearchFilters
            ${advancedFilters ? `$advancedFilters: [${resolverName}AdvancedSearchFilters!]` : ''}
            $orderBy: [${resolverName}OrderByCriterion!]
            $functions: [JSON!]
            $page: Int!
            $itemsPerPage: Int!
            $language: String = "en"
        ) {
            ${queryName}(
                filters: $filters
                ${advancedFilters ? 'advancedFilters: $advancedFilters' : ''}
                orderBy: $orderBy
                functions: $functions
                page: $page
                itemsPerPage: $itemsPerPage
                language: $language
            ) {
                count
                itemsPerPage
                totalPages
                results {
                    ${fields.join('\n')}
                }
            }
        }
    `;
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [data, setData] = useState<any>([]);

    const reload = () => {
        setIsLoading(true);

        const variables = {
            filters: search,
            advancedFilters: advancedFilters,
            orderBy: sort,
            functions: functions,
            page: page,
            itemsPerPage: itemsPerPage,
            language: language
        };

        graphqlRequestClient
            .request(query, variables)
            .then((result: any) => {
                console.log('AXC - crudHooks.tsx - .then - result:', result);
                // Object.keys(result).forEach((element) => {
                //     Object.keys(result[element]).forEach((key) => {
                //         if (
                //             isString(result[element][key]) &&
                //             isStringDateTime(result[element][key])
                //         ) {
                //             result[element][key] = setUTCDateTime(result[element][key]);
                //         }
                //         if (isString(result[element][key]) && isStringDate(result[element][key])) {
                //             result[element][key] = setUTCDate(result[element][key]);
                //         }
                //     });
                // });

                setData(result);
                setIsLoading(false);
            })
            .catch((error: any) => {
                if (error.response && error.response.errors[0].extensions) {
                    showError(t(`errors:${error.response.errors[0].extensions.code}`));
                } else {
                    showError(t('messages:error-getting-data'));
                    console.log(error);
                }
                setData(null);
                setIsLoading(false);
            });
    };

    return { data, isLoading, reload };
};

/**
 * Getting item detail from CRUD API.
 * @param id Item id to query.
 * @param queryName endpoint of list query
 * @param fields list of fields to fetch
 * @returns { {isLoading, result, mutate}, reload } where isLoading and result are state variable and mutate is method to call for fetching detail.
 */

const useDetail = (id: string, queryName: string, fields: Array<string>, language?: string) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();

    const query = gql`query ${queryName}($id: String!, $language: String = "en") {
        ${queryName}(id: $id, language: $language) {
            ${fields.join('\n')}
        }
    }`;

    const [detail, setDetail] = useState<any>({ isLoading: true, data: [], error: false });
    const reload = () => {
        const variables = {
            id: id,
            language: language
        };

        graphqlRequestClient
            .request(query, variables)
            .then((result: any) => {
                // Object.keys(result).forEach((element) => {
                //     Object.keys(result[element]).forEach((key) => {
                //         if (isString(result[element][key]) && isStringDateTime(result[element][key])) {
                //             result[element][key] = setUTCDateTime(result[element][key]);
                //         }
                //     });
                // });
                setDetail({ isLoading: false, data: result, error: false });
            })
            .catch((error: any) => {
                if (error.response && error.response.errors[0].extensions) {
                    showError(t(`errors:${error.response.errors[0].extensions.code}`));
                } else {
                    showError(t('messages:error-getting-this-data'));
                    console.log(error);
                }
                setDetail({ isLoading: false, error: true });
            });
    };
    return { detail, reload };
};

/**
 * Getting recordHistory detail from CRUD API.
 * @param sequenceId Item id to query.
 * @param queryName endpoint of list query
 * @param fields list of fields to fetch
 * @returns { {isLoading, result, mutate}, reload } where isLoading and result are state variable and mutate is method to call for fetching detail.
 */

const useRecordHistoryDetail = (
    sequenceId: string,
    queryName: string,
    fields: Array<string>,
    language?: string
) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();

    const query = gql`query ${queryName}($id: Int!, $language: String = "en") {
        ${queryName}(id: $id, language: $language) {
            ${fields.join('\n')}
        }
    }`;

    const [detail, setDetail] = useState<any>({ isLoading: true, data: [], error: false });
    const reload = () => {
        const variables = {
            id: parseInt(sequenceId),
            language: language
        };

        graphqlRequestClient
            .request(query, variables)
            .then((result: any) => {
                // Object.keys(result).forEach((element) => {
                //     Object.keys(result[element]).forEach((key) => {
                //         if (isString(result[element][key]) && isStringDateTime(result[element][key])) {
                //             result[element][key] = setUTCDateTime(result[element][key]);
                //         }
                //     });
                // });
                setDetail({ isLoading: false, data: result, error: false });
            })
            .catch((error: any) => {
                if (error.response && error.response.errors[0].extensions) {
                    showError(t(`errors:${error.response.errors[0].extensions.code}`));
                } else {
                    showError(t('messages:error-getting-this-data'));
                    console.log(error);
                }
                setDetail({ isLoading: false, error: true });
            });
    };
    return { detail, reload };
};

/**
 * Getting statusHistory detail from CRUD API.
 * @param id Item id to query.
 * @param queryName endpoint of list query
 * @param fields list of fields to fetch
 * @returns { {isLoading, result, mutate}, reload } where isLoading and result are state variable and mutate is method to call for fetching detail.
 */

const useItemWithNumericIdDetail = (
    id: string,
    queryName: string,
    fields: Array<string>,
    language?: string
) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();

    const query = gql`query ${queryName}($id: Int!, $language: String = "en") {
        ${queryName}(id: $id, language: $language) {
            ${fields.join('\n')}
        }
    }`;

    const [detail, setDetail] = useState<any>({ isLoading: true, data: [], error: false });
    const reload = () => {
        const variables = {
            id: parseInt(id),
            language: language
        };

        graphqlRequestClient
            .request(query, variables)
            .then((result: any) => {
                // Object.keys(result).forEach((element) => {
                //     Object.keys(result[element]).forEach((key) => {
                //         if (isString(result[element][key]) && isStringDateTime(result[element][key])) {
                //             result[element][key] = setUTCDateTime(result[element][key]);
                //         }
                //     });
                // });
                setDetail({ isLoading: false, data: result, error: false });
            })
            .catch((error: any) => {
                if (error.response && error.response.errors[0].extensions) {
                    showError(t(`errors:${error.response.errors[0].extensions.code}`));
                } else {
                    showError(t('messages:error-getting-this-data'));
                    console.log(error);
                }
                setDetail({ isLoading: false, error: true });
            });
    };
    return { detail, reload };
};

const useCreate = (resolverName: string, queryName: string, fields: Array<string>) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();

    const fieldsWithTransactionId = [...fields, 'lastTransactionId'];

    const query = gql`mutation ${queryName}($input: Create${resolverName}Input!) {
        ${queryName}(input: $input) {
            ${fieldsWithTransactionId.join('\n')}
        }
      }`;

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [result, setResult] = useState<any>({ data: null, success: false });
    console.log('DLA - useCreate - result:', result);

    const mutate = (variables: any) => {
        setIsLoading(true);
        graphqlRequestClient
            .request(query, variables)
            .then((result: any) => {
                setIsLoading(false);
                setResult({ data: result, success: true });
            })
            .catch((error: any) => {
                if (error.response && error.response.errors[0].extensions) {
                    const errorCode = error.response.errors[0].extensions.code;
                    if (
                        error.response.errors[0].extensions.variables &&
                        error.response.errors[0].extensions.variables.table_name
                    ) {
                        const errorTableName =
                            error.response.errors[0].extensions.variables.table_name;
                        showError(
                            t(`errors:${errorCode}`, { tableName: t(`common:${errorTableName}`) })
                        );
                    } else {
                        showError(t(`errors:${errorCode}`));
                    }
                } else {
                    showError(t('messages:error-creating-data'));
                    console.log(error);
                }
                setResult({ data: null, success: false });
                setIsLoading(false);
            });
    };

    return { isLoading, result, mutate };
};

/**
 * Updating item detail using CRUD API.
 * @param resolverName resolverName to query
 * @param queryName endpoint of update query
 * @param fields list of fields to return after update
 * @returns { isLoading, result, mutate } where isLoading and result are state variable and mutate is method to call for updating.
 */
const useUpdate = (resolverName: string, queryName: string, fields: Array<string>) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();

    const query = gql`mutation ${queryName}($id: String!, $input: Update${resolverName}Input!) {
        ${queryName}(id: $id, input: $input) {
            ${fields.join('\n')}
        }
      }`;
    //  "Test"  const [data, setData] = useState<any>({ isLoading: true, data: [], error: false });

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [result, setResult] = useState<any>({ data: null, success: false });

    const mutate = (variables: any) => {
        setIsLoading(true);
        graphqlRequestClient
            .request(query, variables)
            .then((result: any) => {
                setIsLoading(false);
                setResult({ data: result, success: true });
            })
            .catch((error: any) => {
                if (
                    error.response &&
                    error.response.errors &&
                    error.response.errors[0].extensions
                ) {
                    const errorCode = error.response.errors[0].extensions.code;
                    if (
                        error.response.errors[0].extensions.variables &&
                        error.response.errors[0].extensions.variables.table_name
                    ) {
                        const errorTableName =
                            error.response.errors[0].extensions.variables.table_name;
                        showError(
                            t(`errors:${errorCode}`, { tableName: t(`common:${errorTableName}`) })
                        );
                    } else {
                        showError(t(`errors:${errorCode}`));
                    }
                } else {
                    showError(t('messages:error-update-data'));
                    console.log(error);
                }
                setResult({ data: null, success: false });
                setIsLoading(false);
            });
    };

    return { isLoading, result, mutate };
};

/**
 * Exporting items Using CRUD API.
 * @param resolverName resolverName to query
 * @param queryName endpoint of export query
 * @returns { isLoading, result, mutate } where isLoading and result are state variable and mutate is method to call for exporting.
 */
const useExport = () => {
    const { graphqlRequestClient } = useAuth();

    // const query = gql`mutation ${queryName}($format: ExportFormat, $compression: ExportCompression, $separator: String, $orderBy: [${resolverName}OrderByCriterion!], $filters: ${resolverName}ExportFilters) {
    //     ${queryName}(
    //       format: $format
    //       compression: $compression
    //       separator: $separator
    //       orderBy: $orderBy
    //       filters: $filters
    //     ) {
    //       url
    //     }
    //   }`;
    const query = gql`
        mutation exportData(
            $graphqlRequest: String!
            $format: ExportFormat
            $separator: String
            $columnNames: JSON
            $compression: ExportCompression
        ) {
            exportData(
                graphqlRequest: $graphqlRequest
                format: $format
                separator: $separator
                columnNames: $columnNames
                compression: $compression
            ) {
                url
                compression
            }
        }
    `;

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [result, setResult] = useState<any>({ data: null, success: false });

    const mutate = (variables: any) => {
        setIsLoading(true);
        graphqlRequestClient
            .request(query, variables)
            .then((result: any) => {
                setIsLoading(false);
                setResult({ data: result, success: true });
            })
            .catch((error: any) => {
                setResult({ data: null, success: false });
                setIsLoading(false);
            });
    };

    return { isLoading, result, mutate };
};

/**
 * Deleting items Using CRUD API.
 * @param queryName endpoint of delete query
 * @returns { isLoading, result, mutate } where isLoading and result are state variable and mutate is method to call for deleting.
 */
const useDelete = (queryName: string, infoDeleteOrder?: any, useLastTransactionId?: any) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();

    const fetchTransactionId = async () => {
        // Generate a new transaction ID
        const generateTransactionId = gql`
            mutation {
                generateTransactionId
            }
        `;
        const transactionIdResponse = await graphqlRequestClient.request(generateTransactionId);
        const lastTransactionIdWithTid = transactionIdResponse.generateTransactionId;
        const lastTransactionId =
            lastTransactionIdWithTid.split('_')[1] ?? lastTransactionIdWithTid;
        return lastTransactionId;
    };

    let querydelete = gql`mutation ${queryName}($id: String!) {
        ${queryName}(id: $id)
      }`;
    if (useLastTransactionId) {
        querydelete = gql`mutation ${queryName}($id: String!, $transactionId: String!) {
            ${queryName}(id: $id, transactionId: $transactionId)
          }`;
    }

    if (infoDeleteOrder) {
        querydelete = gql`
            mutation executeFunction($id: String!) {
                executeFunction(
                    functionName: "reorder_priority"
                    event: {
                        input: {
                            ids: $id
                            tableName: ${infoDeleteOrder.tableName}
                            operation: "${infoDeleteOrder.operation}"
                            orderingField: "${infoDeleteOrder.orderingField}"
                            parentId: "${infoDeleteOrder.parentId}"
                        }
                    }
                ) {
                    status
                    output
                }
            }
        `;
    }

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [result, setResult] = useState<any>({ data: null, success: false });

    const mutate = async (id: string) => {
        setIsLoading(true);
        const queryVariables: any = { id: id };
        let lastTransationId = null;
        if (useLastTransactionId) {
            lastTransationId = await fetchTransactionId();
            queryVariables.transactionId = lastTransationId;
        }
        graphqlRequestClient
            .request(querydelete, queryVariables)
            .then((result: any) => {
                setIsLoading(false);
                setResult({ data: result, success: true, transactionId: lastTransationId });
            })
            .catch((error: any) => {
                if (error.response && error.response.errors[0].extensions) {
                    const errorCode = error.response.errors[0].extensions.code;
                    if (
                        error.response.errors[0].extensions.variables &&
                        error.response.errors[0].extensions.variables.table_name
                    ) {
                        const errorTableName =
                            error.response.errors[0].extensions.variables.table_name;
                        const associatedTableName =
                            error.response.errors[0].extensions.variables.associated_table_name;
                        showError(
                            t(`errors:${errorCode}`, {
                                tableName: t(`common:${errorTableName}`),
                                associatedTableName: t(`common:${associatedTableName}`)
                            })
                        );
                    } else {
                        showError(t(`errors:${errorCode}`));
                    }
                } else {
                    showError(t('messages:error-deleting-data'));
                    console.log(error);
                }
                setResult({ data: null, success: false });
                setIsLoading(false);
            });
    };

    return { isLoading, result, mutate };
};

/**
 * Deleting items Using CRUD API.
 * @param queryName endpoint of delete query
 * @returns { isLoading, result, mutate } where isLoading and result are state variable and mutate is method to call for deleting.
 */
const useSoftDelete = (queryName: string) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();

    const query = gql`mutation ${queryName}($id: String!) {
        ${queryName}(id: $id)
      }`;

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [result, setResult] = useState<any>({ data: null, success: false });

    const mutate = (id: string) => {
        if (query && queryName) {
            setIsLoading(true);
            graphqlRequestClient
                .request(query, {
                    id: id
                })
                .then((result: any) => {
                    setIsLoading(false);
                    setResult({ data: result, success: true });
                })
                .catch((error: any) => {
                    if (error.response && error.response.errors[0].extensions) {
                        const errorCode = error.response.errors[0].extensions.code;
                        if (
                            error.response.errors[0].extensions.variables &&
                            error.response.errors[0].extensions.variables.table_name
                        ) {
                            const errorTableName =
                                error.response.errors[0].extensions.variables.table_name;
                            const associatedTableName =
                                error.response.errors[0].extensions.variables.associated_table_name;
                            showError(
                                t(`errors:${errorCode}`, {
                                    tableName: t(`common:${errorTableName}`),
                                    associatedTableName: t(`common:${associatedTableName}`)
                                })
                            );
                        } else {
                            showError(t(`errors:${errorCode}`));
                        }
                    } else {
                        showError(t('messages:error-disabling-element'));
                        console.log(error);
                    }
                    setResult({ data: null, success: false });
                    setIsLoading(false);
                });
        }
    };

    return { isLoading, result, mutate };
};

export {
    useList,
    useDetail,
    useCreate,
    useUpdate,
    useExport,
    useDelete,
    useSoftDelete,
    useRecordHistoryDetail,
    useItemWithNumericIdDetail
};
