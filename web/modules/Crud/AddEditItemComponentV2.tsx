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
import { Alert, Layout, Form, Button, Space, Modal } from 'antd';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

import { FC, useEffect, useState } from 'react';
import styled from 'styled-components';
import { FormDataType, ModelType } from 'models/ModelsV2';
import {
    getModesFromPermissions,
    isNumeric,
    pascalToSnakeUpper,
    useConfigs,
    useParams,
    checkValueInKey,
    pluralize,
    showError,
    showSuccess,
    showInfo,
    useCreate,
    useDetail,
    flatten,
    setUTCDateTime,
    extractComparisonValues,
    useUpdate,
    checkUndefinedValues
} from '@helpers';
import { ModeEnum } from 'generated/graphql';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useAppState } from 'context/AppContext';
import { ContentSpin } from '@components';
import { useRouter } from 'next/router';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';
import { FormGroup } from './submodules/FormGroupV2';

const StyledPageContent = styled(Layout.Content)`
    margin: 0px 30px 50px 30px;
    padding: 0px 20px;
`;

export interface IAddItemFormProps {
    headerComponent: any;
    dataModel: ModelType;
    routeAfterSuccess: string;
    initialProps?: any;
    extraData?: any;
    routeOnCancel?: string;
    stringCodeScopes?: Array<string>;
    extraRules?: Array<any>;
    id?: string | undefined;
    setData?: (data: any) => void;
    // Generic per-field option-list filtering constraints provided by the calling page.
    // Keyed by field name; merged into the field's optionTable so the option dropdown can be
    // narrowed (inclusion via filtersToApply, inclusion/exclusion via advancedFilters) without
    // adding entity-specific logic in the generic components.
    optionsConstraints?: {
        [fieldName: string]: { filtersToApply?: any; advancedFilters?: any[] };
    };
    setId?: (id: any) => void;
    // when true, the `scope` field is pre-filled through `extraData` and hidden from the form
    // (config/param screens that were previously handled by AddConfigParamComponent)
    comeFromFiltered?: boolean;
}

const AddEditItemComponent: FC<IAddItemFormProps> = (props: IAddItemFormProps) => {
    const { permissions, configs } = useAppState();
    const { t } = useTranslation();
    const router = useRouter();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);
    const [itemComponent, setItemComponent] = useState<any[]>(
        Object.keys(props.dataModel.fieldsInfo).flatMap((key) => {
            const fieldInfo = props.dataModel.fieldsInfo[key];
            if (fieldInfo.addEditFormat === null) return [];
            // hide the scope field when it is pre-filled through a filtered scope (config/param)
            if (props.comeFromFiltered && key === 'scope') return [];

            const makeItem = (name: string, displayName: string, initialValue: any) => ({
                displayName,
                name,
                type: FormDataType[fieldInfo.addEditFormat as keyof typeof FormDataType],
                maxLength: fieldInfo.maxLength ?? undefined,
                config: fieldInfo.config ?? undefined,
                param: fieldInfo.param ?? undefined,
                rulesInfos: [fieldInfo.isMandatory, fieldInfo.minRule, fieldInfo.maxRule],
                numberPrecision: fieldInfo.numberPrecision ?? undefined,
                initialValue,
                optionTable: fieldInfo.optionTable ?? undefined,
                filterConfigParam: fieldInfo.filterConfigParam
                    ? JSON.parse(fieldInfo.filterConfigParam)
                    : undefined
            });

            // the `translation` field is edited as one input per language (en/fr/de) and
            // re-assembled into a single `translation` object on submit (see buildInput)
            if (key === 'translation') {
                return ['en', 'fr', 'de'].map((lang) =>
                    makeItem(
                        lang,
                        t(`d:${lang}`),
                        props.initialProps?.initialData?.translation?.[lang] !== undefined
                            ? props.initialProps.initialData.translation[lang]
                            : undefined
                    )
                );
            }

            return [
                makeItem(
                    key,
                    t(`d:${fieldInfo.displayName ?? key}`),
                    props.initialProps?.initialData?.[key] !== undefined
                        ? props.initialProps.initialData?.[key]
                        : undefined
                )
            ];
        })
    );
    const { graphqlRequestClient } = useAuth();
    const [formInfos, setFormInfos] = useState<any>({});
    const [changedFormValues, setChangedFormValues] = useState<any>();
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes
    const [form] = Form.useForm();
    const [imageData, setImageData] = useState<string | null>(null);
    const [dataInitialized, setDataInitialized] = useState<boolean>(false);

    // #region extract data from modelV2
    const detailFields = Object.keys(props.dataModel.fieldsInfo).filter(
        (key) => props.dataModel.fieldsInfo[key].isDetailRequested
    );

    async function checkDisable(id: String, toBeDisabled: any) {
        const tableToCheck = toBeDisabled[0].table;
        const scopeToCheck = toBeDisabled[0]?.scope;
        const fieldToCheck = toBeDisabled[0].field;
        let conditions = toBeDisabled[0].conditions;
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

        if (result) {
            const extractedValues = extractComparisonValues(conditions);

            //replace comparison values in the condition string
            const tmp_replacementsList: Array<any> = [];
            extractedValues.forEach((condition) => {
                const valueToCheck = Number(
                    configs.find((conf: any) => {
                        return (
                            conf.scope ===
                                (scopeToCheck ??
                                    `${pascalToSnakeUpper(tableToCheck).toLowerCase()}_${pascalToSnakeUpper(fieldToCheck).toLowerCase()}`) &&
                            conf.value.toLowerCase() ===
                                condition.valueToCompare.split('_').join(' ').toLowerCase()
                        );
                    })?.code
                );
                if (!valueToCheck) {
                    console.log(`Value ${condition.valueToCompare} not found in existingConfigs`);
                    return true;
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
                    checkList.push(true);
                }
            });

            if (checkList.length > 0) {
                return true;
            }
        }
        return false;
    }

    if (props.id) {
        useEffect(() => {
            if (props.initialProps.error) {
                showError(t('messages:error-fetching-data'));
                console.log(props.initialProps.errorMessage);
                router.back();
            }
            const tmp_details = { ...props.initialProps.initialData };

            // DatePicker's value only accept dayjs, Conversion string -> dayjs required
            Object.keys(tmp_details).forEach((key) => {
                const dayjsDate = dayjs(tmp_details[key]);
                if (
                    tmp_details[key] &&
                    dayjsDate.isValid() &&
                    itemComponent.find((el) => el.name === key && el.type === FormDataType.Calendar)
                ) {
                    tmp_details[key] = dayjs(setUTCDateTime(tmp_details[key]));
                }
                if (key === 'logo') {
                    setImageData(tmp_details[key]);
                }
            });

            // Refactor async logic outside of map
            const updateItemComponentAsync = async () => {
                const updated = await Promise.all(
                    itemComponent.map(async (item: any) => {
                        let isDisabled = false;
                        if (props.dataModel.fieldsInfo[item.name]?.toBeEditDisabled && props.id) {
                            isDisabled = await checkDisable(
                                props.id,
                                JSON.parse(
                                    props.dataModel.fieldsInfo[item.name].toBeEditDisabled ?? ''
                                )
                            );
                        }
                        return {
                            ...item,
                            disabled:
                                props.dataModel.fieldsInfo[item.name]?.isEditDisabled ?? isDisabled
                        };
                    })
                );
                setItemComponent(updated);
                setFormInfos(tmp_details);
                if (props.setData) props.setData(flatten(tmp_details));
                setDataInitialized(true);
            };

            updateItemComponentAsync();
        }, []);
    } else {
        useEffect(() => {
            setDataInitialized(true);
        }, []);
    }

    //#endregion

    // #region region handle options for dropdowns
    const optionsTables = itemComponent
        .filter((obj) => obj.hasOwnProperty('optionTable') && obj.optionTable !== undefined)
        .map((obj) => {
            return { field: obj.name, optionTable: JSON.parse(obj.optionTable), type: obj.type };
        });

    // # subregion create filter (dynamic on another field or static) if present in the optionTable
    const [processedOptions, setProcessedOptions] = useState<any>();

    useEffect(() => {
        const allMatchingKeys = optionsTables
            .map((obj) => checkValueInKey(obj))
            .filter(Boolean)
            .flat();
        if (
            (changedFormValues && allMatchingKeys.includes(Object.keys(changedFormValues)[0])) ||
            !changedFormValues
        ) {
            const processedOptionsTables = () =>
                itemComponent.map((obj) => {
                    if (obj.hasOwnProperty('optionTable') && obj.optionTable !== undefined) {
                        const filtersToApply = JSON.parse(obj.optionTable).filtersToApply;
                        if (!filtersToApply) {
                            return {
                                ...obj,
                                optionTable: {
                                    ...JSON.parse(obj.optionTable)
                                }
                            };
                        }
                        const matchingKey = Object.keys(filtersToApply)[0];
                        if (formInfos && formInfos[matchingKey] !== undefined) {
                            filtersToApply[Object.keys(filtersToApply)[0]] =
                                formInfos[matchingKey] ?? filtersToApply[matchingKey];
                            return {
                                ...obj,
                                optionTable: {
                                    ...JSON.parse(obj.optionTable),
                                    filtersToApply: filtersToApply
                                }
                            };
                        } else if (formInfos && formInfos[matchingKey] === undefined) {
                            filtersToApply[matchingKey] =
                                filtersToApply[matchingKey] ?? matchingKey;
                            return {
                                ...obj,
                                optionTable: {
                                    ...JSON.parse(obj.optionTable),
                                    filtersToApply: filtersToApply
                                }
                            };
                        }
                        return obj;
                    } else {
                        return obj;
                    }
                });
            // Merge the page-provided per-field constraints into the matching field optionTables.
            // Stays generic: the calling page decides what to include/exclude, no entity logic here.
            const withConstraints = props.optionsConstraints
                ? processedOptionsTables().map((obj: any) => {
                      const constraint = props.optionsConstraints?.[obj.name];
                      if (constraint && obj.optionTable && typeof obj.optionTable === 'object') {
                          return {
                              ...obj,
                              optionTable: {
                                  ...obj.optionTable,
                                  filtersToApply: {
                                      ...(obj.optionTable.filtersToApply ?? {}),
                                      ...(constraint.filtersToApply ?? {})
                                  },
                                  ...(constraint.advancedFilters
                                      ? { advancedFilters: constraint.advancedFilters }
                                      : {})
                              }
                          };
                      }
                      return obj;
                  })
                : processedOptionsTables();
            setProcessedOptions(withConstraints);
        }
    }, [formInfos]);
    // end sub-region

    // #endregion

    // prompt the user if they try and leave with unsaved changes
    useEffect(() => {
        const handleWindowClose = (e: BeforeUnloadEvent) => {
            if (!unsavedChanges) return;
            e.preventDefault();
            return (e.returnValue = t('messages:confirm-leaving-page')); //deprecated but still required for some old browsers
        };
        const handleBrowseAway = () => {
            if (!unsavedChanges) return;
            if (window.confirm(t('messages:confirm-leaving-page'))) return;
            router.events.emit('routeChangeError');
            throw 'routeChange aborted.';
        };
        window.addEventListener('beforeunload', handleWindowClose);
        router.events.on('routeChangeStart', handleBrowseAway);
        return () => {
            window.removeEventListener('beforeunload', handleWindowClose);
            router.events.off('routeChangeStart', handleBrowseAway);
        };
    }, [unsavedChanges]);

    const {
        isLoading: createLoading,
        result: createResult,
        mutate: mutateCreate
    } = useCreate(props.dataModel.resolverName, props.dataModel.endpoints.create, detailFields);

    const {
        isLoading: updateLoading,
        result: updateResult,
        mutate: mutateUpdate
    } = useUpdate(props.dataModel.resolverName, props.dataModel.endpoints.update, detailFields);

    useEffect(() => {
        const result = createResult.data ? createResult : updateResult;
        const successMessage = createResult.data
            ? t('messages:success-created')
            : t('messages:success-updated');
        const errorMessage = createResult.data
            ? t('messages:error-creating-data')
            : t('messages:error-update-data');
        const endpoint = createResult.data
            ? props.dataModel.endpoints.create
            : props.dataModel.endpoints.update;
        if (!(result && result.data)) return;

        if (props.setId) {
            props.setId(result.data[endpoint].id);
        }

        if (result.success) {
            router.push(props.routeAfterSuccess.replace(':id', result.data[endpoint]?.id));
            showSuccess(successMessage);
        } else {
            showError(errorMessage);
        }
    }, [createResult, updateResult]);

    // models exposing an editable `translation` field split it into en/fr/de inputs; collapse
    // them back into a single `translation` object (or null when all empty) before submitting
    const hasTranslation = props.dataModel.fieldsInfo['translation']?.addEditFormat != null;
    const buildInput = (values: any) => {
        if (!hasTranslation) return values;
        const { en, fr, de, ...rest } = values;
        return {
            ...rest,
            translation: !en && !fr && !de ? null : { en, fr, de }
        };
    };

    const onFinish = () => {
        if (props.dataModel.endpoints.update && props.id) {
            form.validateFields()
                .then(() => {
                    checkUndefinedValues(form);
                    mutateUpdate({
                        id: props.id,
                        input: buildInput({ ...form.getFieldsValue(true) })
                    });
                    setUnsavedChanges(false);
                })
                .catch((err) => {
                    showError(t('errors:DB-000111'));
                });
        } else {
            Modal.confirm({
                title: t('messages:create-confirm'),
                onOk: () => {
                    form.validateFields()
                        .then(() => {
                            mutateCreate({
                                input: buildInput({
                                    ...form.getFieldsValue(true),
                                    ...props.extraData
                                })
                            });
                            setUnsavedChanges(false);
                        })
                        .catch((err) => {
                            showError(t('errors:DB-000111'));
                        });
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        }
    };

    const onCancel = () => {
        setUnsavedChanges(false);
        Modal.confirm({
            title: t('messages:confirm-leaving-page'),
            onOk: () => {
                props.routeOnCancel ? router.push(props.routeOnCancel) : router.back();
            },
            okText: t('common:bool-yes'),
            cancelText: t('common:bool-no')
        });
    };

    useEffect(() => {
        if (createLoading && !updateLoading) {
            showInfo(t('messages:info-create-wip'));
        }
        if (!createLoading && updateLoading) {
            showInfo(t('messages:info-update-wip'));
        }
    }, [createLoading, updateLoading]);

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
                            {processedOptions && dataInitialized && (
                                <>
                                    {props.headerComponent}
                                    <StyledPageContent>
                                        <Form
                                            form={form}
                                            layout="vertical"
                                            scrollToFirstError
                                            onValuesChange={(changedValues, values) => {
                                                setChangedFormValues(changedValues);
                                                setFormInfos(values);
                                                setUnsavedChanges(true);
                                            }}
                                        >
                                            <FormGroup
                                                inputs={processedOptions}
                                                setValues={form.setFieldsValue}
                                                dataModel={props.dataModel}
                                                extraRule={props.extraRules}
                                                stringCodeScopes={props.stringCodeScopes}
                                                imageData={imageData ?? undefined}
                                                setFormInfos={setFormInfos}
                                            />
                                        </Form>
                                        <div style={{ textAlign: 'center' }}>
                                            <Space>
                                                <Button
                                                    type="primary"
                                                    loading={createLoading}
                                                    onClick={onFinish}
                                                >
                                                    {props.id
                                                        ? t('actions:update')
                                                        : t('actions:submit')}
                                                </Button>
                                                <Button onClick={onCancel}>
                                                    {t('actions:cancel')}
                                                </Button>
                                            </Space>
                                        </div>
                                    </StyledPageContent>
                                </>
                            )}
                        </>
                    )
                ) : (
                    <ContentSpin />
                )}
            </StyledPageContent>
        </>
    );
};

AddEditItemComponent.displayName = 'AddEditItemComponent';

export { AddEditItemComponent };
