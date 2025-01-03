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
import { Button, Input, Form, InputNumber, AutoComplete, Select, Modal, Space } from 'antd';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import {
    showError,
    showSuccess,
    showInfo,
    useOrderLineIds,
    useArticles,
    useArticleLus
} from '@helpers';
import { debounce } from 'lodash';
import configs from '../../../../common/configs.json';
import {
    CreateOrderLineMutation,
    CreateOrderLineMutationVariables,
    GetThirdPartiesQuery,
    useCreateOrderLineMutation,
    useGetThirdPartiesQuery,
    useListParametersForAScopeQuery
} from 'generated/graphql';
import { gql } from 'graphql-request';
import { FormOptionType } from 'models/ModelsV2';
import TextArea from 'antd/lib/input/TextArea';

const { Option } = Select;

interface IOption {
    value: string;
    id: string;
}

export interface ISingleItemProps {
    orderId: string | any;
    orderName: string | any;
    stockOwnerId: string | any;
    stockOwnerName: string | any;
    thirdPartyId: any;
    priceType: number | any;
    routeOnCancel?: string;
}

export const AddCustomerOrderLineForm = (props: ISingleItemProps) => {
    const { t } = useTranslation('common');
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();

    // TEXTS TRANSLATION ( REFACTORING POSSIBLE / EXPORT / DON'T KNOW YET )
    const article = t('d:article');
    const articleLu = t('d:articleLu');
    const lineNumber = t('d:lineNumber');
    const unitPriceIncludingTaxes = t('d:unitPriceIncludingTaxes');
    const unitPriceExcludingTaxes = t('d:unitPriceExcludingTaxes');
    const vatRate = t('d:vatRate');
    const customerOrder = t('common:customer-order');
    const orderedQuantity = t('d:orderedQuantity');
    const stockStatus = t('d:stockStatus');
    const comment = t('d:comment');
    const errorMessageEmptyInput = t('messages:error-message-empty-input');
    const errorMessageNegativeNumberInput = t('messages:select-number-min', { min: 0 });
    const genericArticleComment = t('d:genericArticleComment');
    const submit = t('actions:submit');
    // END TEXTS TRANSLATION

    // TYPED SAFE ALL
    const [form] = Form.useForm();
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const [aIdOptions, setAIdOptions] = useState<Array<IOption>>([]);
    const [aId, setAId] = useState<string>();
    const [articleName, setArticleName] = useState<string>('');
    const [vatRates, setVatRates] = useState<any>();
    const [thirdPartyData, setThirdPartyData] = useState<any>();
    const [enteredQuantity, setEnteredQuantity] = useState<number | null>();
    const [articleVatRate, setArticleVatRate] = useState<number | null | undefined>();
    const [articleLus, setArticleLus] = useState<any>();
    const [articleCubingType, setArticleCubingType] = useState<any>();
    const [stockStatuses, setStockStatuses] = useState<Array<FormOptionType>>();
    const customerOrderLines = useOrderLineIds({ orderId: `${props.orderId}%` }, 1, 100, null);

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
    // PARAMETER : stock_status
    const stockStatusList = useListParametersForAScopeQuery(graphqlRequestClient, {
        language: router.locale,
        scope: 'stock_statuses'
    });
    useEffect(() => {
        if (stockStatusList) {
            const newStockStatus: Array<FormOptionType> = [];

            const parameters = stockStatusList?.data?.listParametersForAScope;
            if (parameters) {
                parameters.forEach((item) => {
                    newStockStatus.push({ key: parseInt(item.code), text: item.text });
                });
                setStockStatuses(newStockStatus);
            }
        }
    }, [stockStatusList.data]);

    //LineNumber assignement
    useEffect(() => {
        const receivedList = customerOrderLines?.data?.orderLines?.results.map(
            (e: any) => e.lineNumber
        );
        if (receivedList && receivedList?.length != 0) {
            form.setFieldsValue({ lineNumber: Math.max(...receivedList) + 1 });
        } else {
            form.setFieldsValue({ lineNumber: 1 });
        }
    }, [customerOrderLines]);

    // to render autocompleted articles list
    const articleData = useArticles({ name: `${articleName}%` }, 1, 100, null);

    useEffect(() => {
        const formValue = form.getFieldsValue(true);
        form.setFieldsValue({ ...formValue, articleId: aId, articleName: articleName });
        if (thirdPartyData?.vatEligible) {
            form.setFieldsValue({ vatRateCode: articleVatRate });
        }
    }, [aId, articleVatRate]);

    useEffect(() => {
        if (articleData.data) {
            const newIdOpts: Array<IOption> = [];
            articleData.data.articles?.results.forEach(
                ({ id, name, status, vatRateCode, cubingType, description }) => {
                    if (form.getFieldsValue(true).articleId === id) {
                        setArticleName(name!);
                        setAId(id!);
                        setArticleVatRate(vatRateCode!);
                        setArticleCubingType(cubingType!);
                    }
                    if (status != configs.ARTICLE_STATUS_CLOSED) {
                        newIdOpts.push({ value: name!, id: id! });
                    }
                }
            );
            setAIdOptions(newIdOpts);
        }
    }, [articleName, articleData.data]);

    const onChange = (data: string) => {
        setArticleName(data);
        // if we clear the select, we clear the form
        if (data === null || data === undefined) {
            form.setFieldsValue({
                articleLuId: null,
                orderedQuantity: null
            });
            setArticleLus(undefined);
        }
    };

    const onQuantityChange = (data: number | null) => {
        setEnteredQuantity(data);
    };

    // to retrieve default price from third party and article

    const getPrice = async (
        articleId: string,
        priceType: number,
        quantity: number,
        thirdPartyId?: string | undefined
    ): Promise<{ [key: string]: any } | undefined> => {
        if (articleId && priceType && quantity) {
            const query = gql`
                query articlePrices($advancedFilters: [ArticlePriceAdvancedSearchFilters!]) {
                    articlePrices(advancedFilters: $advancedFilters) {
                        count
                        itemsPerPage
                        totalPages
                        results {
                            id
                            price
                        }
                    }
                }
            `;

            const variables = {
                advancedFilters: [
                    { filter: [{ searchType: 'EQUAL', field: { articleId } }] },
                    { filter: [{ searchType: 'EQUAL', field: { priceType } }] },
                    { filter: [{ searchType: 'INFERIOR_OR_EQUAL', field: { quantity } }] },
                    {
                        filter: [
                            { searchType: 'EQUAL', field: { thirdPartyId } },
                            { searchType: 'EQUAL', field: { thirdPartyId: '**null**' } }
                        ]
                    }
                ],
                orderBy: [{ field: quantity }, { field: thirdPartyId }]
            };
            const articlePrice = await graphqlRequestClient.request(query, variables);

            return articlePrice;
        }
    };

    useEffect(() => {
        async function fetchData() {
            const result = await getPrice(
                aId!,
                props.priceType,
                enteredQuantity!,
                thirdPartyData?.id
            );
            if (result)
                form.setFieldsValue({
                    unitPriceExcludingTaxes: result?.articlePrices?.results[0]?.price
                });
        }
        fetchData();
    }, [aId, enteredQuantity]);

    // retrive thirdParty info
    const thirdPartiesList = useGetThirdPartiesQuery<Partial<GetThirdPartiesQuery>, Error>(
        graphqlRequestClient,
        {
            filters: {
                id: props.thirdPartyId
            },
            orderBy: null,
            page: 1,
            itemsPerPage: 100
        }
    );

    useEffect(() => {
        if (thirdPartiesList) {
            const cData = thirdPartiesList?.data?.thirdParties?.results;
            if (cData) {
                setThirdPartyData(cData[0]);
            }
        }
    }, [thirdPartiesList.data]);

    //To render Simple vat rates list
    const vatRatesList = useListParametersForAScopeQuery(graphqlRequestClient, {
        scope: 'vat_rate',
        language: router.locale
    });

    useEffect(() => {
        if (vatRatesList) {
            setVatRates(vatRatesList?.data?.listParametersForAScope);
        }
    }, [vatRatesList.data]);

    // Retrieve articleLus list

    const articleLuData = useArticleLus({ articleId: `${aId}%` }, 1, 100, null);
    useEffect(() => {
        if (articleLuData.data) {
            const newIdOpts: Array<FormOptionType> = [];
            articleLuData.data.articleLus?.results.forEach(({ id, name }) => {
                newIdOpts.push({ text: name!, key: id! });
            });
            setArticleLus(newIdOpts);
        }
    }, [articleLuData.data]);

    const handleArticleLuChange = (key: any, value: any) => {
        // if we clear the select, we clear the form
        if (value === null || value === undefined) {
            form.setFieldsValue({
                orderedQuantity: null
            });
        }

        // if we select a new value, we fill the form
        if (articleLuData.data) {
            articleLuData.data.articleLus?.results.forEach((alu: any) => {
                if (alu.id == key) {
                    form.setFieldsValue({
                        orderedQuantity: alu?.quantity
                    });
                }
            });
        }
    };

    //CREATE delivery line
    const { mutate, isPending: createLoading } = useCreateOrderLineMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: CreateOrderLineMutation,
                _variables: CreateOrderLineMutationVariables,
                _context: any
            ) => {
                setUnsavedChanges(false);
                router.push(`/customer-orders/${props.orderId}`);
                showSuccess(t('messages:success-created'));
            },
            onError: (err) => {
                showError(t('messages:error-creating-data'));
            }
        }
    );

    const createOrderLine = ({ input }: CreateOrderLineMutationVariables) => {
        mutate({ input });
    };

    //to retrieve selectedVatRate value
    const getVatRate = async (
        selectedCode: string
    ): Promise<{ [key: string]: any } | undefined> => {
        const query = gql`
            query vatRateParameters($filters: ParameterSearchFilters) {
                parameters(filters: $filters) {
                    results {
                        id
                        value
                        code
                    }
                }
            }
        `;

        const variables = {
            filters: { scope: 'vat_rate', code: selectedCode }
        };

        const vatRate = await graphqlRequestClient.request(query, variables);
        return vatRate;
    };

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                // Here make api call of something else
                const formData = form.getFieldsValue(true);

                delete formData.orderName;
                delete formData.stockOwnerName;
                delete formData.articleName;
                delete formData.articleLuId;

                createOrderLine({ input: formData });
                setUnsavedChanges(false);
            })
            .catch((err) => {
                console.log(err);

                showError(t('messages:error-creating-data'));
            });
    };

    useEffect(() => {
        const tmp_details = {
            orderId: props.orderId,
            orderName: props.orderName,
            status: configs.DELIVERY_STATUS_CREATED,
            toBeCubed: true,
            stockOwnerId: props.stockOwnerId,
            stockOwnerName: props.stockOwnerName
        };
        form.setFieldsValue(tmp_details);
        if (createLoading) {
            showInfo(t('messages:info-create-wip'));
        }
    }, [createLoading]);

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

    return (
        <WrapperForm>
            <Form
                form={form}
                layout="vertical"
                scrollToFirstError
                onValuesChange={() => {
                    setUnsavedChanges(true);
                }}
            >
                <Form.Item
                    label={t('d:stockOwner_name')}
                    name="stockOwnerName"
                    rules={[{ required: true, message: errorMessageEmptyInput }]}
                >
                    <Input disabled />
                </Form.Item>
                <Form.Item label={customerOrder} name="orderName">
                    <Input disabled />
                </Form.Item>
                <Form.Item label={lineNumber} name="lineNumber">
                    <InputNumber disabled />
                </Form.Item>
                <Form.Item
                    label={article}
                    name="articleName"
                    rules={[{ required: true, message: errorMessageEmptyInput }]}
                >
                    <AutoComplete
                        placeholder={`${t('messages:please-fill-letter-your', {
                            name: t('d:articleName')
                        })}`}
                        style={{ width: '100%' }}
                        options={aIdOptions}
                        value={articleName}
                        filterOption={(inputValue, option) =>
                            option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                        }
                        onKeyUp={(e: any) => {
                            debounce(() => {
                                setArticleName(e.target.value);
                            }, 3000);
                        }}
                        onSelect={(value, option) => {
                            setAId(option.id);
                            setArticleName(value);
                            const articleInfos = articleData.data?.articles?.results.find(
                                (e) => e.id === option.id
                            );
                            setArticleVatRate(articleInfos?.vatRateCode);
                            setArticleCubingType(articleInfos?.cubingType);
                        }}
                        allowClear
                        onChange={onChange}
                    />
                </Form.Item>
                {articleCubingType !== configs.ARTICLE_CUBING_TYPE_COMMENT ? (
                    <>
                        <Form.Item label={articleLu} name="articleLuId">
                            <Select
                                allowClear
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('d:articleLu')
                                })}`}
                                onChange={handleArticleLuChange}
                            >
                                {articleLus?.map((lu: any) => (
                                    <Option key={lu.key} value={lu.key}>
                                        {lu.text}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item
                            label={orderedQuantity}
                            name="orderedQuantity"
                            rules={[
                                { required: false, message: errorMessageEmptyInput },
                                { type: 'number', min: 0, message: errorMessageNegativeNumberInput }
                            ]}
                        >
                            <InputNumber onChange={onQuantityChange} />
                        </Form.Item>
                        <Form.Item
                            label={unitPriceExcludingTaxes}
                            name="unitPriceExcludingTaxes"
                            rules={[
                                { type: 'number', min: 0, message: errorMessageNegativeNumberInput }
                            ]}
                        >
                            <InputNumber />
                        </Form.Item>
                        <Form.Item name="vatRateCode" label={vatRate}>
                            <Select
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('d:vatRate')
                                })}`}
                                allowClear
                            >
                                <Option value=""> </Option>
                                {vatRates?.map((vatRate: any) => (
                                    <Option key={vatRate.id} value={parseInt(vatRate.code)}>
                                        {vatRate.text}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item label={t('d:discount_percent')} name="discount" initialValue={0}>
                            <InputNumber min={0} max={100} precision={1} />
                        </Form.Item>
                        <Form.Item name="stockStatus" label={stockStatus}>
                            <Select
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('d:stockStatus')
                                })}`}
                                allowClear
                            >
                                <Option value=""> </Option>
                                {stockStatuses?.map((stockStatus: any) => (
                                    <Option key={stockStatus.key} value={stockStatus.key}>
                                        {stockStatus.text}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item label={comment} name="comment">
                            <Input />
                        </Form.Item>
                    </>
                ) : (
                    <Form.Item label={genericArticleComment} name="genericArticleComment">
                        <TextArea />
                    </Form.Item>
                )}
            </Form>
            <div style={{ textAlign: 'center' }}>
                <Space>
                    <Button type="primary" loading={createLoading} onClick={onFinish}>
                        {submit}
                    </Button>
                    <Button onClick={onCancel}>{t('actions:cancel')}</Button>
                </Space>
            </div>
        </WrapperForm>
    );
};
