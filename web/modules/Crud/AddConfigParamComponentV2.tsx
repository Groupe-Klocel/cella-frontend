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
import { AddConfigParamForm } from './submodules/AddConfigParamFormV2';
import { FilterFieldType, FormDataType, ModelType } from 'models/ModelsV2';
import {
    getModesFromPermissions,
    isNumeric,
    pascalToSnakeUpper,
    removeDuplicatesAndSort,
    useConfigs,
    useParams
} from '@helpers';
import { ModeEnum, Table } from 'generated/graphql';
import useTranslation from 'next-translate/useTranslation';
import { useAppState } from 'context/AppContext';
import { ContentSpin } from '@components';
import { useRouter } from 'next/router';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';
import existingConfigs from '../../../common/configs.json';

const StyledPageContent = styled(Layout.Content)`
    margin: 0px 30px 50px 30px;
    padding: 0px 20px;
`;

export interface IAddItemFormProps {
    headerComponent: any;
    dataModel: ModelType;
    addSteps?: Array<Array<FilterFieldType>>;
    routeAfterSuccess: string;
    extraData?: any;
    routeOnCancel?: string;
    comeFromFiltered?: boolean;
}

const AddConfigParamComponent: FC<IAddItemFormProps> = (props: IAddItemFormProps) => {
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
    const [scopesList, setScopesList] = useState<any>();
    const [extendedInfoColumns, setExtendedInfoColumns] = useState<any>();

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
                ? addSteps.push({
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
                      optionTable: props.dataModel.fieldsInfo[key].optionTable ?? undefined
                  })
                : languages.forEach((e: any) =>
                      addSteps.push({
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

    //#region handle scopes list (specific to config and param)
    async function getScopesList(
        tableName: string | undefined
    ): Promise<{ [key: string]: any } | undefined> {
        if (tableName) {
            const queryName = `${tableName.charAt(0).toLowerCase() + tableName.slice(1)}Scopes`;
            const queriedFields: any = 'scope';
            const query = gql`
            query ScopesListQuery{
                ${queryName}{
                    ${queriedFields}
                }
            }
        `;

            const options = await graphqlRequestClient.request(query);
            const result: { [key: string]: any } = {};

            options[queryName].forEach((item: any) => {
                if (!result[tableName]) {
                    result[tableName] = [];
                }
                result[tableName].push({
                    key: item.scope,
                    text: item.scope
                });
            });
            return result;
        }
        return;
    }

    useEffect(() => {
        async function fetchData() {
            const promise = getScopesList(props.dataModel.resolverName);
            const options = await promise;
            if (options) {
                setScopesList(options[props.dataModel.resolverName]);
            }
        }
        fetchData();
    }, []);
    //#end region

    // #region handle configs and parameters when needed
    const configScopes = addSteps
        .filter((obj: any) => obj.hasOwnProperty('config') && obj.config !== undefined)
        .map((obj: any) => obj.config);

    const paramScopes = addSteps
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
    const optionsTables = addSteps
        .filter((obj) => obj.hasOwnProperty('optionTable') && obj.optionTable !== undefined)
        .map((obj) => obj.optionTable);

    async function getOptions(
        tableName: string | undefined,
        fieldToDisplay: string | undefined
    ): Promise<{ [key: string]: any } | undefined> {
        if (tableName && fieldToDisplay) {
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
            const promises = optionsTables.map((element) =>
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
    // #region

    // #region add information to columns once available
    useEffect(() => {
        const tmp_columns = addSteps.map((e: any) => {
            if (e.name === 'scope') return { ...e, subOptions: scopesList };
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
    }, [configParamOptionsList, optionsList, scopesList]);
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
                    !modes.includes(ModeEnum.Create) ||
                    props.dataModel.tableName == Table.Config ? (
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

                            <AddConfigParamForm
                                extraData={props.extraData ? props.extraData : {}}
                                addSteps={stepsArray}
                                dataModel={props.dataModel}
                                routeAfterSuccess={props.routeAfterSuccess}
                                routeOnCancel={props.routeOnCancel}
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

AddConfigParamComponent.displayName = 'AddConfigParamComponent';

export { AddConfigParamComponent };
