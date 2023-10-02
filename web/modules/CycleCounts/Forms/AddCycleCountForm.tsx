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
    Input,
    InputNumber,
    Row,
    Form,
    Checkbox,
    Select,
    Modal,
    Card,
    Space
} from 'antd';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';
import { useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import {
    useSimpleGetAllStockOwnersQuery,
    SimpleGetAllStockOwnersQuery,
    SimpleGetAllBLocksQuery,
    useSimpleGetAllBLocksQuery,
    useListConfigsForAScopeQuery
} from 'generated/graphql';
import { debounce } from 'lodash';
import _ from 'lodash';
import {
    showError,
    showSuccess,
    useArticleIds,
    useLocationIds,
    DataQueryType,
    removeDuplicatesAndSort
} from '@helpers';
import { CheckboxChangeEvent } from 'antd/lib/checkbox';
import existingConfigs from '../../../../common/configs.json';
import { gql } from 'graphql-request';

const { Option } = Select;
const { TextArea } = Input;

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
    const { globalLocale } = useAppState();
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

    // Stock owner
    const stockOwnerList = useSimpleGetAllStockOwnersQuery<
        Partial<SimpleGetAllStockOwnersQuery>,
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
        graphqlRequestClient
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
    const onBlockChange = (id: string, options: any) => {
        setBlockToSearch(id);
        // form.setFieldsValue({ blockName: options?.title });
    };
    const search = blockToSearch ? { blockId: blockToSearch! } : undefined;
    const { data: locationsData } = useLocationIds(search, 1, 1000, null);

    const [locations, setLocations] = useState<DataQueryType>();

    //set reference Locations list
    useEffect(() => {
        if (locationsData && blockToSearch) {
            setLocations(locationsData?.locations);
        }
    }, [locationsData, blockToSearch]);

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
    //useStates to take the values to search at each choice
    const [originAisleToSearch, setOriginAisleToSearch] = useState<string | undefined>(undefined);
    const [finalAisleToSearch, setFinalAisleToSearch] = useState<string | undefined>(undefined);
    const [originColumnToSearch, setOriginColumnToSearch] = useState<string | undefined>(undefined);
    const [finalColumnToSearch, setFinalColumnToSearch] = useState<string | undefined>(undefined);
    const [originLevelToSearch, setOriginLevelToSearch] = useState<string | undefined>(undefined);
    const [finalLevelToSearch, setFinalLevelToSearch] = useState<string | undefined>(undefined);

    //generic filter function to generate list of values provided in select options
    function filterAndMap(locations: any, setOptions: any, filters: any, returnedData: string) {
        const dataSet = locations?.results.filter((e: any) => {
            for (const key in filters) {
                if (filters.hasOwnProperty(key)) {
                    if (filters[key] && e[key] !== filters[key]) {
                        return false;
                    }
                }
            }
            return true;
        });
        const newOpts: Array<string> = dataSet.map((e: any) => {
            return e[returnedData];
        });
        setOptions(removeDuplicatesAndSort(newOpts));
    }

    //list aisles
    const [aisleValueOptions, setAisleValueOptions] = useState<any>(null);
    useEffect(() => {
        if (locations) {
            const newOpts: Array<any> = locations.results.map(({ aisle }) => {
                return aisle!;
            });
            setAisleValueOptions(removeDuplicatesAndSort(newOpts));
        }
    }, [locations]);

    //list columns
    const [originColumnValueOptions, setOriginColumnValueOptions] = useState<any>(null);
    const [finalColumnValueOptions, setFinalColumnValueOptions] = useState<any>(null);
    useEffect(() => {
        if (originAisleToSearch) {
            filterAndMap(
                locations,
                setOriginColumnValueOptions,
                { aisle: originAisleToSearch },
                'column'
            );
        }
        if (finalAisleToSearch) {
            filterAndMap(
                locations,
                setFinalColumnValueOptions,
                { aisle: finalAisleToSearch },
                'column'
            );
        }
    }, [originAisleToSearch, finalAisleToSearch]);

    //List levels
    const [originLevelValueOptions, setOriginLevelValueOptions] = useState<any>(null);
    const [finalLevelValueOptions, setFinalLevelValueOptions] = useState<any>(null);
    useEffect(() => {
        if (originAisleToSearch && originColumnToSearch) {
            filterAndMap(
                locations,
                setOriginLevelValueOptions,
                {
                    aisle: originAisleToSearch,
                    column: originColumnToSearch
                },
                'level'
            );
        }
        if (finalAisleToSearch && finalColumnToSearch) {
            filterAndMap(
                locations,
                setFinalLevelValueOptions,
                { aisle: finalAisleToSearch, column: finalColumnToSearch },
                'level'
            );
        }
    }, [originAisleToSearch, finalAisleToSearch, originColumnToSearch, finalColumnToSearch]);

    //List positions
    const [originPositionValueOptions, setOriginPositionValueOptions] = useState<any>(null);
    const [finalPositionValueOptions, setFinalPositionValueOptions] = useState<any>(null);
    useEffect(() => {
        if (originAisleToSearch && originColumnToSearch && originLevelToSearch) {
            filterAndMap(
                locations,
                setOriginPositionValueOptions,
                {
                    aisle: originAisleToSearch,
                    column: originColumnToSearch,
                    level: originLevelToSearch
                },
                'position'
            );
        }
        if (finalAisleToSearch && finalColumnToSearch && finalLevelToSearch) {
            filterAndMap(
                locations,
                setFinalPositionValueOptions,
                {
                    aisle: finalAisleToSearch,
                    column: finalColumnToSearch,
                    level: finalLevelToSearch
                },
                'position'
            );
        }
    }, [
        originAisleToSearch,
        finalAisleToSearch,
        originColumnToSearch,
        finalColumnToSearch,
        originLevelToSearch,
        finalLevelToSearch
    ]);

    // TYPED SAFE ALL
    const [form] = Form.useForm();

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
                    functionName = 'K_createCycleCountTypeLocation';
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
                        <Form.Item
                            label={t('common:stock-owner')}
                            name="stockOwnerId"
                            rules={[
                                {
                                    required: articleDisplayGroup,
                                    message: t('messages:error-message-empty-input')
                                }
                            ]}
                        >
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
                                <Card type="inner" title={t('common:from:')}>
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
                                            onChange={(value: string) => {
                                                onInputChange(
                                                    value,
                                                    'origin',
                                                    setOriginAisleToSearch
                                                );
                                            }}
                                            allowClear
                                            disabled={blockToSearch ? false : true}
                                        >
                                            {aisleValueOptions?.map((aisle: any) => (
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
                                            onChange={(value: string) => {
                                                onInputChange(
                                                    value,
                                                    'origin',
                                                    setOriginColumnToSearch
                                                );
                                            }}
                                            allowClear
                                            disabled={
                                                blockToSearch && originAisleToSearch ? false : true
                                            }
                                        >
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
                                            onChange={(value: string) => {
                                                onInputChange(
                                                    value,
                                                    'origin',
                                                    setOriginLevelToSearch
                                                );
                                            }}
                                            allowClear
                                            disabled={
                                                blockToSearch &&
                                                originAisleToSearch &&
                                                originColumnToSearch
                                                    ? false
                                                    : true
                                            }
                                        >
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
                                            allowClear
                                            disabled={
                                                blockToSearch &&
                                                originAisleToSearch &&
                                                originColumnToSearch &&
                                                originLevelToSearch
                                                    ? false
                                                    : true
                                            }
                                        >
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
                                <Card type="inner" title={t('common:to:')}>
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
                                            onChange={(value: string) => {
                                                onInputChange(
                                                    value,
                                                    'final',
                                                    setFinalAisleToSearch
                                                );
                                            }}
                                            allowClear
                                            disabled={blockToSearch ? false : true}
                                        >
                                            {aisleValueOptions?.map((aisle: any) => (
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
                                            onChange={(value: string) => {
                                                onInputChange(
                                                    value,
                                                    'final',
                                                    setFinalColumnToSearch
                                                );
                                            }}
                                            allowClear
                                            disabled={
                                                blockToSearch && finalAisleToSearch ? false : true
                                            }
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
                                            onChange={(value: string) => {
                                                onInputChange(
                                                    value,
                                                    'final',
                                                    setFinalLevelToSearch
                                                );
                                            }}
                                            allowClear
                                            disabled={
                                                blockToSearch &&
                                                finalAisleToSearch &&
                                                finalColumnToSearch
                                                    ? false
                                                    : true
                                            }
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
                                            allowClear
                                            disabled={
                                                blockToSearch &&
                                                finalAisleToSearch &&
                                                finalColumnToSearch &&
                                                finalLevelToSearch
                                                    ? false
                                                    : true
                                            }
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
