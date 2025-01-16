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
import { Alert, Layout } from 'antd';

import { FC, useEffect, useState } from 'react';
import styled from 'styled-components';
import { AddCarrierForm } from '../Forms/AddCarrierForm';
import { FilterFieldType, FormDataType, ModelType } from 'models/ModelsV2';
import {
    getModesFromPermissions,
    isNumeric,
    pascalToSnakeUpper,
    removeDuplicatesAndSort,
    useConfigs,
    useParams,
    checkValueInKey,
    pluralize
} from '@helpers';
import { ModeEnum } from 'generated/graphql';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useAppState } from 'context/AppContext';
import { ContentSpin } from '@components';
import { useRouter } from 'next/router';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';
import existingConfigs from '../../../../common/configs.json';

const StyledPageContent = styled(Layout.Content)`
    margin: 0px 30px 50px 30px;
    padding: 0px 20px;
`;

export interface IAddCarrierProps {
    headerComponent: any;
    dataModel: ModelType;
    addSteps?: Array<Array<FilterFieldType>>;
    routeAfterSuccess: string;
    extraData?: any;
    routeOnCancel?: string;
    stringCodeScopes?: Array<string>;
}

const AddCarrierComponent: FC<IAddCarrierProps> = (props: IAddCarrierProps) => {
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const router = useRouter();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);
    const errorMessageEmptyInput = t('messages:error-message-empty-input');
    const filterLanguage = router.locale == 'en-US' ? 'en' : router.locale;
    const addSteps: any[] = [];
    const { graphqlRequestClient } = useAuth();
    const [configParamOptionsList, setConfigParamOptionsList] = useState<Array<any>>([]);
    const [optionsList, setOptionsList] = useState<any>();
    const [extendedInfoColumns, setExtendedInfoColumns] = useState<any>();
    const [formInfos, setFormInfos] = useState<any>();

    Object.keys(props.dataModel.fieldsInfo).map((key) => {
        const rule: any[] = [];
        const typeEdit: any =
            FormDataType[
                props.dataModel.fieldsInfo[key].addEditFormat as keyof typeof FormDataType
            ];

        props.dataModel.fieldsInfo[key].addEditFormat !== null ? (
            (props.dataModel.fieldsInfo[key].isMandatory ? (
                rule.push({ required: true, message: errorMessageEmptyInput })
            ) : (
                <></>
            ),
            typeEdit === FormDataType.Number && props.dataModel.fieldsInfo[key].minRule !== null ? (
                rule.push({
                    type: props.dataModel.fieldsInfo[key].addEditFormat?.toLowerCase(),
                    min: props.dataModel.fieldsInfo[key].minRule,
                    message: t('messages:select-number-min', {
                        min: props.dataModel.fieldsInfo[key].minRule
                    })
                })
            ) : (
                <></>
            ),
            typeEdit === FormDataType.Number && props.dataModel.fieldsInfo[key].maxRule !== null ? (
                rule.push({
                    type: props.dataModel.fieldsInfo[key].addEditFormat?.toLowerCase(),
                    max: props.dataModel.fieldsInfo[key].maxRule,
                    message: t('messages:select-number-max', {
                        max: props.dataModel.fieldsInfo[key].maxRule
                    })
                })
            ) : (
                <></>
            ),
            addSteps.push({
                displayName: t(`d:${props.dataModel.fieldsInfo[key].displayName ?? key}`),
                name: key,
                type: FormDataType[
                    props.dataModel.fieldsInfo[key].addEditFormat as keyof typeof FormDataType
                ],
                maxLength: props.dataModel.fieldsInfo[key].maxLength ?? undefined,
                config: props.dataModel.fieldsInfo[key].config ?? undefined,
                param: props.dataModel.fieldsInfo[key].param ?? undefined,
                rules: rule.length > 0 ? rule : undefined,
                step: props.dataModel.fieldsInfo[key].addEditStep ?? undefined,
                numberPrecision: props.dataModel.fieldsInfo[key].numberPrecision ?? undefined,
                initialValue: props.dataModel.fieldsInfo[key].addEditInitialValue ?? undefined,
                optionTable: props.dataModel.fieldsInfo[key].optionTable ?? undefined,
                filterConfigParam: props.dataModel.fieldsInfo[key].filterConfigParam ?? undefined
            }))
        ) : (
            <></>
        );
    });

    // #region handle configs and parameters when needed
    const configScopes = addSteps
        .filter((obj: any) => obj.hasOwnProperty('config') && obj.config !== undefined)
        .map((obj: any) => obj.config);

    const paramScopes = addSteps
        .filter((obj: any) => obj.hasOwnProperty('param') && obj.param !== undefined)
        .map((obj: any) => obj.param);

    //#subregion: retrieve values to include or exclude for config and param
    function processFilterValues(arr: Array<any>) {
        const result: Array<any> = [];
        arr.forEach((item) => {
            if (item.filter) {
                const values = item.filter.values;
                const isExclusion = values.startsWith('!');
                const extractedValues = values
                    .substring(isExclusion ? 2 : 1, values.length - 1)
                    .split(',');
                const filter: any = {
                    scope: item.scope,
                    filter: {
                        field: item.filter.field,
                        ...(isExclusion
                            ? { excludedValues: extractedValues }
                            : { includedValues: extractedValues })
                    }
                };
                result.push(filter);
            }
        });
        return result;
    }

    const configFilters = addSteps
        .filter((obj: any) => obj.hasOwnProperty('config') && obj.config !== undefined)
        .map((obj: any) => {
            return {
                scope: obj.config,
                filter: obj.filterConfigParam ? JSON.parse(obj.filterConfigParam) : undefined
            };
        });

    const paramFilters = addSteps
        .filter((obj: any) => obj.hasOwnProperty('param') && obj.param !== undefined)
        .map((obj: any) => {
            return {
                scope: obj.param,
                filter: obj.filterConfigParam ? JSON.parse(obj.filterConfigParam) : undefined
            };
        });
    const filteringConfigValues = processFilterValues(configFilters);
    const filteringParamValues = processFilterValues(paramFilters);
    //#end subregion

    const configs = useConfigs(
        { scope: configScopes.length > 0 ? configScopes : '' },
        1,
        100,
        null
    );
    const params = useParams({ scope: paramScopes.length > 0 ? paramScopes : '' }, 1, 100, null);

    useEffect(() => {
        const tmp_results: Array<any> = [];
        function processConfigsParamsToProvide(item: any, filteringConfigValues: any) {
            if (!tmp_results[item.scope]) {
                tmp_results[item.scope] = [];
            }

            const value =
                filterLanguage && item.translation && item.translation[`${filterLanguage}`]
                    ? item.translation[`${filterLanguage}`]
                    : item.value;
            //check if item.scope is in filteringConfigValues

            if (filteringConfigValues?.find?.((obj: any) => obj.scope === item.scope)) {
                const filter = filteringConfigValues.find((obj: any) => obj.scope === item.scope);
                if (filter.filter.includedValues?.includes?.(item[filter.filter.field])) {
                    tmp_results[item.scope].push({
                        key:
                            !isNumeric(item.code) &&
                            props.stringCodeScopes &&
                            props.stringCodeScopes.includes(item.scope)
                                ? item.code
                                : parseInt(item.code),
                        text: value
                    });
                } else if (!filter.filter.excludedValues?.includes?.(item[filter.filter.field])) {
                    tmp_results[item.scope].push({
                        key:
                            !isNumeric(item.code) &&
                            props.stringCodeScopes &&
                            props.stringCodeScopes.includes(item.scope)
                                ? item.code
                                : parseInt(item.code),
                        text: value
                    });
                }
            } else {
                tmp_results[item.scope].push({
                    key:
                        !isNumeric(item.code) &&
                        props.stringCodeScopes &&
                        props.stringCodeScopes.includes(item.scope)
                            ? item.code
                            : parseInt(item.code),
                    text: value
                });
            }
        }

        configs?.data?.configs?.results.sort((a, b) => {
            if (
                props.stringCodeScopes &&
                props.stringCodeScopes.includes(a.scope) &&
                props.stringCodeScopes.includes(b.scope)
            ) {
                return a.code.localeCompare(b.code);
            }
            return parseInt(a.code) - parseInt(b.code);
        });
        configs?.data?.configs?.results.forEach((item: any) => {
            processConfigsParamsToProvide(item, filteringConfigValues);
        });

        params?.data?.parameters?.results.sort((a, b) => {
            if (
                props.stringCodeScopes &&
                props.stringCodeScopes.includes(a.scope) &&
                props.stringCodeScopes.includes(b.scope)
            ) {
                return a.code.localeCompare(b.code);
            }
            return parseInt(a.code) - parseInt(b.code);
        });
        params?.data?.parameters?.results.forEach((item: any) => {
            processConfigsParamsToProvide(item, filteringParamValues);
        });

        setConfigParamOptionsList(tmp_results);
    }, [configs.data, params.data]);
    // #endregion

    // #region region handle options for dropdowns
    const optionsTables = addSteps
        .filter((obj) => obj.hasOwnProperty('optionTable') && obj.optionTable !== undefined)
        .map((obj) => {
            return { field: obj.name, optionTable: JSON.parse(obj.optionTable) };
        });

    // # subregion create filter (dynamic on another field or static) if present in the optionTable
    const [processedOptions, setProcessedOptions] = useState<any>([]);
    const [dependentFields, setDependentFields] = useState<any>([]);
    useEffect(() => {
        const processedOptionsTables = optionsTables.map((obj) => {
            const matchingKeys = checkValueInKey(obj);
            const dependenciesArray: Array<any> = [];
            matchingKeys.map((matchingKey) => {
                if (formInfos && formInfos[matchingKey] !== undefined) {
                    const filtersToApply = { ...obj.optionTable.filtersToApply };
                    filtersToApply[matchingKey] = formInfos[matchingKey];
                    obj.optionTable.filtersToApply = filtersToApply;
                    dependenciesArray.push({ triggerField: matchingKey, changingField: obj.field });
                }
                return obj;
            });
            setDependentFields(dependenciesArray);
            return obj;
        });
        setProcessedOptions(processedOptionsTables);
    }, [formInfos]);
    // end sub-region

    async function getOptions(
        tableName: string | undefined,
        fieldToDisplay: string | undefined,
        filtersToApply?: { [key: string]: any }
    ): Promise<{ [key: string]: any } | undefined> {
        if (tableName && fieldToDisplay) {
            const statusToRemove =
                existingConfigs[
                    `${pascalToSnakeUpper(tableName)}_STATUS_CLOSED` as keyof typeof existingConfigs
                ];
            const queryName = pluralize(tableName.charAt(0).toLowerCase() + tableName.slice(1));
            const queriedFields: any = statusToRemove
                ? ['id', `${fieldToDisplay}`, 'status']
                : ['id', `${fieldToDisplay}`];
            const query = gql`
            query CustomListQuery(
                $filters: ${tableName}SearchFilters
                $orderBy: [${tableName}OrderByCriterion!]
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
                    results {
                        ${queriedFields.join(', ')}
                    }
                }
            }
        `;

            const variables = {
                filters: filtersToApply,
                orderBy: null,
                page: 1,
                itemsPerPage: 100
            };
            const options = await graphqlRequestClient.request(query, variables);
            const result: { [key: string]: any } = {};

            options[queryName].results.forEach((item: any) => {
                if (!result[tableName]) {
                    result[tableName] = [];
                }
                if (!statusToRemove || item.status !== statusToRemove) {
                    result[tableName].push({
                        key: item.id,
                        text: item.name
                    });
                }
            });
            return result;
        }
        return;
    }

    useEffect(() => {
        async function fetchData() {
            const promises = processedOptions.map((element: any) =>
                getOptions(
                    element!.optionTable.table,
                    element!.optionTable.fieldToDisplay,
                    element!.optionTable.filtersToApply
                )
            );
            const options = await Promise.all(promises);
            const optionsObject: { [key: string]: any } = {};
            options.forEach((item: any) => {
                if (item) {
                    const key = Object.keys(item)[0];
                    optionsObject[key] = item[key];
                }
            });

            if (Object.keys(optionsObject).length > 0) {
                setOptionsList(optionsObject);
            }
        }
        fetchData();
    }, [processedOptions]);
    // #region

    // #region add information to columns once available
    useEffect(() => {
        const tmp_columns = addSteps.map((e: any) => {
            if (optionsList) {
                if (e.optionTable) {
                    return {
                        ...e,
                        subOptions:
                            optionsList[
                                `${JSON.parse(e.optionTable).table}` as keyof typeof optionsList
                            ]
                    };
                }
            }
            if (configParamOptionsList) {
                if (e.config || e.param) {
                    return {
                        ...e,
                        subOptions: e.config
                            ? configParamOptionsList[
                                  `${e.config}` as keyof typeof configParamOptionsList
                              ]
                            : configParamOptionsList[
                                  `${e.param}` as keyof typeof configParamOptionsList
                              ]
                    };
                }
            }
            return e;
        });
        setExtendedInfoColumns(tmp_columns);
    }, [configParamOptionsList, optionsList]);
    // #endregion

    // #region handle and return steps
    const stepsArray: Array<any> = [];
    const stepsToDisplay = removeDuplicatesAndSort(
        Object.keys(addSteps).map((key: any) => addSteps[key].step)
    );
    stepsToDisplay.forEach((step) => {
        const tmp_stepsGroup = extendedInfoColumns
            ? extendedInfoColumns
            : addSteps.filter((e: any) => e.step === step);
        stepsArray.push(tmp_stepsGroup);
    });
    // #endregion

    return (
        <>
            <StyledPageContent>
                {permissions ? (
                    !modes.includes(ModeEnum.Create) ? (
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
                            {props.headerComponent}

                            <AddCarrierForm
                                extraData={props.extraData ? props.extraData : {}}
                                addSteps={stepsArray}
                                dataModel={props.dataModel}
                                routeAfterSuccess={props.routeAfterSuccess}
                                routeOnCancel={props.routeOnCancel}
                                setFormInfos={setFormInfos}
                                dependentFields={dependentFields}
                            />
                        </>
                    )
                ) : (
                    <ContentSpin />
                )}
            </StyledPageContent>
        </>
    );
};

AddCarrierComponent.displayName = 'AddCarrierComponent';

export { AddCarrierComponent };
