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
import { Button, Input, Form, InputNumber, Select, Modal, Space } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useEffect, useMemo, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import { showError, showSuccess, useArticles } from '@helpers';
import configs from '../../../../common/configs.json';
import {
    GetThirdPartiesQuery,
    useGetThirdPartiesQuery,
    useListParametersForAScopeQuery
} from 'generated/graphql';
import { gql } from 'graphql-request';
import { FormOptionType } from 'models/ModelsV2';
import TextArea from 'antd/lib/input/TextArea';
import { useAppState } from 'context/AppContext';

const { Option } = Select;

interface IOption {
    value: string;
    id: string;
}

export type EditCustomerOrderLineFormProps = {
    orderLineId: string;
    details: any;
};

export const EditCustomerOrderLineForm: FC<EditCustomerOrderLineFormProps> = ({
    orderLineId,
    details
}: EditCustomerOrderLineFormProps) => {
    const { t } = useTranslation('common');
    const { graphqlRequestClient } = useAuth();
    const { parameters: appParameters, configs: appConfigs } = useAppState();
    const router = useRouter();
    const { locale } = router;
    const language = (locale === 'en-US' ? 'en' : locale) ?? 'en';

    // TEXTS TRANSLATION ( REFACTORING POSSIBLE / EXPORT / DON'T KNOW YET )
    const article = t('d:article');
    const lineNumber = t('d:lineNumber');
    const unitPriceIncludingTaxes = t('d:unitPriceIncludingTaxes');
    const unitPriceExcludingTaxes = t('d:unitPriceExcludingTaxes');
    const vatRate = t('d:vatRate');
    const customerOrder = t('common:customer-order');
    const discountTypeLabel = t('d:discount_type');
    const discountLabel = t('d:discount_percent');
    const discountAmountLabel = t('d:discount_amount');
    const orderedQuantity = t('d:orderedQuantity');
    const stockStatus = t('d:stockStatus');
    const comment = t('d:comment');
    const errorMessageEmptyInput = t('messages:error-message-empty-input');
    const errorMessageMinInputNumber = t('messages:select-number-min', { min: 0 });
    const errorMessageMaxInputNumber = t('messages:select-number-max', { max: 100 });
    const errorMessageNegativeNumberInput = t('messages:select-number-min', { min: 0 });
    const genericArticleComment = t('d:genericArticleComment');
    const submit = t('actions:submit');
    // END TEXTS TRANSLATION

    // TYPED SAFE ALL
    const [form] = Form.useForm();
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const [aId, setAId] = useState<string>(details?.articleId || '');
    const [articleName, setArticleName] = useState<string>(details?.articleName || '');
    const [vatRates, setVatRates] = useState<any>();
    const [thirdPartyData, setThirdPartyData] = useState<any>();
    const [enteredQuantity, setEnteredQuantity] = useState<number | null>();
    const [articleCubingType, setArticleCubingType] = useState<any>();
    const [stockStatuses, setStockStatuses] = useState<Array<FormOptionType>>();
    const [selectedDiscountType, setSelectedDiscountType] = useState<number | undefined>(undefined);

    const configsParamsCodes = useMemo(() => {
        const findAllByScope = (items: any[], scope: string) => {
            return items
                .filter((item: any) => item.scope === scope)
                .sort((a, b) => a.code - b.code)
                .map((item: any) => {
                    return {
                        ...item,
                        value: item.translation?.[language] || item.value
                    };
                });
        };
        const discountTypes = findAllByScope(appParameters, 'discount_type');
        return {
            discountTypes
        };
    }, [appConfigs, appParameters, language]);

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

    // to render autocompleted articles list
    const articleData = useArticles({ id: `${aId}%` }, 1, 100, null);

    useEffect(() => {
        const formValue = form.getFieldsValue(true);
        form.setFieldsValue({ ...formValue, articleId: aId, articleName: articleName });
    }, [aId]);

    useEffect(() => {
        if (articleData.data) {
            articleData.data.articles?.results.forEach(({ id, name, cubingType }) => {
                if (form.getFieldsValue(true).articleId === id) {
                    setArticleName(name!);
                    setAId(id!);
                    setArticleCubingType(cubingType!);
                }
            });
        }
    }, [articleName, articleData.data]);

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
                details.priceType,
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
                id: details.thirdPartyId
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

    const mutation = gql`
        mutation updateOrderLine($orderLineId: String!, $input: UpdateOrderLineInput!) {
            updateOrderLine(id: $orderLineId, input: $input) {
                id
            }
        }
    `;

    const updateOrderLine = async (input: any) => {
        try {
            const variables = { orderLineId: orderLineId, input: input };
            await graphqlRequestClient.request(mutation, variables);
            setUnsavedChanges(false);
            router.push(`/customer-orders/line/${orderLineId}`);
            showSuccess(t('messages:success-updated'));
        } catch (err) {
            showError(t('messages:error-updating-data'));
        }
    };

    const handleDiscountTypeSelection = (key: any, value: any) => {
        setSelectedDiscountType(parseInt(key));
        form.setFieldsValue({
            discount: null,
            discountAmount: null
        });
    };

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                // Here make api call of something else
                const formData = form.getFieldsValue(true);

                const updateInput = {
                    orderedQuantity: formData.orderedQuantity,
                    unitPriceExcludingTaxes: formData.unitPriceExcludingTaxes,
                    vatRateCode: formData.vatRateCode,
                    discountType: formData.discountType,
                    discount: formData.discount,
                    discountAmount: formData.discountAmount,
                    stockStatus: formData.stockStatus,
                    comment: formData.comment,
                    genericArticleComment: formData.genericArticleComment
                };

                updateOrderLine(updateInput);
                setUnsavedChanges(false);
            })
            .catch((err) => {
                showError(t('messages:error-creating-data'));
            });
    };

    useEffect(() => {
        const tmp_details = {
            ...details,
            stockOwnerName: details?.stockOwner?.name,
            articleName: details?.article?.name,
            orderName: details?.order?.name
        };
        delete tmp_details['id'];
        delete tmp_details['created'];
        delete tmp_details['createdBy'];
        delete tmp_details['modified'];
        delete tmp_details['modifiedBy'];
        setSelectedDiscountType(tmp_details.discountType);
        form.setFieldsValue(tmp_details);
        // if (updateLoading) {
        //     showInfo(t('messages:info-create-wip'));
        //     showSuccess(t('messages:success-updated'));
        // }
    }, [details]);

    const onCancel = () => {
        setUnsavedChanges(false);
        Modal.confirm({
            title: t('messages:confirm-leaving-page'),
            onOk: () => {
                details.routeOnCancel ? router.push(details.routeOnCancel) : router.back();
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
                <Form.Item label={article} name="articleName">
                    <Input disabled />
                </Form.Item>
                {articleCubingType !== configs.ARTICLE_CUBING_TYPE_COMMENT ? (
                    <>
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
                        <Form.Item label={discountTypeLabel} name="discountType">
                            <Select
                                allowClear
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('d:discount_type')
                                })}`}
                                onChange={handleDiscountTypeSelection}
                            >
                                {configsParamsCodes.discountTypes?.map((discountType: any) => (
                                    <Option
                                        key={discountType.code}
                                        value={parseInt(discountType.code)}
                                    >
                                        {discountType.value}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                        {selectedDiscountType != 10 && selectedDiscountType != undefined && (
                            <Form.Item
                                label={discountLabel}
                                name="discount"
                                rules={[
                                    { type: 'number', min: 0, message: errorMessageMinInputNumber },
                                    {
                                        type: 'number',
                                        max: 100,
                                        message: errorMessageMaxInputNumber
                                    }
                                ]}
                            >
                                <InputNumber
                                    disabled={
                                        selectedDiscountType != 10 &&
                                        selectedDiscountType != undefined
                                            ? false
                                            : true
                                    }
                                />
                            </Form.Item>
                        )}
                        {selectedDiscountType == 10 && selectedDiscountType != undefined && (
                            <Form.Item
                                label={discountAmountLabel}
                                name="discountAmount"
                                rules={[
                                    { type: 'number', min: 0, message: errorMessageMinInputNumber }
                                ]}
                            >
                                <InputNumber
                                    disabled={
                                        selectedDiscountType == 10 &&
                                        selectedDiscountType != undefined
                                            ? false
                                            : true
                                    }
                                />
                            </Form.Item>
                        )}
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
                    <Button type="primary" onClick={onFinish}>
                        {submit}
                    </Button>
                    <Button onClick={onCancel}>{t('actions:cancel')}</Button>
                </Space>
            </div>
        </WrapperForm>
    );
};
