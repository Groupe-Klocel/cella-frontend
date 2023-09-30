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

import { FC, useEffect, useState } from 'react';
import styled from 'styled-components';
import {
    flatten,
    getModesFromPermissions,
    isNumeric,
    pascalToSnakeUpper,
    pluralize,
    removeDuplicatesAndSort,
    showError,
    useConfigs,
    useDetail,
    useParams,
    checkValueInKey,
    extractComparisonValues
} from '@helpers';
import { EditItemForm } from './submodules/EditItemFormV2';
import { FilterFieldType, FormDataType, ModelType } from 'models/ModelsV2';
import { useRouter } from 'next/router';
import { ModeEnum } from 'generated/graphql';
import { useAppState } from 'context/AppContext';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';
import existingConfigs from '../../../common/configs.json';

const StyledPageContent = styled(Layout.Content)`
    margin: 0px 30px 50px 30px;
    padding: 0px 20px;
`;

export interface IEditItemProps {
    id: string | any;
    headerComponent: any;
    dataModel: ModelType;
    routeAfterSuccess: string;
    editSteps?: Array<Array<FilterFieldType>>;
    setData?: any;
    routeOnCancel?: string;
    stringCodeScopes?: Array<string>;
}

const EditItemComponent: FC<IEditItemProps> = (props: IEditItemProps) => {
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const router = useRouter();
    const errorMessageEmptyInput = t('messages:error-message-empty-input');
    const filterLanguage = router.locale == 'en-US' ? 'en' : router.locale;
    const { graphqlRequestClient } = useAuth();
    const editSteps: any[] = [];
    const [optionsList, setOptionsList] = useState<any>();
    const [configParamOptionsList, setConfigParamOptionsList] = useState<Array<any>>([]);
    const [extendedInfoColumns, setExtendedInfoColumns] = useState<any>();
    const [checkedFields, setCheckedFields] = useState<any>();
    const [formInfos, setFormInfos] = useState<any>();

    // #region extract data from modelV2
    const detailFields = Object.keys(props.dataModel.fieldsInfo).filter(
        (key) => props.dataModel.fieldsInfo[key].isDetailRequested
    );

    const disableFieldsRules = Object.keys(props.dataModel.fieldsInfo)
        .filter((key) => props.dataModel.fieldsInfo[key].toBeEditDisabled)
        .map((key) => ({
            [key]: JSON.parse(props.dataModel.fieldsInfo[key].toBeEditDisabled!)
        }));
    // #endregion

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
            editSteps.push({
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
                disabled: props.dataModel.fieldsInfo[key].isEditDisabled ?? undefined,
                optionTable: props.dataModel.fieldsInfo[key].optionTable ?? undefined,
                toBeEditDisabled: props.dataModel.fieldsInfo[key].toBeEditDisabled ?? undefined,
                filterConfigParam: props.dataModel.fieldsInfo[key].filterConfigParam ?? undefined
            }))
        ) : (
            <></>
        );
    });

    // #region handle configs and parameters when needed
    const configScopes = editSteps
        .filter((obj: any) => obj.hasOwnProperty('config') && obj.config !== undefined)
        .map((obj: any) => obj.config);

    const paramScopes = editSteps
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

    const configFilters = editSteps
        .filter((obj: any) => obj.hasOwnProperty('config') && obj.config !== undefined)
        .map((obj: any) => {
            return {
                scope: obj.config,
                filter: obj.filterConfigParam ? JSON.parse(obj.filterConfigParam) : undefined
            };
        });

    const paramFilters = editSteps
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
                            isNumeric(item.code) &&
                            props.stringCodeScopes &&
                            props.stringCodeScopes.includes(item.scope)
                                ? item.code
                                : parseInt(item.code),
                        text: value
                    });
                } else if (!filter.filter.excludedValues?.includes?.(item[filter.filter.field])) {
                    tmp_results[item.scope].push({
                        key:
                            isNumeric(item.code) &&
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
                        isNumeric(item.code) &&
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
    const optionsTables = editSteps
        .filter((obj: any) => obj.hasOwnProperty('optionTable') && obj.optionTable !== undefined)
        .map((obj: any) => {
            return { field: obj.name, optionTable: JSON.parse(obj.optionTable) };
        });

    const { detail, reload: reloadData } = useDetail(
        props.id,
        props.dataModel.endpoints.detail,
        detailFields
    );

    useEffect(() => {
        reloadData();
    }, [router.locale]);

    useEffect(() => {
        if (detail.data[props.dataModel.endpoints.detail]) {
            const flattenedData = flatten(detail.data[props.dataModel.endpoints.detail]);
            if (props.setData) props.setData(flattenedData);
        }
    }, [detail.data]);

    useEffect(() => {
        if (detail.error) {
            showError(t('messages:error-getting-data'));
        }
    }, [detail.error]);

    // #subregion create filter (dynamic on another field or static) if present in the optionTable
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
                } else if (detail && detail.data[props.dataModel.endpoints.detail] !== undefined) {
                    const previousData = detail.data[props.dataModel.endpoints.detail];
                    const filtersToApply = { ...obj.optionTable.filtersToApply };
                    filtersToApply[matchingKey] = previousData[matchingKey];
                    obj.optionTable.filtersToApply = filtersToApply;
                    dependenciesArray.push({ triggerField: matchingKey, changingField: obj.field });
                }
                return obj;
            });
            setDependentFields(dependenciesArray);
            return obj;
        });
        setProcessedOptions(processedOptionsTables);
    }, [formInfos, detail]);
    //#end sub-region

    async function getOptions(
        tableName: string | undefined,
        fieldToDisplay: string | undefined,
        filtersToApply?: { [key: string]: any }
    ): Promise<{ [key: string]: any } | undefined> {
        if (tableName) {
            const statusToRemove =
                existingConfigs[
                    `${pascalToSnakeUpper(tableName)}_STATUS_CLOSED` as keyof typeof existingConfigs
                ];
            // const queryName = `${tableName.charAt(0).toLowerCase() + tableName.slice(1)}s`;
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
                let valueToDisplay: any = item.name;

                Object.values(item).forEach((subItem: any) => {
                    valueToDisplay = subItem?.name ? subItem?.name : valueToDisplay;
                });

                if (!result[tableName]) {
                    result[tableName] = [];
                }
                if (!statusToRemove || item.status !== statusToRemove) {
                    result[tableName].push({
                        key: item.id,
                        text: valueToDisplay
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
                if (detail && detail.data[props.dataModel.endpoints.detail] !== undefined) {
                    const itemId = detail.data[props.dataModel.endpoints.detail].id;
                    //remove id from option object if present
                    const key = Object.keys(item)[0];
                    const index = item[key].findIndex((element: any) => element.key === itemId);
                    if (index > -1) {
                        item[key].splice(index, 1);
                    }
                }
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
    // #endregion

    // #region handle checks from external tables fields
    async function checkCondition(
        id: string,
        tableToCheck: string,
        fieldToCheck: string,
        conditions: string
    ): Promise<boolean> {
        const queryName = pluralize(tableToCheck.charAt(0).toLowerCase() + tableToCheck.slice(1));
        const query = gql`
        query CustomListQuery(
            $filters: ${tableToCheck}SearchFilters
            $orderBy: [${tableToCheck}OrderByCriterion!]
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
                    ${fieldToCheck}
            }
            }
        }
    `;

        let dataFieldToSearch = 'id';
        if (tableToCheck != props.dataModel.resolverName) {
            dataFieldToSearch = `${
                props.dataModel.resolverName.charAt(0).toLowerCase() +
                props.dataModel.resolverName.slice(1)
            }Id`;
        }

        const variables = {
            filters: { [dataFieldToSearch]: id },
            orderBy: null,
            page: 1,
            itemsPerPage: 100
        };

        const result = await graphqlRequestClient.request(query, variables);

        let checkResult = false;
        if (result) {
            const extractedValues = extractComparisonValues(conditions);

            //replace comparison values in the condition string
            const tmp_replacementsList: Array<any> = [];
            extractedValues.forEach((condition) => {
                const valueToCheck = Number(
                    existingConfigs[
                        `${pascalToSnakeUpper(tableToCheck)}_${pascalToSnakeUpper(
                            fieldToCheck
                        )}_${pascalToSnakeUpper(
                            condition.valueToCompare
                        )}` as keyof typeof existingConfigs
                    ]
                );
                if (!valueToCheck) {
                    console.log(`Value ${condition.valueToCompare} not found in existingConfigs`);
                    checkResult = true;
                    return checkResult;
                }
                tmp_replacementsList.push({
                    search: condition.valueToCompare,
                    replace: valueToCheck.toString()
                });
            });
            tmp_replacementsList.forEach((item) => {
                conditions = conditions.replace(new RegExp(item.search, 'g'), item.replace);
            });

            const intermediateConditions = conditions;

            // replace queried values in the string and generate a table of it
            const conditionList: Array<any> = [];
            result[`${queryName}`].results.forEach((e: any) => {
                const replacedConditions = intermediateConditions.replaceAll(
                    'value',
                    e[fieldToCheck]
                );
                conditionList.push(replacedConditions);
            });

            // check the conditions once filled with values
            const checkList = [];
            conditionList.forEach((condition) => {
                const func = new Function(`return ${condition}`);
                if (func()) {
                    const individualCheck = true;
                    checkList.push(individualCheck);
                }
            });

            if (checkList.length > 0) {
                checkResult = true;
                return checkResult;
            }
        }
        return checkResult;
    }

    // #sub-region if condition met, set fields to disable edit
    useEffect(() => {
        async function disableFields() {
            const promises = disableFieldsRules.map((element: any) => {
                const elementPromises = Object.keys(element).map((key) => {
                    return Promise.all(
                        element[key].map((item: any) => {
                            return checkCondition(
                                props.id,
                                item.table,
                                item.field,
                                item.conditions
                            ).then((awaitRes) => {
                                //If the condition is met, the field must be disabled
                                return { [key]: { disable: awaitRes } };
                            });
                        })
                    );
                });
                return Promise.all(elementPromises);
            });

            const checkedResults = await Promise.all(promises);

            if (checkedResults) {
                const resultObject = checkedResults.reduce((acc: { [key: string]: any }, curr) => {
                    const [item] = curr;
                    const [obj] = item;
                    const [key] = Object.keys(obj);
                    acc[key] = obj[key];
                    return acc;
                }, {});

                setCheckedFields(resultObject);
            }
        }
        disableFields();
    }, []);
    // #end subregion
    // #endregion

    // #region add information to columns once available
    useEffect(() => {
        const tmp_columns = editSteps.map((e: any) => {
            let updatedE = { ...e };
            if (optionsList) {
                if (e.optionTable) {
                    updatedE = {
                        ...updatedE,
                        subOptions:
                            optionsList[
                                `${JSON.parse(e.optionTable).table}` as keyof typeof optionsList
                            ]
                    };
                }
            }

            if (checkedFields) {
                if (e.toBeEditDisabled) {
                    updatedE = {
                        ...updatedE,
                        disabled: checkedFields[`${e.name}` as keyof typeof optionsList].disable
                    };
                }
            }

            if (configParamOptionsList) {
                if (e.config || e.param) {
                    updatedE = {
                        ...updatedE,
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
            return updatedE;
        });

        setExtendedInfoColumns(tmp_columns);
    }, [configParamOptionsList, optionsList, checkedFields]);
    // #endregion

    // #region handle and return steps
    const stepsArray: Array<any> = [];
    const stepsToDisplay = removeDuplicatesAndSort(
        Object.keys(editSteps).map((key: any) => editSteps[key].step)
    );
    stepsToDisplay.forEach((step) => {
        const tmp_stepsGroup = extendedInfoColumns
            ? extendedInfoColumns
            : editSteps.filter((e: any) => e.step === step);
        stepsArray.push(tmp_stepsGroup);
    });
    // #endregion

    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);

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
                        {props.headerComponent}

                        <StyledPageContent>
                            {detail.data &&
                            !detail.isLoading &&
                            detail.data[props.dataModel.endpoints.detail] ? (
                                <EditItemForm
                                    id={props.id}
                                    details={detail.data[props.dataModel.endpoints.detail]}
                                    dataModel={props.dataModel}
                                    routeAfterSuccess={props.routeAfterSuccess}
                                    editSteps={stepsArray}
                                    routeOnCancel={props.routeOnCancel}
                                    detailFields={detailFields}
                                    setFormInfos={setFormInfos}
                                    dependentFields={dependentFields}
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

EditItemComponent.displayName = 'EditItemComponent';

export { EditItemComponent };
