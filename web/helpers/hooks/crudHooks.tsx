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
import { useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { isString } from 'lodash';
import moment from 'moment';
import {
    isStringDateTime,
    setUTCDateTime,
    isStringDate,
    setUTCDate,
    showError
} from 'helpers/utils/utils';
import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';

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
    defaultModelSort?: any
) => {
    const { graphqlRequestClient } = useAuth();
    const { t } = useTranslation();

    const sortByDate = {
        field: 'created',
        ascending: false
    };

    const defaultSort = defaultModelSort ? defaultModelSort : sortByDate;

    const query = gql`
        query CustomListQuery(
            $filters: ${resolverName}SearchFilters
            $orderBy: [${resolverName}OrderByCriterion!]
            $page: Int!
            $itemsPerPage: Int!
            $language: String = "en"
        ) {
            ${queryName}(
                filters: $filters
                orderBy: $orderBy
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
        let newSort: any;

        if (sort === null) {
            newSort = defaultSort;
        } else if (sort != null) {
            newSort = sort;
            setIsLoading(false);
        }

        const variables = {
            filters: search,
            orderBy: newSort,
            page: page,
            itemsPerPage: itemsPerPage,
            language: language
        };

        graphqlRequestClient
            .request(query, variables)
            .then((result: any) => {
                Object.keys(result).forEach((element) => {
                    Object.keys(result[element]).forEach((key) => {
                        if (
                            isString(result[element][key]) &&
                            isStringDateTime(result[element][key])
                        ) {
                            result[element][key] = setUTCDateTime(result[element][key]);
                        }
                        if (isString(result[element][key]) && isStringDate(result[element][key])) {
                            result[element][key] = setUTCDate(result[element][key]);
                        }
                    });
                });

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

    const query = gql`mutation ${queryName}($input: Create${resolverName}Input!) {
        ${queryName}(input: $input) {
            ${fields.join('\n')}
        }
      }`;

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
const useDelete = (queryName: string) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();

    const query = gql`mutation ${queryName}($id: String!) {
        ${queryName}(id: $id)
      }`;

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [result, setResult] = useState<any>({ data: null, success: false });

    const mutate = (id: string) => {
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
