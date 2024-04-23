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
import { Button, Input, Form, InputNumber, Select, Modal, AutoComplete, DatePicker } from 'antd';
import useTranslation from 'next-translate/useTranslation';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import { showError, showSuccess, useCarrierShippingModeIds, useStockOwners } from '@helpers';
import configs from '../../../../common/configs.json';
import parameters from '../../../../common/parameters.json';
import { FC, useEffect, useState } from 'react';
import { FilterFieldType, FormOptionType, ModelType } from 'models/ModelsV2';
import {
    CreateOrderMutation,
    CreateOrderMutationVariables,
    GetThirdPartiesQuery,
    useCreateOrderMutation,
    useGetThirdPartiesQuery,
    useListConfigsForAScopeQuery,
    useListParametersForAScopeQuery
} from 'generated/graphql';
import moment from 'moment';
import { debounce } from 'lodash';

interface IOption {
    value: string;
    id: string;
}

export interface IAddItemFormProps {
    dataModel: ModelType;
    addSteps?: Array<Array<FilterFieldType>>;
    extraData: any;
    routeOnCancel?: string;
    setFormInfos?: (formInfos: any) => void;
    dependentFields?: Array<any>;
    setData?: any;
}

export const AddCustomerOrderForm: FC<IAddItemFormProps> = (props: IAddItemFormProps) => {
    const { t } = useTranslation('common');
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const errorMessageEmptyInput = t('messages:error-message-empty-input');
    const [thirdParties, setThirdParties] = useState<Array<IOption>>([]);
    const [thirdPartyId, setThirdPartyId] = useState<string>();
    const [thirdPartyName, setThirdPartyName] = useState<string>('');

    const errorMessageMinInputNumber = t('messages:select-number-min', { min: 0 });
    const errorMessageMaxInputNumber = t('messages:select-number-max', { max: 100 });

    // TEXTS TRANSLATION ( REFACTORING POSSIBLE / EXPORT / DON'T KNOW YET )

    const name = t('common:name');
    const stockOwnerNameLabel = t('d:stockOwner_name');
    const paymentTermLabel = t('d:paymentTerms');
    const paymentMethodLabel = t('d:paymentMethod');
    const paymentAccountLabel = t('d:paymentAccount');
    const priceTypeLabel = t('d:priceType');
    const currencyLabel = t('d:currency');
    const discountLabel = t('d:discount_percent');
    const expectedDeliveryDateLabel = t('d:expectedDeliveryDate');
    const deliveryTypeLabel = t('d:deliveryType');
    const carrierShippingModeNameLabel = t('d:carrierShippingMode_name');
    const priorityLabel = t('d:priority');
    const printLanguageLabel = t('d:printLanguage');
    const commentLabel = t('d:comment');
    const reference1Label = t('d:reference1');
    const reference2Label = t('d:reference2');
    const reference3Label = t('d:reference3');
    const thirdPartyLabel = t('d:thirdParty');
    const submit = t('actions:submit');
    // END TEXTS TRANSLATION

    const { Option } = Select;

    // TYPED SAFE ALL
    const [form] = Form.useForm();
    const [unsavedChanges, setUnsavedChanges] = useState(false);

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

    const { mutate, isLoading: createLoading } = useCreateOrderMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: CreateOrderMutation,
                _variables: CreateOrderMutationVariables,
                _context: any
            ) => {
                setUnsavedChanges(false);
                router.push(`/customer-orders/${data.createOrder.id}`);
                showSuccess(t('messages:success-created'));
            },
            onError: (err) => {
                showError(t('messages:error-creating-data'));
            }
        }
    );

    const createOrder = ({ input }: CreateOrderMutationVariables) => {
        mutate({ input });
    };

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                // Here make api call of something else
                const nowDate = moment();

                form.setFieldsValue({
                    status: configs.ORDER_STATUS_CREATED,
                    orderType: configs.ORDER_TYPE_CUSTOMER_ORDER,
                    orderDate: nowDate,
                    thirdPartyId
                });

                const formData = form.getFieldsValue(true);

                delete formData['paymentAccountText'];
                delete formData['paymentMethodText'];
                delete formData['paymentTermsText'];
                delete formData['priceTypeText'];
                delete formData['currencyText'];

                createOrder({ input: formData });
            })
            .catch((err) => {
                showError(t('messages:error-creating-data'));
            });
    };

    //ThirdParties
    const customerThirdPartiesList = useGetThirdPartiesQuery<Partial<GetThirdPartiesQuery>, Error>(
        graphqlRequestClient,
        {
            filters: {
                category: [configs.THIRD_PARTY_CATEGORY_CUSTOMER],
                status: [configs.THIRD_PARTY_STATUS_ENABLED],
                name: `${thirdPartyName}%`
            },
            orderBy: null,
            page: 1,
            itemsPerPage: 100
        }
    );

    useEffect(() => {
        if (customerThirdPartiesList.data) {
            const newIdOpts: Array<IOption> = [];
            customerThirdPartiesList.data.thirdParties?.results.forEach(
                ({ id, name, description }) => {
                    if (form.getFieldsValue(true).thirdPartyId === id) {
                        setThirdPartyName(name!);
                        setThirdPartyId(id!);
                    }
                    newIdOpts.push({ value: name! + ' - ' + description!, id: id! });
                }
            );
            setThirdParties(newIdOpts);
        }
    }, [thirdPartyName, customerThirdPartiesList.data]);

    // useEffect(() => {
    //     if (customerThirdPartiesList) {
    //         const newTypeTexts: Array<any> = [];
    //         const cData = customerThirdPartiesList?.data?.thirdParties?.results;
    //         if (cData) {
    //             cData.forEach((item) => {
    //                 newTypeTexts.push({ key: item.id, text: item.name + ' - ' + item.description });
    //             });
    //             newTypeTexts.sort((a, b) => a.text.localeCompare(b.text));
    //             setThirdParties(newTypeTexts);
    //         }
    //     }
    // }, [customerThirdPartiesList.data]);

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

    //To render Simple carrierShippingModes list
    const [carrierShippingModes, setCarrierShippingModes] = useState<any>();
    const carrierShippingModeData = useCarrierShippingModeIds({}, 1, 100, null);

    useEffect(() => {
        if (carrierShippingModeData) {
            const newIdOpts: { text: string; key: string }[] = [];
            carrierShippingModeData.data?.carrierShippingModes?.results.forEach(({ id, name }) => {
                newIdOpts.push({ text: name!, key: id! });
            });
            setCarrierShippingModes(newIdOpts);
        }
    }, [carrierShippingModeData.data]);

    // Retrieve Payment terms list
    const [paymentTerms, setPaymentTerms] = useState<any>();
    const paymentTermsList = useListParametersForAScopeQuery(graphqlRequestClient, {
        language: router.locale,
        scope: 'payment_terms'
    });

    useEffect(() => {
        if (paymentTermsList) {
            const newPaymentTerm: Array<FormOptionType> = [];

            const cData = paymentTermsList?.data?.listParametersForAScope;
            if (cData) {
                cData.forEach((item) => {
                    newPaymentTerm.push({ key: item.code, text: item.text });
                });
                setPaymentTerms(newPaymentTerm);
            }
        }
    }, [paymentTermsList.data]);

    // Retrieve Payment methods list
    const [paymentMethods, setPaymentMethods] = useState<any>();
    const paymentMethodsList = useListParametersForAScopeQuery(graphqlRequestClient, {
        language: router.locale,
        scope: 'payment_method'
    });

    useEffect(() => {
        if (paymentMethodsList) {
            const newPaymentMethod: Array<FormOptionType> = [];

            const cData = paymentMethodsList?.data?.listParametersForAScope;
            if (cData) {
                cData.forEach((item) => {
                    newPaymentMethod.push({ key: item.code, text: item.text });
                });
                setPaymentMethods(newPaymentMethod);
            }
        }
    }, [paymentMethodsList.data]);

    // Retrieve bank accounts list
    const [paymentAccounts, setPaymentAccounts] = useState<any>();
    const paymentAccountsList = useListParametersForAScopeQuery(graphqlRequestClient, {
        language: router.locale,
        scope: 'bank_account'
    });

    useEffect(() => {
        if (paymentAccountsList) {
            const newPaymentAccount: Array<FormOptionType> = [];

            const cData = paymentAccountsList?.data?.listParametersForAScope;
            if (cData) {
                cData.forEach((item) => {
                    newPaymentAccount.push({ key: item.code, text: item.text });
                });
                setPaymentAccounts(newPaymentAccount);
            }
        }
    }, [paymentAccountsList.data]);

    // Retrieve currencies list
    const [currencies, setCurrencies] = useState<any>();
    const currenciesList = useListParametersForAScopeQuery(graphqlRequestClient, {
        language: router.locale,
        scope: 'currency'
    });

    useEffect(() => {
        if (currenciesList) {
            const newCurrency: Array<FormOptionType> = [];

            const cData = currenciesList?.data?.listParametersForAScope;
            if (cData) {
                cData.forEach((item) => {
                    newCurrency.push({ key: item.code, text: item.text });
                });
                setCurrencies(newCurrency);
            }
        }
    }, [currenciesList.data]);

    // Retrieve price types list
    const [priceTypes, setPriceTypes] = useState<any>();
    const priceTypesList = useListParametersForAScopeQuery(graphqlRequestClient, {
        language: router.locale,
        scope: 'price_type'
    });

    useEffect(() => {
        if (priceTypesList) {
            const newPriceType: Array<FormOptionType> = [];

            const cData = priceTypesList?.data?.listParametersForAScope;
            if (cData) {
                cData.forEach((item) => {
                    newPriceType.push({ key: parseInt(item.code), text: item.text });
                });
                setPriceTypes(newPriceType);
            }
        }
    }, [priceTypesList.data]);

    // Retrieve delivery types list
    const [deliveryTypes, setDeliveryTypes] = useState<any>();
    const deliveryTypesList = useListConfigsForAScopeQuery(graphqlRequestClient, {
        language: router.locale,
        scope: 'delivery_po_type'
    });

    useEffect(() => {
        if (deliveryTypesList) {
            const newDeliveryType: Array<FormOptionType> = [];

            const cData = deliveryTypesList?.data?.listConfigsForAScope;
            if (cData) {
                cData.forEach((item) => {
                    if (!item.text.startsWith('N3')) {
                        newDeliveryType.push({ key: parseInt(item.code), text: item.text });
                    }
                });
                setDeliveryTypes(newDeliveryType);
            }
        }
    }, [deliveryTypesList.data]);

    // Retrieve priorities list
    const [priorities, setpriorities] = useState<any>();
    const prioritiesList = useListParametersForAScopeQuery(graphqlRequestClient, {
        language: router.locale,
        scope: 'priority'
    });

    useEffect(() => {
        if (prioritiesList) {
            const newPriority: Array<FormOptionType> = [];

            const cData = prioritiesList?.data?.listParametersForAScope;
            if (cData) {
                cData.forEach((item) => {
                    newPriority.push({ key: parseInt(item.code), text: item.text });
                });
                setpriorities(newPriority);
            }
        }
    }, [prioritiesList.data]);

    const handleThirdPartySelection = (key: any, value: any) => {
        // if we select a new value, we fill the form
        if (customerThirdPartiesList.data) {
            customerThirdPartiesList.data.thirdParties?.results.forEach(
                (customerThirdParty: any) => {
                    if (customerThirdParty.id === key) {
                        form.setFieldsValue({
                            paymentTermsText: customerThirdParty.defaultPaymentTermsText,
                            paymentTerms: customerThirdParty.defaultPaymentTerms,
                            paymentMethodText: customerThirdParty.defaultPaymentMethodText,
                            paymentMethod: customerThirdParty.defaultPaymentMethod,
                            paymentAccountText: customerThirdParty.defaultPaymentAccountText,
                            paymentAccount: customerThirdParty.defaultPaymentAccount,
                            currencyText: customerThirdParty.defaultCurrencyText,
                            currency: customerThirdParty.defaultCurrency,
                            invoiceDiscount: customerThirdParty.defaultDiscount
                        });
                    }
                }
            );
        }
    };

    const handlePaymentTermsSelection = (key: any, value: any) => {
        if (key === undefined) {
            form.setFieldsValue({ paymentTerms: null });
        } else {
            form.setFieldsValue({ paymentTerms: key });
        }
    };

    const handlePaymentMethodSelection = (key: any, value: any) => {
        if (key === undefined) {
            form.setFieldsValue({ paymentMethod: null });
        } else {
            form.setFieldsValue({ paymentMethod: key });
        }
    };

    const handlePaymentAccountSelection = (key: any, value: any) => {
        if (key === undefined) {
            form.setFieldsValue({ paymentAccount: null });
        } else {
            form.setFieldsValue({ paymentAccount: key });
        }
    };

    const handlePriceTypeSelection = (key: any, value: any) => {
        if (key === undefined) {
            form.setFieldsValue({ priceType: null });
        } else {
            form.setFieldsValue({ priceType: key });
        }
    };

    const handleCurrencySelection = (key: any, value: any) => {
        if (key === undefined) {
            form.setFieldsValue({ currency: null });
        } else {
            form.setFieldsValue({ currency: key });
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
                    label={stockOwnerNameLabel}
                    name="stockOwnerId"
                    rules={[{ required: true, message: errorMessageEmptyInput }]}
                >
                    <Select allowClear>
                        {stockOwners?.map((stockOwner: any) => (
                            <Option key={stockOwner.key} value={stockOwner.key}>
                                {stockOwner.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item label={thirdPartyLabel} name="thirdPartyId">
                    <AutoComplete
                        placeholder={`${t('messages:please-fill-letter-your', {
                            name: t('d:thirdParty')
                        })}`}
                        style={{ width: '100%' }}
                        options={thirdParties}
                        value={thirdPartyName}
                        filterOption={(inputValue, option) =>
                            option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                        }
                        onKeyUp={(e: any) => {
                            debounce(() => {
                                setThirdPartyName(e.target.value);
                            }, 3000);
                        }}
                        onSelect={(value, option) => {
                            setThirdPartyId(option.id);
                            setThirdPartyName(value.split(' - ')[0]);
                        }}
                        allowClear
                        onChange={handleThirdPartySelection}
                        onClear={() => {
                            setThirdPartyId(undefined);
                            setThirdPartyName('');
                        }}
                    />
                    {/* <Select
                        allowClear
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:thirdParty')
                        })}`}
                        showSearch
                        filterOption={(inputValue, option) =>
                            option!.props.children
                                .toUpperCase()
                                .indexOf(inputValue.toUpperCase()) !== -1
                        }
                        onChange={handleThirdPartySelection}
                    >
                        {thirdParties?.map((thirdParty: any) => (
                            <Option key={thirdParty.key} value={thirdParty.key}>
                                {thirdParty.text}
                            </Option>
                        ))}
                    </Select> */}
                </Form.Item>
                <Form.Item label={paymentTermLabel} name="paymentTermsText">
                    <Select
                        allowClear
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:paymentTerm')
                        })}`}
                        onChange={handlePaymentTermsSelection}
                    >
                        {paymentTerms?.map((paymentTerm: any) => (
                            <Option key={paymentTerm.key} value={paymentTerm.key}>
                                {paymentTerm.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item label={paymentMethodLabel} name="paymentMethodText">
                    <Select
                        allowClear
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:paymentMethod')
                        })}`}
                        onChange={handlePaymentMethodSelection}
                    >
                        {paymentMethods?.map((paymentMethod: any) => (
                            <Option key={paymentMethod.key} value={paymentMethod.key}>
                                {paymentMethod.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item label={paymentAccountLabel} name="paymentAccountText">
                    <Select
                        allowClear
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:paymentAccount')
                        })}`}
                        onChange={handlePaymentAccountSelection}
                    >
                        {paymentAccounts?.map((paymentAccount: any) => (
                            <Option key={paymentAccount.key} value={paymentAccount.key}>
                                {paymentAccount.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item label={priceTypeLabel} name="priceTypeText">
                    <Select
                        allowClear
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:priceType')
                        })}`}
                        onChange={handlePriceTypeSelection}
                    >
                        {priceTypes?.map((priceType: any) => (
                            <Option key={priceType.key} value={priceType.key}>
                                {priceType.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item label={currencyLabel} name="currencyText">
                    <Select
                        allowClear
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:currency')
                        })}`}
                        onChange={handleCurrencySelection}
                    >
                        {currencies?.map((currency: any) => (
                            <Option key={currency.key} value={currency.key}>
                                {currency.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item
                    label={discountLabel}
                    name="invoiceDiscount"
                    rules={[
                        { type: 'number', min: 0, message: errorMessageMinInputNumber },
                        { type: 'number', max: 100, message: errorMessageMaxInputNumber }
                    ]}
                >
                    <InputNumber />
                </Form.Item>
                <Form.Item label={expectedDeliveryDateLabel} name="expectedDeliveryDate">
                    <DatePicker
                        allowClear
                        format="YYYY-MM-DD"
                        showTime={{ defaultValue: moment('YYYY-MM-DD') }}
                    />
                </Form.Item>
                <Form.Item label={deliveryTypeLabel} name="deliveryPoType">
                    <Select allowClear>
                        {deliveryTypes?.map((deliveryType: any) => (
                            <Option key={deliveryType.key} value={deliveryType.key}>
                                {deliveryType.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item label={carrierShippingModeNameLabel} name="carrierShippingModeId">
                    <Select allowClear>
                        {carrierShippingModes?.map((csm: any) => (
                            <Option key={csm.key} value={csm.key}>
                                {csm.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item
                    label={priorityLabel}
                    name="priority"
                    rules={[{ required: true, message: errorMessageEmptyInput }]}
                >
                    <Select allowClear>
                        {priorities?.map((priority: any) => (
                            <Option key={priority.key} value={priority.key}>
                                {priority.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item label={printLanguageLabel} name="printLanguage">
                    <Input />
                </Form.Item>
                <Form.Item label={commentLabel} name="comment">
                    <Input />
                </Form.Item>
                <Form.Item label={reference1Label} name="reference1">
                    <Input />
                </Form.Item>
                <Form.Item label={reference2Label} name="reference2">
                    <Input />
                </Form.Item>
                <Form.Item label={reference3Label} name="reference3">
                    <Input />
                </Form.Item>
            </Form>
            <div style={{ textAlign: 'center' }}>
                <Button type="primary" onClick={onFinish}>
                    {submit}
                </Button>
                <Button onClick={onCancel}>{t('actions:cancel')}</Button>
            </div>
        </WrapperForm>
    );
};
