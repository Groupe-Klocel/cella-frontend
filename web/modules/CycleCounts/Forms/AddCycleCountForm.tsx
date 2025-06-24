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
import { WrapperForm } from '@components';
import configs from '../../../../common/configs.json';
import {
    AutoComplete,
    Button,
    Col,
    InputNumber,
    Row,
    Form,
    Checkbox,
    Select,
    Modal,
    Card,
    Space
} from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useState } from 'react';
import { useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import {
    SimpleGetAllBLocksQuery,
    useSimpleGetAllBLocksQuery,
    useListConfigsForAScopeQuery,
    useListParametersForAScopeQuery,
    useSimpleGetInProgressStockOwnersQuery,
    SimpleGetInProgressStockOwnersQuery
} from 'generated/graphql';
import { debounce } from 'lodash';
import _ from 'lodash';
import { showError, showSuccess, useArticleIds } from '@helpers';
import { CheckboxChangeEvent } from 'antd/lib/checkbox';
import existingConfigs from '../../../../common/configs.json';
import { gql } from 'graphql-request';

const { Option } = Select;

interface IOption {
    value: string;
    id: string;
}

export interface ISingleItemProps {
    cycleCountModel: string | any;
}

export const AddCycleCountForm = (props: ISingleItemProps) => {
    const { t } = useTranslation('common');
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const { userSettings } = useAppState();
    const generalUserSettings = userSettings?.find((item: any) => {
        return 'globalParameters' === item.code;
    });
    const globalLocale = generalUserSettings?.valueJson?.lang;
    const searchedLanguage = globalLocale == 'en-us' ? 'en' : globalLocale;

    const [stockOwners, setStockOwners] = useState<any>();
    // EQUIPMENT : const [equipmentWithPriorities, setEquipmentWithPriorities] = useState<any>();
    const [cycleCountTypes, setCycleCountTypes] = useState<any>();
    const [cycleCountModels, setCycleCountModels] = useState<any>();
    const [choosenStockOwner, setChoosenStockOwner] = useState<string>();
    const [aIdOptions, setAIdOptions] = useState<Array<IOption>>([]);
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes

    const [aId, setAId] = useState<string>();
    const [articleName, setArticleName] = useState<string>('');

    const [blocks, setBlocks] = useState<any>();
    const [articleDisplayGroup, setArticleDisplayGroup] = useState<boolean>(false);
    const [locationDisplayGroup, setLocationDisplayGroup] = useState<boolean>(false);
    const [emptyLocationDisplayGroup, setEmptyLocationDisplayGroup] = useState<boolean>(false);
    const [stockMiniDisplayGroup, setStockMiniDisplayGroup] = useState<boolean>(false);
    const [reasonsTexts, setReasonsTexts] = useState<any>();
    const [motivesTexts, setMotivesTexts] = useState<any>();
    const [form] = Form.useForm();

    // Retrieve all necessary information
    const cycleCountModelsList = useListConfigsForAScopeQuery(graphqlRequestClient, {
        scope: 'cycle_count_model',
        language: searchedLanguage
    });

    useEffect(() => {
        if (cycleCountModelsList) {
            setCycleCountModels(cycleCountModelsList?.data?.listConfigsForAScope);
        }
    }, [cycleCountModelsList]);

    const cycleCountTypesList = useListConfigsForAScopeQuery(graphqlRequestClient, {
        scope: 'cycle_count_type',
        language: searchedLanguage
    });

    useEffect(() => {
        if (cycleCountTypesList) {
            // 29/09/202 - The backend functions for emptyLocation, nbDays and stockMini will be deployed later on.
            // For now, we need to remove them from the list of cycle count types
            // setCycleCountTypes(cycleCountTypesList?.data?.listConfigsForAScope);
            const cycleCountTypesListFiltered =
                cycleCountTypesList?.data?.listConfigsForAScope?.filter(
                    (type) =>
                        type.code !== existingConfigs.CYCLE_COUNT_TYPE_NB_DAYS.toString() &&
                        type.code !== existingConfigs.CYCLE_COUNT_TYPE_EMPTY_LOCATION.toString() &&
                        type.code !== existingConfigs.CYCLE_COUNT_TYPE_STOCK_MINI.toString()
                );

            // Update cycleCountTypes only if the filtered list has changed
            if (!_.isEqual(cycleCountTypesListFiltered, cycleCountTypes)) {
                setCycleCountTypes(cycleCountTypesListFiltered);
            }
        }
    }, [cycleCountTypesList]);

    //To render Simple In progress stock owners list
    const stockOwnerList = useSimpleGetInProgressStockOwnersQuery<
        Partial<SimpleGetInProgressStockOwnersQuery>,
        Error
    >(graphqlRequestClient);

    useEffect(() => {
        if (stockOwnerList) {
            setStockOwners(stockOwnerList?.data?.stockOwners?.results);
        }
    }, [stockOwnerList]);

    const onStockOwnerChange = (e: any) => {
        setChoosenStockOwner(e);
    };

    // Article list autocomplete
    const articleFilter = choosenStockOwner
        ? { stockOwnerId: `${choosenStockOwner}`, name: `${articleName}%` }
        : { name: `${articleName}%` };
    const articleData = useArticleIds(articleFilter, 1, 100, null);

    useEffect(() => {
        const formValue = form.getFieldsValue(true);
        aId ? form.setFieldsValue({ ...formValue, articleId: aId }) : { formValue };
    }, [aId]);

    useEffect(() => {
        if (articleData.data) {
            const newIdOpts: Array<IOption> = [];
            articleData.data.articles?.results.forEach(({ id, name }) => {
                if (form.getFieldsValue(true).articleId === id) {
                    setArticleName(name!);
                    setAId(id!);
                }
                newIdOpts.push({ value: name!, id: id! });
            });
            setAIdOptions(newIdOpts);
        }
    }, [articleName, articleData.data]);

    const onChange = (data: string) => {
        setArticleName(data);
    };

    // Block list
    const blocksList = useSimpleGetAllBLocksQuery<Partial<SimpleGetAllBLocksQuery>, Error>(
        graphqlRequestClient,
        {
            itemsPerPage: 1000
        }
    );

    useEffect(() => {
        if (blocksList) {
            setBlocks(blocksList?.data?.blocks?.results);
        }
    }, [blocksList]);

    const onEmptyLocationChange = (e: CheckboxChangeEvent) => {
        form.setFieldsValue({ emptyLocation: e.target.checked });
    };

    //section to handle relation ship between locations-related fields
    //chose block
    const [blockToSearch, setBlockToSearch] = useState<any>(null);
    const onBlockChange = (id: string) => {
        setBlockToSearch(id);

        form.setFieldsValue({
            originalAisle: undefined,
            originalColumn: undefined,
            originalLevel: undefined,
            originalPosition: undefined,
            finalAisle: undefined,
            finalColumn: undefined,
            finalLevel: undefined,
            finalPosition: undefined,
        });

        setOriginAisleToSearch(undefined);
        setOriginColumnToSearch(undefined);
        setOriginLevelToSearch(undefined);
        setOriginPositionToSearch(undefined);
        setFinalAisleToSearch(undefined);
        setFinalColumnToSearch(undefined);
        setFinalLevelToSearch(undefined);
        setFinalPositionToSearch(undefined);
    };

    //useStates to take the values to search at each choice
    const [originAisleToSearch, setOriginAisleToSearch] = useState<string | undefined>(undefined);
    const [finalAisleToSearch, setFinalAisleToSearch] = useState<string | undefined>(undefined);
    const [originColumnToSearch, setOriginColumnToSearch] = useState<string | undefined>(undefined);
    const [finalColumnToSearch, setFinalColumnToSearch] = useState<string | undefined>(undefined);
    const [originLevelToSearch, setOriginLevelToSearch] = useState<string | undefined>(undefined);
    const [finalLevelToSearch, setFinalLevelToSearch] = useState<string | undefined>(undefined);
    const [originPositionToSearch, setOriginPositionToSearch] = useState<string | undefined>(
        undefined
    );
    const [finalPositionToSearch, setFinalPositionToSearch] = useState<string | undefined>(
        undefined
    );

    // onChange for each location property select
    const onInputChange = (value: string, source: string, setState: any) => {
        switch (source) {
            case 'origin':
                setState(value);
                break;
            case 'final':
                setState(value);
                break;
            default:
                console.log(`No source provided.`);
        }
    };

    //request to get aisles, columns, levels and positions
    const fetchLocationsData = async (
        field: string,
        aisle?: Array<string>,
        column?: [string],
        level?: [string]
    ) => {
        const defaultFilters = { blockId: blockToSearch };
        const filters = {
            ...defaultFilters,
            ...(aisle && !aisle.includes('*') && { aisle }),
            ...(column && !column.includes('*') && { column }),
            ...(level && !level.includes('*') && { level })
        };
        const query = gql`
                query locationsInfos($filters: LocationSearchFilters!, $functions: [JSON!]) {
                    locations(filters: $filters, functions: $functions, itemsPerPage: 9999) {
                        count
                        results {
                            ${field}
                        }
                    }
                }
            `;
        const queryVariables = {
            filters,
            functions: [{ function: 'count', fields: ['id'] }]
        };

        try {
            const data = await graphqlRequestClient.request(query, queryVariables);
            return data?.locations.results
                .map((location: any) => location[field])
                .sort((a: any, b: any) => {
                    if (!isNaN(a) && !isNaN(b)) {
                        return Number(a) - Number(b);
                    }
                    return a.localeCompare(b);
                });
        } catch (error) {
            console.error('Error fetching aisle data:', error);
            return [];
        }
    };

    //list aisles
    const [aislesValueOptions, setAislesValueOptions] = useState<any>(null);
    useEffect(() => {
        if (blockToSearch) {
            fetchLocationsData('aisle').then((data: any) => {
                setAislesValueOptions(data);
                setOriginAisleToSearch(data[0]);
                setFinalAisleToSearch(data[data.length - 1]);
            });
        }
    }, [blockToSearch]);

    //list columns dynamically
    const [originColumnValueOptions, setOriginColumnValueOptions] = useState<any>(null);
    const [finalColumnValueOptions, setFinalColumnValueOptions] = useState<any>(null);
    useEffect(() => {
        if (originAisleToSearch) {
            fetchLocationsData('column', [originAisleToSearch]).then((data: any) => {
                setOriginColumnValueOptions(data);
                const current = form.getFieldValue('originalColumn');
                if (!data.includes(current)) {
                    setOriginColumnToSearch(data[0]);
                }
            });
        }
    }, [originAisleToSearch]);

    useEffect(() => {
        if (finalAisleToSearch) {
            fetchLocationsData('column', [finalAisleToSearch]).then((data: any) => {
                setFinalColumnValueOptions(data);
                setFinalColumnToSearch(data[data.length - 1]);
            });
        }
    }, [finalAisleToSearch]);

    //list levels dynamically
    const [originLevelValueOptions, setOriginLevelValueOptions] = useState<any>(null);
    const [finalLevelValueOptions, setFinalLevelValueOptions] = useState<any>(null);
    useEffect(() => {
        if (originAisleToSearch && originColumnToSearch) {
            fetchLocationsData('level', [originAisleToSearch], [originColumnToSearch]).then((data: any) => {
                setOriginLevelValueOptions(data);
                const current = form.getFieldValue('originalLevel');
                if (!data.includes(current)) {
                    setOriginLevelToSearch(data[0]);
                }
            });
        }
    }, [originAisleToSearch, originColumnToSearch]);

    useEffect(() => {
        if (finalAisleToSearch && finalColumnToSearch) {
            fetchLocationsData('level', [finalAisleToSearch], [finalColumnToSearch]).then((data: any) => {
                setFinalLevelValueOptions(data);
                setFinalLevelToSearch(data[data.length - 1]);
            });
        }
    }, [finalAisleToSearch, finalColumnToSearch]);

    //list positions dynamically
    const [originPositionValueOptions, setOriginPositionValueOptions] = useState<any>(null);
    const [finalPositionValueOptions, setFinalPositionValueOptions] = useState<any>(null);
    useEffect(() => {
        if (originAisleToSearch && originColumnToSearch && originLevelToSearch) {
            fetchLocationsData(
                'position',
                [originAisleToSearch],
                [originColumnToSearch],
                [originLevelToSearch]
            ).then((data: any) => {
                setOriginPositionValueOptions(data);
            });
        }
        if (finalAisleToSearch && finalColumnToSearch && finalLevelToSearch) {
            fetchLocationsData(
                'position',
                [finalAisleToSearch],
                [finalColumnToSearch],
                [finalLevelToSearch]
            ).then((data: any) => {
                setFinalPositionValueOptions(data);
            });
        }
    }, [
        originAisleToSearch,
        finalAisleToSearch,
        originColumnToSearch,
        finalColumnToSearch,
        originLevelToSearch,
        finalLevelToSearch
    ]);

    //list reason
    const reasonsTextList = useListConfigsForAScopeQuery(graphqlRequestClient, {
        scope: 'cycle_count_reason',
        language: router.locale
    });

    useEffect(() => {
        if (reasonsTextList) {
            setReasonsTexts(reasonsTextList?.data?.listConfigsForAScope);
        }
    }, [reasonsTextList.data]);

    //list motive
    const motivesTextList = useListParametersForAScopeQuery(graphqlRequestClient, {
        scope: 'movement_code',
        language: router.locale
    });

    useEffect(() => {
        if (motivesTextList) {
            setMotivesTexts(motivesTextList?.data?.listParametersForAScope);
        }
    }, [motivesTextList.data]);

    // TYPED SAFE ALL
    // prompt the user if they try and leave with unsaved changes
    useEffect(() => {
        const handleWindowClose = (e: BeforeUnloadEvent) => {
            if (!unsavedChanges) return;
            e.preventDefault();
            return (e.returnValue = t('messages:confirm-leaving-page'));
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

    // handle call back on Cycle Count Type change for displays
    const handleCycleCountTypeChange = (value: any) => {
        setArticleDisplayGroup(false);
        setLocationDisplayGroup(false);
        setEmptyLocationDisplayGroup(false);
        setStockMiniDisplayGroup(false);
        switch (value) {
            case configs.CYCLE_COUNT_TYPE_PRODUCT:
                setArticleDisplayGroup(true);
                break;
            case configs.CYCLE_COUNT_TYPE_LOCATION:
                setLocationDisplayGroup(true);
                setEmptyLocationDisplayGroup(true);
                break;
            case configs.CYCLE_COUNT_TYPE_EMPTY_LOCATION:
                setLocationDisplayGroup(true);
                break;
            case configs.CYCLE_COUNT_TYPE_STOCK_MINI:
                setLocationDisplayGroup(true);
                setStockMiniDisplayGroup(true);
                break;
            default:
                break;
        }
    };

    const [isCCCreationLoading, setIsCCCreationLoading] = useState(false);
    // call cycleCountCreation function
    async function createCC(functionName: string, formData: any) {
        setIsCCCreationLoading(true);
        const query = gql`
            mutation executeFunction($functionName: String!, $event: JSON!) {
                executeFunction(functionName: $functionName, event: $event) {
                    status
                    output
                }
            }
        `;

        const variables = {
            functionName,
            event: {
                input: formData
            }
        };

        try {
            const cc_result = await graphqlRequestClient.request(query, variables);
            if (cc_result.executeFunction.status === 'ERROR') {
                showError(cc_result.executeFunction.output);
            } else if (
                cc_result.executeFunction.status === 'OK' &&
                cc_result.executeFunction.output.status === 'KO'
            ) {
                showError(t(`errors:${cc_result.executeFunction.output.output.code}`));
                console.log('Backend_message', cc_result.executeFunction.output.output);
            } else {
                showSuccess(t('messages:success-cycle-count-creation'));
                // TODO: Once backend feedback provides the created cycle count id, redirect to the cycle count detail page
                router.push(`/cycle-counts`);
            }
            setIsCCCreationLoading(false);
        } catch (error) {
            showError(t('messages:error-executing-function'));
            console.log('executeFunctionError', error);
            setIsCCCreationLoading(false);
        }
    }

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                // Here make api call of something else
                const formData = form.getFieldsValue(true);
                //tmp_formData is to avoid form infos reset when submit fails
                const tmp_formData = { ...formData };
                tmp_formData['status'] = configs.CYCLE_COUNT_STATUS_CREATED;
                if (!articleDisplayGroup) {
                    delete tmp_formData['stockOwnerId'];
                    delete tmp_formData['articleId'];
                } else if (!locationDisplayGroup) {
                    delete tmp_formData['blockId'];
                    delete tmp_formData['originalAisle'];
                    delete tmp_formData['originalColumn'];
                    delete tmp_formData['originalLevel'];
                    delete tmp_formData['originalPosition'];
                    delete tmp_formData['finalAisle'];
                    delete tmp_formData['finalColumn'];
                    delete tmp_formData['finalLevel'];
                    delete tmp_formData['finalPosition'];
                } else if (!emptyLocationDisplayGroup) {
                    delete tmp_formData['emptyLocation'];
                } else if (stockMiniDisplayGroup) {
                    delete tmp_formData['thresholdQuantity'];
                }
                delete tmp_formData['articleName'];

                let functionName: string;
                if (articleDisplayGroup) {
                    functionName = 'K_createCycleCountTypeProduct';
                } else if (locationDisplayGroup) {
                    functionName = 'create_cycle_count_type_location';
                }
                createCC(functionName!, tmp_formData);
                // createCycleCount({ input: tmp_formData });
                setUnsavedChanges(false);
            })
            .catch((err) => {
                showError(t('messages:error-creating-data'));
            });
    };

    const onCancel = () => {
        setUnsavedChanges(false);
        Modal.confirm({
            title: t('messages:confirm-leaving-page'),
            onOk: () => {
                router.push(`/cycle-counts`);
            },
            okText: t('common:bool-yes'),
            cancelText: t('common:bool-no')
        });
    };

    const originalAisle = Form.useWatch('originalAisle', form);
    const originalColumn = Form.useWatch('originalColumn', form);
    const originalLevel = Form.useWatch('originalLevel', form);
    const finalAisle = Form.useWatch('finalAisle', form);
    const finalColumn = Form.useWatch('finalColumn', form);
    const finalLevel = Form.useWatch('finalLevel', form);
    const finalPosition = Form.useWatch('finalPosition', form);

    return (
        <WrapperForm>
            <Form
                form={form}
                layout="vertical"
                scrollToFirstError
                onValuesChange={() => setUnsavedChanges(true)}
            >
                <Form.Item
                    label={t('common:model')}
                    name="model"
                    initialValue={configs.CYCLE_COUNT_MODEL_NORMAL}
                    rules={[
                        {
                            required: true,
                            message: `${t('messages:error-message-empty-input')}`
                        }
                    ]}
                >
                    <Select disabled>
                        {cycleCountModels?.map((cycleCountModel: any) => (
                            <Option key={cycleCountModel.id} value={parseInt(cycleCountModel.code)}>
                                {cycleCountModel.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item
                    label={t('common:type')}
                    name="type"
                    rules={[{ required: true, message: t('messages:error-message-empty-input') }]}
                >
                    <Select
                        placeholder={`${t('messages:please-select-a', {
                            name: t('common:type')
                        })}`}
                        onChange={handleCycleCountTypeChange}
                        allowClear
                    >
                        {cycleCountTypes?.map((type: any) => (
                            <Option key={type.code} value={parseInt(type.code)}>
                                {type.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                {articleDisplayGroup && (
                    <>
                        <Form.Item label={t('common:stock-owner')} name="stockOwnerId">
                            <Select
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('common:stock-owner')
                                })}`}
                                onChange={onStockOwnerChange}
                                allowClear
                            >
                                {stockOwners?.map((stockOwner: any) => (
                                    <Option key={stockOwner.id} value={stockOwner.id}>
                                        {stockOwner.name}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item
                            label={t('common:article')}
                            name="articleName"
                            rules={[
                                {
                                    required: articleDisplayGroup,
                                    message: t('messages:error-message-empty-input')
                                }
                            ]}
                        >
                            <AutoComplete
                                placeholder={`${t('messages:please-fill-letter-your', {
                                    name: t('d:articleName')
                                })}`}
                                style={{ width: '100%' }}
                                options={aIdOptions}
                                value={articleName}
                                filterOption={(inputValue, option) =>
                                    option!.value
                                        .toUpperCase()
                                        .indexOf(inputValue.toUpperCase()) !== -1
                                }
                                onKeyUp={(e: any) => {
                                    debounce(() => {
                                        setArticleName(e.target.value);
                                    }, 3000);
                                }}
                                onSelect={(value, option) => {
                                    setAId(option.id);
                                    setArticleName(value);
                                }}
                                allowClear
                                onChange={onChange}
                            />
                        </Form.Item>
                    </>
                )}
                {locationDisplayGroup && (
                    <>
                        <Form.Item
                            label={t('d:block')}
                            name="blockId"
                            rules={[
                                {
                                    required: locationDisplayGroup,
                                    message: `${t('messages:error-message-select-a', {
                                        name: t('d:block')
                                    })}`
                                }
                            ]}
                        >
                            <Select
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('d:block')
                                })}`}
                                onChange={onBlockChange}
                                allowClear
                                showSearch
                                filterOption={(inputValue, option) =>
                                    option!.props.children
                                        .toUpperCase()
                                        .indexOf(inputValue.toUpperCase()) !== -1
                                }
                            >
                                {blocks?.map((block: any) => (
                                    <Option key={block.id} value={block.id}>
                                        {block.name}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Row style={{ marginBottom: '8px' }}>
                            <Col span={12} style={{ paddingRight: '8px' }}>
                                <Card type="inner" title={t('common:from')}>
                                    <Form.Item
                                        label={t('d:originAisle')}
                                        name="originalAisle"
                                        rules={[
                                            {
                                                required: locationDisplayGroup,
                                                message: `${t(
                                                    'messages:error-message-empty-input'
                                                )}`
                                            }
                                        ]}
                                    >
                                        <Select
                                            placeholder={`${t('messages:please-select-an', {
                                                name: t('d:aisle')
                                            })}`}
                                            showSearch
                                            filterOption={(inputValue, option) =>
                                                option!.props.children
                                                    .toUpperCase()
                                                    .indexOf(inputValue.toUpperCase()) !== -1
                                            }
                                            onChange={(value: string) => {
                                                onInputChange(
                                                    value,
                                                    'origin',
                                                    setOriginAisleToSearch
                                                );
                                                if (value === '*') {
                                                    form.setFieldsValue({ finalAisle: '*' });
                                                    onInputChange(
                                                        '*',
                                                        'final',
                                                        setFinalAisleToSearch
                                                    );
                                                } else if (
                                                    form.getFieldValue('finalAisle') === '*'
                                                ) {
                                                    const last =
                                                        aislesValueOptions?.[
                                                            aislesValueOptions.length - 1
                                                        ];
                                                    form.setFieldsValue({ finalAisle: last });
                                                    onInputChange(
                                                        last,
                                                        'final',
                                                        setFinalAisleToSearch
                                                    );
                                                }
                                            }}
                                            allowClear
                                            disabled={blockToSearch ? false : true}
                                        >
                                            <Option key="*" value="*">
                                                *
                                            </Option>
                                            {aislesValueOptions?.map((aisle: any) => (
                                                <Option key={aisle} value={aisle}>
                                                    {aisle}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                    <Form.Item
                                        label={t('d:originColumn')}
                                        name="originalColumn"
                                        rules={[
                                            {
                                                required: locationDisplayGroup,
                                                message: `${t(
                                                    'messages:error-message-empty-input'
                                                )}`
                                            }
                                        ]}
                                    >
                                        <Select
                                            placeholder={`${t('messages:please-select-a', {
                                                name: t('d:column')
                                            })}`}
                                            showSearch
                                            filterOption={(inputValue, option) =>
                                                option!.props.children
                                                    .toUpperCase()
                                                    .indexOf(inputValue.toUpperCase()) !== -1
                                            }
                                            onChange={(value: string) => {
                                                onInputChange(
                                                    value,
                                                    'origin',
                                                    setOriginColumnToSearch
                                                );
                                                if (value === '*') {
                                                    form.setFieldsValue({ finalColumn: '*' });
                                                    onInputChange(
                                                        '*',
                                                        'final',
                                                        setFinalColumnToSearch
                                                    );
                                                } else if (
                                                    form.getFieldValue('finalColumn') === '*'
                                                ) {
                                                    const last =
                                                        originColumnValueOptions?.[
                                                            originColumnValueOptions.length - 1
                                                        ];
                                                    form.setFieldsValue({ finalColumn: last });
                                                    onInputChange(
                                                        last,
                                                        'final',
                                                        setFinalColumnToSearch
                                                    );
                                                }
                                            }}
                                            allowClear
                                            disabled={!originalAisle || !blockToSearch}
                                        >
                                            <Option key="*" value="*">
                                                *
                                            </Option>
                                            {originColumnValueOptions?.map((column: any) => (
                                                <Option key={column} value={column}>
                                                    {column}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                    <Form.Item
                                        label={t('d:originLevel')}
                                        name="originalLevel"
                                        rules={[
                                            {
                                                required: locationDisplayGroup,
                                                message: `${t(
                                                    'messages:error-message-empty-input'
                                                )}`
                                            }
                                        ]}
                                    >
                                        <Select
                                            placeholder={`${t('messages:please-select-a', {
                                                name: t('d:level')
                                            })}`}
                                            showSearch
                                            filterOption={(inputValue, option) =>
                                                option!.props.children
                                                    .toUpperCase()
                                                    .indexOf(inputValue.toUpperCase()) !== -1
                                            }
                                            onChange={(value: string) => {
                                                onInputChange(
                                                    value,
                                                    'origin',
                                                    setOriginLevelToSearch
                                                );
                                                if (value === '*') {
                                                    form.setFieldsValue({ finalLevel: '*' });
                                                    onInputChange(
                                                        '*',
                                                        'final',
                                                        setFinalLevelToSearch
                                                    );
                                                } else if (
                                                    form.getFieldValue('finalLevel') === '*'
                                                ) {
                                                    const last =
                                                        originLevelValueOptions?.[
                                                            originLevelValueOptions.length - 1
                                                        ];
                                                    form.setFieldsValue({ finalLevel: last });
                                                    onInputChange(
                                                        last,
                                                        'final',
                                                        setFinalLevelToSearch
                                                    );
                                                }
                                            }}
                                            allowClear
                                            disabled={!originalColumn || !blockToSearch}
                                        >
                                            <Option key="*" value="*">
                                                *
                                            </Option>
                                            {originLevelValueOptions?.map((level: any) => (
                                                <Option key={level} value={level}>
                                                    {level}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                    <Form.Item
                                        label={t('d:originPosition')}
                                        name="originalPosition"
                                        rules={[
                                            {
                                                required: locationDisplayGroup,
                                                message: `${t(
                                                    'messages:error-message-empty-input'
                                                )}`
                                            }
                                        ]}
                                    >
                                        <Select
                                            placeholder={`${t('messages:please-select-a', {
                                                name: t('d:position')
                                            })}`}
                                            showSearch
                                            filterOption={(inputValue, option) =>
                                                option!.props.children
                                                    .toUpperCase()
                                                    .indexOf(inputValue.toUpperCase()) !== -1
                                            }
                                            onChange={(value: string) => {
                                                onInputChange(
                                                    value,
                                                    'origin',
                                                    setOriginPositionToSearch
                                                );
                                                if (value === '*') {
                                                    form.setFieldsValue({ finalPosition: '*' });
                                                    onInputChange(
                                                        '*',
                                                        'final',
                                                        setFinalPositionToSearch
                                                    );
                                                } else if (
                                                    form.getFieldValue('finalPosition') === '*'
                                                ) {
                                                    const last =
                                                        originPositionValueOptions?.[
                                                            originPositionValueOptions.length - 1
                                                        ];
                                                    form.setFieldsValue({ finalPosition: last });
                                                    onInputChange(
                                                        last,
                                                        'final',
                                                        setFinalPositionToSearch
                                                    );
                                                }
                                            }}
                                            allowClear
                                            disabled={!originalLevel || !blockToSearch}
                                        >
                                            <Option key="*" value="*">
                                                *
                                            </Option>
                                            {originPositionValueOptions?.map((position: any) => (
                                                <Option key={position} value={position}>
                                                    {position}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                </Card>
                            </Col>
                            <Col span={12} style={{ paddingRight: '8px' }}>
                                <Card type="inner" title={t('common:to')}>
                                    <Form.Item
                                        label={t('d:finalAisle')}
                                        name="finalAisle"
                                        rules={[
                                            {
                                                required: locationDisplayGroup,
                                                message: `${t(
                                                    'messages:error-message-empty-input'
                                                )}`
                                            }
                                        ]}
                                    >
                                        <Select
                                            placeholder={`${t('messages:please-select-an', {
                                                name: t('d:aisle')
                                            })}`}
                                            showSearch
                                            filterOption={(inputValue, option) =>
                                                option!.props.children
                                                    .toUpperCase()
                                                    .indexOf(inputValue.toUpperCase()) !== -1
                                            }
                                            onChange={(value: string) => {
                                                onInputChange(
                                                    value,
                                                    'final',
                                                    setFinalAisleToSearch
                                                );
                                                if (value === '*') {
                                                    form.setFieldsValue({ originalAisle: '*' });
                                                    onInputChange(
                                                        '*',
                                                        'origin',
                                                        setOriginAisleToSearch
                                                    );
                                                } else if (
                                                    form.getFieldValue('originalAisle') === '*'
                                                ) {
                                                    const first = aislesValueOptions?.[0];
                                                    form.setFieldsValue({ originalAisle: first });
                                                    onInputChange(
                                                        first,
                                                        'origin',
                                                        setOriginAisleToSearch
                                                    );
                                                }
                                            }}
                                            allowClear
                                            disabled={(blockToSearch ? false : true) || finalAisle == '*'}
                                        >
                                            {aislesValueOptions?.map((aisle: any) => (
                                                <Option key={aisle} value={aisle}>
                                                    {aisle}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                    <Form.Item
                                        label={t('d:finalColumn')}
                                        name="finalColumn"
                                        rules={[
                                            {
                                                required: locationDisplayGroup,
                                                message: `${t(
                                                    'messages:error-message-empty-input'
                                                )}`
                                            }
                                        ]}
                                    >
                                        <Select
                                            placeholder={`${t('messages:please-select-a', {
                                                name: t('d:column')
                                            })}`}
                                            showSearch
                                            filterOption={(inputValue, option) =>
                                                option!.props.children
                                                    .toUpperCase()
                                                    .indexOf(inputValue.toUpperCase()) !== -1
                                            }
                                            onChange={(value: string) => {
                                                onInputChange(
                                                    value,
                                                    'final',
                                                    setFinalColumnToSearch
                                                );
                                                if (value === '*') {
                                                    form.setFieldsValue({ originalColumn: '*' });
                                                    onInputChange(
                                                        '*',
                                                        'origin',
                                                        setOriginColumnToSearch
                                                    );
                                                } else if (
                                                    form.getFieldValue('originalColumn') === '*'
                                                ) {
                                                    const first = finalColumnValueOptions?.[0];
                                                    form.setFieldsValue({ originalColumn: first });
                                                    onInputChange(
                                                        first,
                                                        'origin',
                                                        setOriginColumnToSearch
                                                    );
                                                }
                                            }}
                                            allowClear
                                            disabled={(!finalAisle || !blockToSearch) || finalColumn == '*'}
                                        >
                                            {finalColumnValueOptions?.map((column: any) => (
                                                <Option key={column} value={column}>
                                                    {column}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                    <Form.Item
                                        label={t('d:finalLevel')}
                                        name="finalLevel"
                                        rules={[
                                            {
                                                required: locationDisplayGroup,
                                                message: `${t(
                                                    'messages:error-message-empty-input'
                                                )}`
                                            }
                                        ]}
                                    >
                                        <Select
                                            placeholder={`${t('messages:please-select-a', {
                                                name: t('d:level')
                                            })}`}
                                            showSearch
                                            filterOption={(inputValue, option) =>
                                                option!.props.children
                                                    .toUpperCase()
                                                    .indexOf(inputValue.toUpperCase()) !== -1
                                            }
                                            onChange={(value: string) => {
                                                onInputChange(
                                                    value,
                                                    'final',
                                                    setFinalLevelToSearch
                                                );
                                                if (value === '*') {
                                                    form.setFieldsValue({ originalLevel: '*' });
                                                    onInputChange(
                                                        '*',
                                                        'origin',
                                                        setOriginLevelToSearch
                                                    );
                                                } else if (
                                                    form.getFieldValue('originalLevel') === '*'
                                                ) {
                                                    const first = finalLevelValueOptions?.[0];
                                                    form.setFieldsValue({ originalLevel: first });
                                                    onInputChange(
                                                        first,
                                                        'origin',
                                                        setOriginLevelToSearch
                                                    );
                                                }
                                            }}
                                            allowClear
                                            disabled={(!finalColumn || !blockToSearch) || finalLevel == '*'}
                                        >
                                            {finalLevelValueOptions?.map((level: any) => (
                                                <Option key={level} value={level}>
                                                    {level}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                    <Form.Item
                                        label={t('d:finalPosition')}
                                        name="finalPosition"
                                        rules={[
                                            {
                                                required: locationDisplayGroup,
                                                message: `${t(
                                                    'messages:error-message-empty-input'
                                                )}`
                                            }
                                        ]}
                                    >
                                        <Select
                                            placeholder={`${t('messages:please-select-a', {
                                                name: t('d:position')
                                            })}`}
                                            showSearch
                                            filterOption={(inputValue, option) =>
                                                option!.props.children
                                                    .toUpperCase()
                                                    .indexOf(inputValue.toUpperCase()) !== -1
                                            }
                                            onChange={(value: string) => {
                                                onInputChange(
                                                    value,
                                                    'final',
                                                    setFinalPositionToSearch
                                                );
                                                if (value === '*') {
                                                    form.setFieldsValue({
                                                        originalPosition: '*'
                                                    });
                                                    onInputChange(
                                                        '*',
                                                        'origin',
                                                        setOriginPositionToSearch
                                                    );
                                                } else if (
                                                    form.getFieldValue('originalPosition') ===
                                                    '*'
                                                ) {
                                                    const first = finalPositionValueOptions?.[0];
                                                    form.setFieldsValue({
                                                        originalPosition: first
                                                    });
                                                    onInputChange(
                                                        first,
                                                        'origin',
                                                        setOriginPositionToSearch
                                                    );
                                                }
                                            }}
                                            allowClear
                                            disabled={(!finalLevel || !blockToSearch) || finalPosition == '*'}
                                        >
                                            {finalPositionValueOptions?.map((position: any) => (
                                                <Option key={position} value={position}>
                                                    {position}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                </Card>
                            </Col>
                        </Row>
                        {emptyLocationDisplayGroup && (
                            <Form.Item name="emptyLocation" initialValue={false}>
                                <Checkbox onChange={onEmptyLocationChange}>
                                    {t('d:emptyLocation')}
                                </Checkbox>
                            </Form.Item>
                        )}
                        {stockMiniDisplayGroup && (
                            <>
                                <Form.Item
                                    label={t('d:thresholdQuantity')}
                                    name="thresholdQuantity"
                                    initialValue={10}
                                    rules={[
                                        {
                                            required: stockMiniDisplayGroup,
                                            message: `${t('messages:error-message-empty-input')}`
                                        }
                                    ]}
                                >
                                    <InputNumber min={1} precision={0} />
                                </Form.Item>
                            </>
                        )}
                    </>
                )}
                {/* 2023/11/29 This part of code has been commented on FCT demand
                <Form.Item label={t('d:reason')} name="reason">
                    <Select
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:reason')
                        })}`}
                        allowClear
                    >
                        {reasonsTexts?.map((category: any) => (
                            <Option key={category.id} value={parseInt(category.code)}>
                                {category.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item label={t('d:motive')} name="motive">
                    <Select
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:motive')
                        })}`}
                        allowClear
                    >
                        {motivesTexts?.map((category: any) => (
                            <Option key={category.id} value={parseInt(category.code)}>
                                {category.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>*/}

                {/* 29/09/202 - The backend functions for emptyLocation, nbDays and stockMini will be deployed later on.
                <Form.Item label={t('d:number-of-days')} name="numberOfDays">
                    <InputNumber />
                </Form.Item> */}
            </Form>
            <div style={{ textAlign: 'center' }}>
                <Space>
                    <Button type="primary" loading={isCCCreationLoading} onClick={onFinish}>
                        {t('actions:submit')}
                    </Button>
                    <Button onClick={onCancel}>{t('actions:cancel')}</Button>
                </Space>
            </div>
        </WrapperForm>
    );
};