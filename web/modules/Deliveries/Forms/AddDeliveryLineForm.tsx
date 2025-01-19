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
import { Button, Input, Form, Select, Checkbox, InputNumber, AutoComplete } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import {
    useCreateDeliveryLineMutation,
    CreateDeliveryLineMutationVariables,
    CreateDeliveryLineMutation,
    useListParametersForAScopeQuery
} from 'generated/graphql';
import {
    showError,
    showSuccess,
    showInfo,
    useDeliveryLineIds,
    useStockOwners,
    useArticles
} from '@helpers';
import { debounce } from 'lodash';
import configs from '../../../../common/configs.json';

interface IOption {
    value: string;
    id: string;
}
const { Option } = Select;

export interface ISingleItemProps {
    deliveryId: string | any;
    deliveryName: string | any;
    stockOwnerId: string | any;
    stockOwnerName: string | any;
}

export const AddDeliveryLineForm = (props: ISingleItemProps) => {
    const { t } = useTranslation('common');
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();

    // TEXTS TRANSLATION ( REFACTORING POSSIBLE / EXPORT / DON'T KNOW YET )
    const stockOwner = t('d:stockOwner');
    const article = t('common:article');
    const lineNumber = t('d:lineNumber');
    const masterLine = t('d:masterLine');
    const childLine = t('d:childLine');
    const masterLineNb = t('d:masterLineNb');
    const delivery = t('common:delivery');
    const quantityToBePicked = t('d:quantityToBePicked');
    const reservation = t('d:reservation');
    const comment = t('d:comment');
    const errorMessageEmptyInput = t('messages:error-message-empty-input');
    const errorMessageNegativeNumberInput = t('messages:select-number-min', { min: 0 });
    const submit = t('actions:submit');
    const unitPriceExcludingTaxes = t('d:unitPriceExcludingTaxes');
    const vatRate = t('d:vatRate');
    // END TEXTS TRANSLATION

    // TYPED SAFE ALL
    const [form] = Form.useForm();
    const [aIdOptions, setAIdOptions] = useState<Array<IOption>>([]);
    const [aId, setAId] = useState<string>();
    const [articleName, setArticleName] = useState<string>('');
    const [vatRates, setVatRates] = useState<any>();

    const deliveryLines = useDeliveryLineIds({ deliveryId: `${props.deliveryId}%` }, 1, 100, null);

    //LineNumber assignement
    useEffect(() => {
        const receivedList = deliveryLines?.data?.deliveryLines?.results.map(
            (e: any) => e.lineNumber
        );
        if (receivedList && receivedList?.length != 0) {
            form.setFieldsValue({ lineNumber: Math.max(...receivedList) + 1 });
        } else {
            form.setFieldsValue({ lineNumber: 1 });
        }
    }, [deliveryLines]);

    // to render autocompleted articles list
    const articleData = useArticles({ name: `${articleName}%` }, 1, 100, null);

    useEffect(() => {
        const formValue = form.getFieldsValue(true);
        form.setFieldsValue({ ...formValue, articleId: aId, articleName: articleName });
    }, [aId]);

    useEffect(() => {
        if (articleData.data) {
            const newIdOpts: Array<IOption> = [];
            articleData.data.articles?.results.forEach(({ id, name, description, status }) => {
                if (form.getFieldsValue(true).articleId === id) {
                    setArticleName(name!);
                    setAId(id!);
                }
                if (status != configs.ARTICLE_STATUS_CLOSED) {
                    newIdOpts.push({ value: name! + ' - ' + description!, id: id! });
                }
            });
            setAIdOptions(newIdOpts);
        }
    }, [articleName, articleData.data]);

    const onChange = (data: string) => {
        setArticleName(data);
    };

    //To render Simple stockOwners list
    const [stockOwners, setStockOwners] = useState<any>();
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

    //CREATE delivery line
    const { mutate, isPending: createLoading } = useCreateDeliveryLineMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: CreateDeliveryLineMutation,
                _variables: CreateDeliveryLineMutationVariables,
                _context: any
            ) => {
                router.push(`/deliveries/${props.deliveryId}`);
                showSuccess(t('messages:success-created'));
            },
            onError: (err) => {
                showError(t('messages:error-creating-data'));
            }
        }
    );

    const createDeliveryLine = ({ input }: CreateDeliveryLineMutationVariables) => {
        mutate({ input });
    };

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                // Here make api call of something else
                const formData = form.getFieldsValue(true);
                delete formData.articleName;
                delete formData.deliveryName;
                delete formData.stockOwnerName;
                createDeliveryLine({ input: formData });
            })
            .catch((err) => {
                showError(t('messages:error-creating-data'));
            });
    };

    useEffect(() => {
        const tmp_details = {
            deliveryName: props.deliveryName,
            deliveryId: props.deliveryId,
            stockOwnerId: props.stockOwnerId,
            stockOwnerName: props.stockOwnerName,
            status: configs.DELIVERY_STATUS_CREATED,
            toBeCubed: true
        };
        form.setFieldsValue(tmp_details);
        if (createLoading) {
            showInfo(t('messages:info-create-wip'));
        }
    }, [createLoading]);

    return (
        <WrapperForm>
            <Form form={form} layout="vertical" scrollToFirstError>
                <Form.Item label={stockOwner} name="stockOwnerName">
                    <Input disabled />
                </Form.Item>
                <Form.Item label={delivery} name="deliveryName">
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
                    label={quantityToBePicked}
                    name="quantityToBePicked"
                    rules={[
                        { required: true, message: errorMessageEmptyInput },
                        { type: 'number', min: 0, message: errorMessageNegativeNumberInput }
                    ]}
                >
                    <InputNumber />
                </Form.Item>
                <Form.Item
                    label={masterLine}
                    name="masterLine"
                    rules={[{ type: 'number', min: 0, message: errorMessageNegativeNumberInput }]}
                >
                    <InputNumber />
                </Form.Item>
                <Form.Item
                    label={childLine}
                    name="childLine"
                    rules={[{ type: 'number', min: 0, message: errorMessageNegativeNumberInput }]}
                >
                    <InputNumber />
                </Form.Item>
                <Form.Item
                    label={masterLineNb}
                    name="masterLineNumber"
                    rules={[{ type: 'number', min: 0, message: errorMessageNegativeNumberInput }]}
                >
                    <InputNumber />
                </Form.Item>
                <Form.Item label={reservation} name="reservation">
                    <Input />
                </Form.Item>
                <Form.Item
                    label={unitPriceExcludingTaxes}
                    name="unitPriceExcludingTaxes"
                    rules={[{ type: 'number', min: 0, message: errorMessageNegativeNumberInput }]}
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
                <Form.Item label={comment} name="comment">
                    <Input />
                </Form.Item>
            </Form>
            <div style={{ textAlign: 'center' }}>
                <Button type="primary" loading={createLoading} onClick={onFinish}>
                    {submit}
                </Button>
            </div>
        </WrapperForm>
    );
};
