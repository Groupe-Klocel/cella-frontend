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
import { Button, Input, Form, Select, InputNumber, AutoComplete, Space, Modal } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import {
    useCreatePurchaseOrderLineMutation,
    CreatePurchaseOrderLineMutationVariables,
    CreatePurchaseOrderLineMutation,
    useListParametersForAScopeQuery
} from 'generated/graphql';
import {
    showError,
    showSuccess,
    showInfo,
    usePurchaseOrderLineIds,
    useArticles,
    useStockOwners
} from '@helpers';
import { debounce } from 'lodash';
import configs from '../../../../common/configs.json';

interface IOption {
    value: string;
    id: string;
}
const { Option } = Select;

export interface ISingleItemProps {
    purchaseOrderId: string | any;
    purchaseOrderName: string | any;
    stockOwnerId: string | any;
    stockOwnerName: string | any;
}

export const AddPurchaseOrderLineForm = (props: ISingleItemProps) => {
    const { t } = useTranslation('common');
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();

    const stockOwner = t('d:stockOwner');
    const article = t('common:article');
    const lineNumber = t('d:lineNumber');
    const purchaseOrder = t('common:purchase-order');
    const reservation = t('d:reservation');
    const blockingStatus = t('d:blockingStatus');
    const quantityMax = t('d:quantityMax');
    const quantity = t('d:quantity');
    const errorMessageEmptyInput = t('messages:error-message-empty-input');
    const submit = t('actions:submit');
    const unitPriceExcludingTaxes = t('d:unitPriceExcludingTaxes');

    // TYPED SAFE ALL
    const [form] = Form.useForm();
    const [aIdOptions, setAIdOptions] = useState<Array<IOption>>([]);
    const [aId, setAId] = useState<string>();
    const [articleName, setArticleName] = useState<string>('');
    const [stockOwners, setStockOwners] = useState<any>();
    const [blockingStatuses, setBlockingStatuses] = useState<any>();
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes
    const [vatRates, setVatRates] = useState<any>();

    //To render Simple stockOwners list
    const stockOwnerData = useStockOwners({}, 1, 100, null);

    useEffect(() => {
        if (stockOwnerData) {
            const newIdOpts: { text: string; key: string }[] = [];
            stockOwnerData.data?.stockOwners?.results.forEach(({ id, name, status }) => {
                if (status != configs.STOCK_OWNER_STATUS_CLOSED) {
                    newIdOpts.push({ text: name!, key: id! });
                }
            });
            setStockOwners(newIdOpts);
        }
    }, [stockOwnerData.data]);

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

    const purchaseOrderLines = usePurchaseOrderLineIds(
        { purchaseOrderId: `${props.purchaseOrderId}%` },
        1,
        100,
        null
    );

    //LineNumber assignement
    useEffect(() => {
        const receivedList = purchaseOrderLines?.data?.purchaseOrderLines?.results.map(
            (e: any) => e.lineNumber
        );
        if (receivedList && receivedList?.length != 0) {
            form.setFieldsValue({ lineNumber: Math.max(...receivedList) + 1 });
        } else {
            form.setFieldsValue({ lineNumber: 1 });
        }
    }, [purchaseOrderLines]);

    // to render autocompleted articles list
    const articleData = useArticles({ name: `${articleName}%` }, 1, 100, null);

    useEffect(() => {
        const formValue = form.getFieldsValue(true);
        form.setFieldsValue({ ...formValue, articleId: aId, articleName: articleName });
    }, [aId]);

    useEffect(() => {
        if (articleData.data) {
            const newIdOpts: Array<IOption> = [];
            articleData.data.articles?.results.forEach(({ id, name, status }) => {
                if (form.getFieldsValue(true).articleId === id) {
                    setArticleName(name!);
                    setAId(id!);
                }
                if (status != configs.ARTICLE_STATUS_CLOSED) {
                    newIdOpts.push({ value: name!, id: id! });
                }
            });
            setAIdOptions(newIdOpts);
        }
    }, [articleName, articleData.data]);

    const onChange = (data: string) => {
        setArticleName(data);
    };

    const stockStatusTextList = useListParametersForAScopeQuery(graphqlRequestClient, {
        scope: 'stock_statuses',
        language: router.locale
    });

    useEffect(() => {
        if (stockStatusTextList) {
            setBlockingStatuses(stockStatusTextList?.data?.listParametersForAScope);
        }
    }, [stockStatusTextList.data]);

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

    //CREATE purchase order line
    const { mutate, isPending: createLoading } = useCreatePurchaseOrderLineMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: CreatePurchaseOrderLineMutation,
                _variables: CreatePurchaseOrderLineMutationVariables,
                _context: any
            ) => {
                showSuccess(t('messages:success-created'));
                router.push(`/purchase-orders/${props.purchaseOrderId}`);
                setUnsavedChanges(false);
            },
            onError: (err) => {
                showError(t('messages:error-creating-data'));
            }
        }
    );

    const createPurchaseOrderLine = ({ input }: CreatePurchaseOrderLineMutationVariables) => {
        mutate({ input });
    };

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                // Here make api call of something else
                const formData = form.getFieldsValue(true);
                delete formData.articleName;
                delete formData.purchaseOrderName;
                delete formData.stockOwnerName;
                createPurchaseOrderLine({ input: formData });
                setUnsavedChanges(false);
            })
            .catch((err) => {
                showError(t('messages:error-creating-data'));
            });
    };

    useEffect(() => {
        const tmp_details = {
            purchaseOrderName: props.purchaseOrderName,
            purchaseOrderId: props.purchaseOrderId,
            status: configs.PURCHASE_ORDER_LINE_STATUS_CREATED,
            stockOwnerId: props.stockOwnerId
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
                router.back();
            },
            okText: t('common:bool-yes'),
            cancelText: t('common:bool-no')
        });
    };

    return (
        <WrapperForm>
            <Form form={form} layout="vertical" scrollToFirstError>
                <Form.Item
                    name="stockOwnerId"
                    label={stockOwner}
                    rules={[{ required: true, message: errorMessageEmptyInput }]}
                >
                    <Select
                        allowClear
                        disabled
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:stockOwner')
                        })}`}
                    >
                        {stockOwners?.map((so: any) => (
                            <Option key={so.key} value={so.key}>
                                {so.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item label={purchaseOrder} name="purchaseOrderName">
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
                        }}
                        allowClear
                        onChange={onChange}
                    />
                </Form.Item>
                <Form.Item
                    label={quantity}
                    name="quantity"
                    rules={[{ required: true, message: errorMessageEmptyInput }]}
                >
                    <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item label={quantityMax} name="quantityMax">
                    <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item
                    name="blockingStatus"
                    label={blockingStatus}
                    rules={[{ required: true, message: errorMessageEmptyInput }]}
                >
                    <Select
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:blockingStatus')
                        })}`}
                    >
                        <Option value=""> </Option>
                        {blockingStatuses?.map((blockingStatus: any) => (
                            <Option key={blockingStatus.id} value={parseInt(blockingStatus.code)}>
                                {blockingStatus.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item label={reservation} name="reservation">
                    <Input />
                </Form.Item>
                <Form.Item
                    label={unitPriceExcludingTaxes}
                    name="unitPriceExcludingTaxes"
                    rules={[
                        {
                            type: 'number',
                            min: 0,
                            message: t('messages:select-number-min', { min: 0 })
                        }
                    ]}
                >
                    <InputNumber />
                </Form.Item>
                <Form.Item name="vatRateCode" label={t('d:vatRate')}>
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
