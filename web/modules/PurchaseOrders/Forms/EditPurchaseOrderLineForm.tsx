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
import {
    Button,
    Input,
    Form,
    Select,
    Checkbox,
    InputNumber,
    AutoComplete,
    Modal,
    Space
} from 'antd';
import useTranslation from 'next-translate/useTranslation';
import { FC, useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import {
    useUpdatePurchaseOrderLineMutation,
    UpdatePurchaseOrderLineMutationVariables,
    UpdatePurchaseOrderLineMutation,
    useListParametersForAScopeQuery
} from 'generated/graphql';
import {
    showError,
    showSuccess,
    showInfo,
    useArticleIds,
    usePurchaseOrderLineIds,
    checkUndefinedValues
} from '@helpers';
import { debounce } from 'lodash';
import configs from '../../../../common/configs.json';

export type EditPurchaseOrderLineFormProps = {
    id: string;
    details: any;
};

const { Option } = Select;

interface IOption {
    value: string;
    id: string;
}

export const EditPurchaseOrderLineForm: FC<EditPurchaseOrderLineFormProps> = ({
    id,
    details
}: EditPurchaseOrderLineFormProps) => {
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
    const receivedQuantity = t('d:receivedQuantity');
    const reservedQuantity = t('d:reservedQuantity');
    const errorMessageEmptyInput = t('messages:error-message-empty-input');
    const submit = t('actions:submit');
    const unitPriceExcludingTaxes = t('d:unitPriceExcludingTaxes');

    // TYPED SAFE ALL
    const [form] = Form.useForm();
    const [aIdOptions, setAIdOptions] = useState<Array<IOption>>([]);
    const [aId, setAId] = useState<string>();
    const [articleName, setArticleName] = useState<string>('');
    const [blockingStatuses, setBlockingStatuses] = useState<any>();
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes
    const [vatRates, setVatRates] = useState<any>();

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

    // to render autocompleted articles list
    const articleData = useArticleIds({ name: `${articleName}%` }, 1, 100, null);

    useEffect(() => {
        const formValue = form.getFieldsValue(true);
        form.setFieldsValue({ ...formValue, articleId: aId, articleName: articleName });
    }, [aId, details]);

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

    const stockStatusTextList = useListParametersForAScopeQuery(graphqlRequestClient, {
        scope: 'stock_statuses'
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
    const { mutate, isPending: updateLoading } = useUpdatePurchaseOrderLineMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: UpdatePurchaseOrderLineMutation,
                _variables: UpdatePurchaseOrderLineMutationVariables,
                _context: any
            ) => {
                router.push(`/purchase-orders/line/${data.updatePurchaseOrderLine?.id}`);
                showSuccess(t('messages:success-created'));
            },
            onError: (err) => {
                showError(t('messages:error-creating-data'));
            }
        }
    );

    const updatePurchaseOrderLine = ({ id, input }: UpdatePurchaseOrderLineMutationVariables) => {
        mutate({ id, input });
    };

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                checkUndefinedValues(form);
                // Here make api call of something else
                const formData = form.getFieldsValue(true);
                delete formData.articleName;
                delete formData.purchaseOrderName;
                delete formData.stockOwnerName;
                delete formData.statusText;
                delete formData.blockingStatusText;
                delete formData['stockOwner'];
                delete formData['purchaseOrder'];
                delete formData['article'];
                delete formData['vatRateCodeText'];
                updatePurchaseOrderLine({ id: id, input: formData });
                setUnsavedChanges(false);
            })
            .catch((err) => {
                showError(t('messages:error-creating-data'));
            });
    };

    useEffect(() => {
        const tmp_details = {
            ...details,
            articleName: details.article.name,
            articleId: details.articleId,
            purchaseOrderName: details.purchaseOrder.name,
            purchaseOrderId: details.purchaseOrderId,
            stockOwnerId: details.stockOwnerId,
            stockOwnerName: details.stockOwner.name
        };
        delete tmp_details['id'];
        delete tmp_details['created'];
        delete tmp_details['createdBy'];
        delete tmp_details['modified'];
        delete tmp_details['modifiedBy'];
        form.setFieldsValue(tmp_details);
        if (updateLoading) {
            showInfo(t('messages:info-create-wip'));
        }
    }, [updateLoading, details]);

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
            <Form
                form={form}
                layout="vertical"
                scrollToFirstError
                onValuesChange={() => setUnsavedChanges(true)}
            >
                <Form.Item name="stockOwnerName" label={stockOwner}>
                    <Input disabled />
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
                        disabled
                    />
                </Form.Item>
                <Form.Item
                    label={quantity}
                    name="quantity"
                    rules={[{ required: true, message: errorMessageEmptyInput }]}
                >
                    <InputNumber
                        min={receivedQuantity}
                        style={{ width: '100%' }}
                        disabled={
                            details?.purchaseOrder.type === configs.PURCHASE_ORDER_TYPE_L3 ||
                            details?.purchaseOrder.type === configs.PURCHASE_ORDER_TYPE_L3_RETURN
                                ? true
                                : false
                        }
                    />
                </Form.Item>
                <Form.Item label={quantityMax} name="quantityMax">
                    <InputNumber
                        min={receivedQuantity}
                        style={{ width: '100%' }}
                        disabled={
                            details?.purchaseOrder.type === configs.PURCHASE_ORDER_TYPE_L3 ||
                            details?.purchaseOrder.type === configs.PURCHASE_ORDER_TYPE_L3_RETURN
                                ? true
                                : false
                        }
                    />
                </Form.Item>
                <Form.Item label={receivedQuantity} name="receivedQuantity">
                    <InputNumber disabled />
                </Form.Item>
                <Form.Item label={reservedQuantity} name="reservedQuantity">
                    <InputNumber disabled />
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
                    <Input
                        disabled={
                            details?.purchaseOrder.type === configs.PURCHASE_ORDER_TYPE_L3 ||
                            details?.purchaseOrder.type === configs.PURCHASE_ORDER_TYPE_L3_RETURN
                                ? true
                                : false
                        }
                    />
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
                    <Button type="primary" loading={updateLoading} onClick={onFinish}>
                        {submit}
                    </Button>
                    <Button onClick={onCancel}>{t('actions:cancel')}</Button>
                </Space>
            </div>
        </WrapperForm>
    );
};
