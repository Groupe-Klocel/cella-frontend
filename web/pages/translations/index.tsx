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

import React, { FC, useCallback, useEffect, useRef, useState } from 'react';
import { DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Form, Input, Modal, Popconfirm, Table, Select, Space } from 'antd';
import type { InputRef, TableProps, TableColumnType } from 'antd';
import type { FilterDropdownProps, FilterValue } from 'antd/es/table/interface';
import MainLayout from 'components/layouts/MainLayout';
import { AppHead, HeaderContent } from '@components';
import {
    DataQueryType,
    DEFAULT_ITEMS_PER_PAGE,
    DEFAULT_PAGE_NUMBER,
    META_DEFAULTS,
    PaginationType,
    showError,
    showSuccess,
    useList
} from '@helpers';
import { HeaderData } from 'modules/Crud/ListComponentV2';
import { translationsRoutes as itemRoutes } from 'modules/Translations/Static/translationsRoutes';
import {
    CreateTranslationMutation,
    CreateTranslationMutationVariables,
    DeleteTranslationMutation,
    DeleteTranslationMutationVariables,
    TranslationFieldName,
    UpdateTranslationMutation,
    UpdateTranslationMutationVariables,
    useCreateTranslationMutation,
    useDeleteTranslationMutation,
    useListConfigsForAScopeQuery,
    useUpdateTranslationMutation
} from 'generated/graphql';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import { EditableCell } from 'modules/Translations/Elements/EditableCell';
import { EditableRow } from 'modules/Translations/Elements/EditableRow';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { TranslationModelV2 } from '@helpers';

type PageComponent = FC & { layout: typeof MainLayout };

interface Item {
    key: string;
    language: string;
    type: string;
    category: string;
    code: string;
    value: string;
    id?: string | null;
}

type DataIndex = keyof Item;

interface DataType {
    id: string;
    language: string;
    type: string;
    category: string;
    code: string;
    value: string;
    warehouseId?: string | null;
    created?: any;
    createdBy?: string;
    modified?: any;
    modifiedBy?: string;
    warehouse?: {
        id: string;
        name: string;
    };
}

type ColumnTypes = Exclude<TableProps<DataType>['columns'], undefined>;

const Translation: PageComponent = () => {
    const [dataSource, setDataSource] = useState<any>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const [activeEditKey, setActiveEditKey] = useState<string | null>(null);

    const [searchedColumn, setSearchedColumn] = useState('');
    const searchInput = useRef<InputRef>(null);
    const { t } = useTranslation();
    const [translationTypes, setTranslationTypes] = useState<any>();
    const [translationLanguages, setTranslationLanguages] = useState<any>();
    const [translationCategories, setTranslationCategories] = useState<any>();

    //To render translation_types from configs
    const translationTypesList = useListConfigsForAScopeQuery(graphqlRequestClient, {
        scope: 'translation_type',
        language: router.locale
    });

    useEffect(() => {
        if (translationTypesList) {
            const formattedTranslationTypes: Array<{ text: string; value: string }> = [];

            const cData = translationTypesList?.data?.listConfigsForAScope;
            if (cData) {
                cData.forEach((item) => {
                    formattedTranslationTypes.push({ text: item.code, value: item.text });
                });
                setTranslationTypes(formattedTranslationTypes);
            }
        }
    }, [translationTypesList.data]);

    //To render translation_languages from configs
    const translationLanguagesList = useListConfigsForAScopeQuery(graphqlRequestClient, {
        scope: 'translation_language',
        language: router.locale
    });

    useEffect(() => {
        if (translationLanguagesList) {
            const formattedTranslationLanguages: Array<{ text: string; value: string }> = [];

            const cData = translationLanguagesList?.data?.listConfigsForAScope;
            if (cData) {
                cData.forEach((item) => {
                    formattedTranslationLanguages.push({ text: item.code, value: item.text });
                });
                setTranslationLanguages(formattedTranslationLanguages);
            }
        }
    }, [translationLanguagesList.data]);

    //To render translation_categories from configs
    const translationCategoriesList = useListConfigsForAScopeQuery(graphqlRequestClient, {
        scope: 'translation_category',
        language: router.locale
    });

    useEffect(() => {
        if (translationCategoriesList) {
            const formattedTranslationCategories: Array<{ text: string; value: string }> = [];

            const cData = translationCategoriesList?.data?.listConfigsForAScope;
            if (cData) {
                cData.forEach((item) => {
                    formattedTranslationCategories.push({ text: item.code, value: item.text });
                });
                setTranslationCategories(formattedTranslationCategories);
            }
        }
    }, [translationCategoriesList.data]);

    const headerData: HeaderData = {
        title: `${t('common:translations')}`,
        routes: itemRoutes,
        actionsComponent: (
            <Space>
                <Button
                    onClick={() => {
                        setIsModalVisible(true);
                    }}
                    type="primary"
                >
                    {t('actions:add2', { name: t('common:translation') })}
                </Button>
                <Button
                    onClick={() => {
                        router.reload();
                    }}
                    type="primary"
                >
                    {t('actions:apply-translations')}
                </Button>
            </Space>
        )
    };

    //#region : get translations
    const defaultOrder = [
        { field: 'type' as TranslationFieldName, ascending: true },
        { field: 'language' as TranslationFieldName, ascending: true },
        { field: 'category' as TranslationFieldName, ascending: true },
        { field: 'code' as TranslationFieldName, ascending: true }
    ];

    const listFields = Object.keys(TranslationModelV2.fieldsInfo).filter(
        (key) => TranslationModelV2.fieldsInfo[key].isListRequested
    );

    let searchCriterias: any = {};

    const [search, setSearch] = useState(searchCriterias);

    const [pagination, setPagination] = useState<PaginationType>({
        total: undefined,
        current: DEFAULT_PAGE_NUMBER,
        itemsPerPage: DEFAULT_ITEMS_PER_PAGE
    });

    const {
        isLoading,
        data: translationsData,
        reload: reloadData
    } = useList(
        TranslationModelV2.resolverName,
        TranslationModelV2.endpoints.list,
        listFields,
        search,
        pagination.current,
        pagination.itemsPerPage,
        null,
        router.locale,
        defaultOrder
    );

    useEffect(() => {
        //Time delay is to avoid reload before backend has finished (100ms does not work, 200ms seems to be fine)
        const delay = 200;
        const timer = setTimeout(() => {
            reloadData();
        }, delay);

        return () => clearTimeout(timer);
    }, [search, pagination.current, pagination.itemsPerPage]);

    useEffect(() => {
        if (translationsData) {
            const listData: any = translationsData?.[TranslationModelV2.endpoints.list];
            const results = listData?.results || [];
            setDataSource(results);
            if (listData && listData['results']) {
                setRows(listData);
                setPagination({
                    ...pagination,
                    total: listData['count']
                });
            }
        }
    }, [translationsData]);

    // #region SEARCH // FILTER
    const handleSearch = (confirm: FilterDropdownProps['confirm'], dataIndex: DataIndex) => {
        confirm();
        setSearchedColumn(dataIndex);
    };

    const handleReset = (
        clearFilters: () => void,
        confirm: FilterDropdownProps['confirm'],
        dataIndex: DataIndex
    ) => {
        clearFilters();
        handleSearch(confirm, dataIndex);
    };

    const getColumnSearchProps = (dataIndex: DataIndex): TableColumnType<DataType> => ({
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }) => (
            <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
                <Input
                    ref={searchInput}
                    placeholder={`${t('messages:please-enter-a', {
                        name: t('common:code')
                    })}`}
                    value={selectedKeys[0]}
                    onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
                    onPressEnter={() => handleSearch(confirm, dataIndex)}
                    style={{ marginBottom: 8, display: 'block' }}
                />
                <Space>
                    <Button
                        type="primary"
                        onClick={() => handleSearch(confirm, dataIndex)}
                        icon={<SearchOutlined />}
                        size="small"
                    >
                        {t('actions:search')}
                    </Button>
                    <Button
                        onClick={() =>
                            clearFilters && handleReset(clearFilters, confirm, dataIndex)
                        }
                        size="small"
                    >
                        {t('actions:reset')}
                    </Button>
                    <Button
                        type="link"
                        size="small"
                        onClick={() => {
                            close();
                        }}
                    >
                        {t('actions:close')}
                    </Button>
                </Space>
            </div>
        ),
        filterIcon: (filtered: boolean) => (
            <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />
        ),
        onFilter: (value, record: any) =>
            record[dataIndex]
                .toString()
                .toLowerCase()
                .includes((value as string).toLowerCase()),
        onFilterDropdownOpenChange: (visible) => {
            if (visible) {
                setTimeout(() => searchInput.current?.select(), 100);
            }
        },
        render: (text) =>
            searchedColumn === dataIndex ? (
                <span style={{ padding: 0 }}>{text ? text.toString() : ''}</span>
            ) : (
                text
            )
    });

    // #region DEFAULTCOLUMN
    const defaultColumns: (ColumnTypes[number] & { editable?: boolean; dataIndex: string })[] = [
        {
            title: `${t('actions:actions')}`,
            dataIndex: 'actions',
            width: '5%',
            render: (_, record) =>
                dataSource.length >= 1 && record.warehouseId ? (
                    <Popconfirm
                        title={t('messages:delete-confirm')}
                        onConfirm={() => handleDelete(record.id)}
                    >
                        <Button icon={<DeleteOutlined />} danger></Button>
                    </Popconfirm>
                ) : null
        },
        {
            title: `${t('d:type')}`,
            dataIndex: 'type',
            width: '10%',
            filters: translationTypes,
            onFilter: (value, record) => record.type === value
        },
        {
            title: `${t('common:language')}`,
            dataIndex: 'language',
            width: '5%',
            filters: translationLanguages,
            onFilter: (value, record) => record.language === value
        },
        {
            title: `${t('d:category')}`,
            dataIndex: 'category',
            width: '10%',
            filters: translationCategories,
            onFilter: (value, record) => record.category === value
        },
        {
            ...getColumnSearchProps('code'),
            title: `${t('d:code')}`,
            dataIndex: 'code',
            width: '20%'
            //editable: true
        },
        {
            title: `${t('d:translation')}`,
            dataIndex: 'value',
            editable: true,
            width: '50%'
        }
    ];

    // #region CREATE
    const { mutate: create } = useCreateTranslationMutation<Error>(graphqlRequestClient, {
        onSuccess: (
            data: CreateTranslationMutation,
            _variables: CreateTranslationMutationVariables,
            _context: any
        ) => {
            reloadData();
            showSuccess(t('messages:success-created'));
        },
        onError: (err) => {
            showError(t('messages:error-creating-data'));
            console.log(err);
        }
    });

    const createTranslation = ({ input }: CreateTranslationMutationVariables) => {
        create({ input });
    };

    const handleModalOk = () => {
        form.validateFields()
            .then(() => {
                const formData = form.getFieldsValue(true);
                setIsModalVisible(false);
                createTranslation({ input: formData });
                form.resetFields();
            })
            .catch((err) => {
                console.log(err);
                showError(t('messages:error-creating-data'));
            });
    };

    const handleModalCancel = () => {
        setIsModalVisible(false);
        form.resetFields();
    };

    //#region UPDATE
    const { mutate: update } = useUpdateTranslationMutation<Error>(graphqlRequestClient, {
        onSuccess: (
            data: UpdateTranslationMutation,
            _variables: UpdateTranslationMutationVariables,
            _context: any
        ) => {
            reloadData();
            showSuccess(t('messages:success-updated'));
        },
        onError: (err: any) => {
            showError(t('messages:error-update-data'));
        }
    });

    const updateTranslation = ({ id, input }: UpdateTranslationMutationVariables) => {
        update({ id, input });
    };

    const handleSave = (row: DataType) => {
        const updated = { value: row.value };
        const rowWithoutId = JSON.parse(JSON.stringify(row));
        delete rowWithoutId.id;
        delete rowWithoutId.warehouse;

        if (row.warehouseId) {
            updateTranslation({ id: row.id, input: updated });
        } else {
            createTranslation({ input: rowWithoutId });
        }
    };

    //#region DELETE
    const { mutate: DeleteTranslations, isPending: deleteLoading } =
        useDeleteTranslationMutation<Error>(graphqlRequestClient, {
            onSuccess: (
                data: DeleteTranslationMutation,
                _variables: DeleteTranslationMutationVariables,
                _context: any
            ) => {
                showSuccess(t('messages:success-deleted'));
                reloadData();
            },
            onError: () => {
                showError(t('messages:error-delete-impossible'));
            }
        });

    const handleDelete = (id: string) => {
        DeleteTranslations({ id });
    };

    const columns = defaultColumns.map((col) => {
        if (!col.editable) {
            return col;
        }
        return {
            ...col,
            onCell: (record: DataType) => ({
                record,
                editable: col.editable,
                dataIndex: col.dataIndex,
                title: col.title,
                handleSave,
                activeEditKey,
                setActiveEditKey
            })
        };
    });

    const components = {
        body: {
            row: EditableRow,
            cell: EditableCell
        }
    };

    const [rows, setRows] = useState<DataQueryType>();

    const onChangePagination = useCallback(
        (currentPage: number, itemsPerPage: number) => {
            // Re fetch data for new current page or items per page
            setPagination({
                total: translationsData?.translations?.count,
                current: currentPage,
                itemsPerPage: itemsPerPage
            });
        },
        [setPagination, rows]
    );

    const handlePaginationChange = (page: number, pageSize: number) => {
        console.log(`Page: ${page}, Page Size: ${pageSize}`);
        onChangePagination(page, pageSize);
    };

    return (
        <>
            <AppHead title={headerData.title} />
            <HeaderContent
                title={headerData.title}
                routes={headerData.routes}
                actionsRight={headerData.actionsComponent}
            />
            <div style={{ width: '98%', margin: 'auto' }}>
                <Table<DataType>
                    components={components}
                    rowClassName={() => 'editable-row'}
                    dataSource={dataSource}
                    columns={columns as ColumnTypes}
                    onChange={(pagination, filters: Record<string, FilterValue | null>) => {
                        const newSearch = Object.keys(filters).reduce(
                            (acc, key) => {
                                const filterValue = filters[key];
                                if (filterValue) {
                                    if (key == 'code') {
                                        acc[key] = `%${filterValue[0]}%`;
                                    } else {
                                        acc[key] = filterValue;
                                    }
                                } else {
                                    acc[key] = undefined;
                                }
                                return acc;
                            },
                            {} as Record<string, any>
                        );

                        setSearch((prev: any) => ({
                            ...prev,
                            ...newSearch
                        }));
                    }}
                    locale={{
                        filterReset: `${t('actions:reset')}`,
                        filterConfirm: 'OK'
                    }}
                    pagination={
                        pagination && {
                            position: ['bottomRight'],
                            total: pagination.total,
                            current: pagination.current,
                            pageSize: pagination.itemsPerPage,
                            onChange: (page, pageSize) => {
                                handlePaginationChange(page, pageSize);
                            }
                        }
                    }
                    loading={isLoading}
                />
                <Modal
                    title={t('actions:add2', { name: t('common:translation') })}
                    open={isModalVisible}
                    onOk={handleModalOk}
                    onCancel={handleModalCancel}
                >
                    <Form form={form} layout="vertical" name="add_translation_form">
                        <Form.Item
                            name="type"
                            label={t('d:type')}
                            rules={[
                                {
                                    required: true,
                                    message: `${t('messages:error-message-empty-input')}`
                                }
                            ]}
                        >
                            <Select>
                                {translationTypes?.map((type: any) => (
                                    <Select.Option key={type.value} value={type.value}>
                                        {type.value}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item
                            name="language"
                            label={t('common:language')}
                            rules={[
                                {
                                    required: true,
                                    message: `${t('messages:error-message-empty-input')}`
                                }
                            ]}
                        >
                            <Select>
                                {translationLanguages?.map((type: any) => (
                                    <Select.Option key={type.value} value={type.value}>
                                        {type.value}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item
                            name="category"
                            label={t('d:category')}
                            rules={[
                                {
                                    required: true,
                                    message: `${t('messages:error-message-empty-input')}`
                                }
                            ]}
                        >
                            <Select>
                                {translationCategories?.map((type: any) => (
                                    <Select.Option key={type.value} value={type.value}>
                                        {type.value}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item
                            name="code"
                            label={t('d:code')}
                            rules={[
                                {
                                    required: true,
                                    message: `${t('messages:error-message-empty-input')}`
                                }
                            ]}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            name="value"
                            label={t('d:translation')}
                            rules={[
                                {
                                    required: true,
                                    message: `${t('messages:error-message-empty-input')}`
                                }
                            ]}
                        >
                            <Input />
                        </Form.Item>
                    </Form>
                </Modal>
            </div>
        </>
    );
};

Translation.layout = MainLayout;

export default Translation;
