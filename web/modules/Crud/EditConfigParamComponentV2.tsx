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
    checkOperator,
    flatten,
    getModesFromPermissions,
    isNumeric,
    pascalToSnakeUpper,
    removeDuplicatesAndSort,
    showError,
    useConfigs,
    useDetail,
    useParams
} from '@helpers';
import { FilterFieldType, FormDataType, ModelType } from 'models/ModelsV2';
import { useRouter } from 'next/router';
import { ModeEnum, Table } from 'generated/graphql';
import { useAppState } from 'context/AppContext';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';
import existingConfigs from '../../../common/configs.json';
import { EditConfigParamForm } from './submodules/EditConfigParamFormV2';

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
    comeFromFiltered?: boolean;
}

const EditConfigParamComponent: FC<IEditItemProps> = (props: IEditItemProps) => {
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
        const languages = ['en', 'fr'];

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
            props.comeFromFiltered && key === 'scope'
                ? null
                : key !== 'translation'
                ? editSteps.push({
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
                      initialValue:
                          props.dataModel.fieldsInfo[key].addEditInitialValue ?? undefined,
                      disabled: props.dataModel.fieldsInfo[key].isEditDisabled ?? undefined,
                      optionTable: props.dataModel.fieldsInfo[key].optionTable ?? undefined,
                      toBeEditDisabled:
                          props.dataModel.fieldsInfo[key].toBeEditDisabled ?? undefined
                  })
                : languages.forEach((e: any) =>
                      editSteps.push({
                          displayName: t(`d:${e}`),
                          name: e,
                          type: FormDataType[
                              props.dataModel.fieldsInfo['translation']
                                  .addEditFormat as keyof typeof FormDataType
                          ],
                          maxLength:
                              props.dataModel.fieldsInfo['translation'].maxLength ?? undefined,
                          config: props.dataModel.fieldsInfo['translation'].config ?? undefined,
                          param: props.dataModel.fieldsInfo['translation'].param ?? undefined,
                          rules: rule.length > 0 ? rule : undefined,
                          step: props.dataModel.fieldsInfo['translation'].addEditStep ?? undefined,
                          numberPrecision:
                              props.dataModel.fieldsInfo['translation'].numberPrecision ??
                              undefined,
                          initialValue:
                              props.dataModel.fieldsInfo['translation'].addEditInitialValue ??
                              undefined,
                          optionTable:
                              props.dataModel.fieldsInfo['translation'].optionTable ?? undefined
                      })
                  ))
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

    const configs = useConfigs(
        { scope: configScopes.length > 0 ? configScopes : '' },
        1,
        100,
        null
    );
    const params = useParams({ scope: paramScopes.length > 0 ? paramScopes : '' }, 1, 100, null);

    useEffect(() => {
        const tmp_results: Array<any> = [];
        configs?.data?.configs?.results.sort((a, b) => parseInt(a.code) - parseInt(b.code));
        configs?.data?.configs?.results.forEach((item: any) => {
            if (!tmp_results[item.scope]) {
                tmp_results[item.scope] = [];
            }
            const value =
                filterLanguage && item.translation
                    ? item.translation[`${filterLanguage}`]
                    : item.value;
            tmp_results[item.scope].push({
                key: isNumeric(item.code) ? parseInt(item.code) : item.code,
                text: value
            });
        });
        params?.data?.parameters?.results.sort((a, b) => parseInt(a.code) - parseInt(b.code));
        params?.data?.parameters?.results.forEach((item: any) => {
            if (!tmp_results[item.scope]) {
                tmp_results[item.scope] = [];
            }
            const value =
                filterLanguage && item.translation
                    ? item.translation[`${filterLanguage}`]
                    : item.value;
            tmp_results[item.scope].push({
                key: isNumeric(item.code) ? parseInt(item.code) : item.code,
                text: value
            });
        });
        setConfigParamOptionsList(tmp_results);
    }, [configs.data, params.data]);
    // #endregion

    // #region region handle options for dropdowns
    const optionsTables = editSteps
        .filter((obj: any) => obj.hasOwnProperty('optionTable') && obj.optionTable !== undefined)
        .map((obj: any) => obj.optionTable);

    async function getOptions(
        tableName: string | undefined,
        fieldToDisplay: string | undefined
    ): Promise<{ [key: string]: any } | undefined> {
        if (tableName) {
            const statusToRemove =
                existingConfigs[
                    `${pascalToSnakeUpper(tableName)}_STATUS_CLOSED` as keyof typeof existingConfigs
                ];
            const queryName = `${tableName.charAt(0).toLowerCase() + tableName.slice(1)}s`;
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
                filters: {},
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
            const promises = optionsTables.map((element: any) =>
                getOptions(JSON.parse(element!).table, JSON.parse(element!).fieldToDisplay)
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
    }, []);
    // #endregion

    // #region handle checks from external tables fields
    async function checkCondition(
        id: string,
        tableToCheck: string,
        fieldToCheck: string,
        conditions: Array<{ operator: string; value: string }>
    ): Promise<boolean> {
        const queryName = `${tableToCheck.charAt(0).toLowerCase() + tableToCheck.slice(1)}s`;
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

        const dataFieldToSearch = `${props.dataModel.tableName.toLowerCase()}Id`;

        const variables = {
            filters: { [dataFieldToSearch]: id },
            orderBy: null,
            page: 1,
            itemsPerPage: 100
        };

        const result = await graphqlRequestClient.request(query, variables);

        let checkResult = false;
        if (result) {
            conditions.forEach((condition) => {
                const valueToCheck = Number(
                    existingConfigs[
                        `${pascalToSnakeUpper(tableToCheck)}_${pascalToSnakeUpper(
                            fieldToCheck
                        )}_${pascalToSnakeUpper(condition.value)}` as keyof typeof existingConfigs
                    ]
                );
                if (!valueToCheck) {
                    console.log(`Value ${condition.value} not found in existingConfigs`);
                    checkResult = true;
                }
                result[`${queryName}`].results.forEach((e: any) => {
                    if (!checkOperator(e.status, condition.operator, valueToCheck)) {
                        checkResult = true;
                    }
                });
            });
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
            if (checkedFields) {
                if (e.toBeEditDisabled) {
                    return {
                        ...e,
                        disabled: checkedFields[`${e.name}` as keyof typeof optionsList].disable
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

    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);

    return (
        <>
            {permissions ? (
                !modes.includes(ModeEnum.Update) ||
                (props.dataModel.tableName == Table.Config && detail.data?.config?.system) ||
                (props.dataModel.tableName == Table.Parameter && detail.data?.parameter?.system) ? (
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
                                <EditConfigParamForm
                                    id={props.id}
                                    details={detail.data[props.dataModel.endpoints.detail]}
                                    dataModel={props.dataModel}
                                    routeAfterSuccess={props.routeAfterSuccess}
                                    editSteps={stepsArray}
                                    routeOnCancel={props.routeOnCancel}
                                    detailFields={detailFields}
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

EditConfigParamComponent.displayName = 'EditConfigParamComponent';

export { EditConfigParamComponent };
