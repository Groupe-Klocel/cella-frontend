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
import { Button, Input, InputNumber, Form, Select, Space, Modal, DatePicker } from 'antd';
import useTranslation from 'next-translate/useTranslation';
import { FC, useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import dayjs from 'dayjs';
import { showError, showSuccess, showInfo, checkUndefinedValues } from '@helpers';
import {
    GetThirdPartiesQuery,
    SimpleGetInProgressStockOwnersQuery,
    UpdateOrderMutation,
    UpdateOrderMutationVariables,
    useGetThirdPartiesQuery,
    useListConfigsForAScopeQuery,
    useListParametersForAScopeQuery,
    useSimpleGetInProgressStockOwnersQuery,
    useUpdateOrderMutation
} from 'generated/graphql';
import configs from '../../../../common/configs.json';
import { FormOptionType } from 'models/ModelsV2';
import fr_FR from 'antd/lib/date-picker/locale/fr_FR';
import en_US from 'antd/lib/date-picker/locale/en_US';

export type EditCustomerOrderFormProps = {
    orderId: string;
    details: any;
};

export const EditCustomerOrderForm: FC<EditCustomerOrderFormProps> = ({
    orderId,
    details
}: EditCustomerOrderFormProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes
    const [stockOwners, setStockOwners] = useState<any>();
    const errorMessageEmptyInput = t('messages:error-message-empty-input');
    const [thirdParties, setThirdParties] = useState<Array<FormOptionType>>();

    const errorMessageMinInputNumber = t('messages:select-number-min', { min: 0 });
    const errorMessageMaxInputNumber = t('messages:select-number-max', { max: 100 });

    const { Option } = Select;

    const name = t('common:name');
    const stockOwnerNameLabel = t('d:stockOwner_name');
    const paymentTermLabel = t('d:paymentTerms');
    const paymentMethodLabel = t('d:paymentMethod');
    const paymentAccountLabel = t('d:paymentAccount');
    const priceTypeLabel = t('d:priceType');
    const currencyLabel = t('d:currency');
    const discountLabel = t('d:discount_percent');
    const deliveryPoTypeLabel = t('d:deliveryType');
    const priorityLabel = t('d:priority');
    const printLanguageLabel = t('d:printLanguage');
    const commentLabel = t('d:comment');
    const reference1Label = t('d:reference1');
    const reference2Label = t('d:reference2');
    const reference3Label = t('d:reference3');
    const thirdPartyLabel = t('d:thirdParty');
    const expectedDeliveryDateLabel = t('d:expectedDeliveryDate');
    const submit = t('actions:submit');

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

    const { mutate, isPending: updateLoading } = useUpdateOrderMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: UpdateOrderMutation,
                _variables: UpdateOrderMutationVariables,
                _context: any
            ) => {
                router.push(`/customer-orders/${data.updateOrder?.id}`);
            },
            onError: () => {
                showError(t('messages:error-update-data'));
            }
        }
    );

    const updateOrder = ({ id, input }: UpdateOrderMutationVariables) => {
        mutate({ id, input });
    };

    // Call api to create new group
    const onFinish = () => {
        form.validateFields()
            .then(() => {
                checkUndefinedValues(form);
                // Here make api call of something else
                const formData = form.getFieldsValue(true);

                //end part to update priorities on foreigners
                delete formData['paymentAccountText'];
                delete formData['paymentMethodText'];
                delete formData['paymentTermsText'];
                delete formData['currencyText'];
                delete formData['priceTypeText'];
                delete formData['stockOwnerName'];
                delete formData['thirdParty'];
                delete formData['stockOwner'];

                updateOrder({ id: orderId, input: formData });
                setUnsavedChanges(false);
            })
            .catch((err) => {
                showError(t('error-update-data'));
            });
    };

    useEffect(() => {
        const tmp_details = {
            ...details,
            stockOwnerName: details?.stockOwner?.name
        };
        delete tmp_details['id'];
        delete tmp_details['created'];
        delete tmp_details['createdBy'];
        delete tmp_details['modified'];
        delete tmp_details['modifiedBy'];
        form.setFieldsValue(tmp_details);
        if (updateLoading) {
            showInfo(t('messages:info-create-wip'));
            showSuccess(t('messages:success-updated'));
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

    //ThirdParties
    const customerThirdPartiesList = useGetThirdPartiesQuery<Partial<GetThirdPartiesQuery>, Error>(
        graphqlRequestClient,
        {
            filters: {
                category: [configs.THIRD_PARTY_CATEGORY_CUSTOMER],
                status: [configs.THIRD_PARTY_STATUS_ENABLED]
            },
            orderBy: null,
            page: 1,
            itemsPerPage: 20000
        }
    );

    useEffect(() => {
        if (customerThirdPartiesList) {
            const newTypeTexts: Array<any> = [];
            const cData = customerThirdPartiesList?.data?.thirdParties?.results;
            if (cData) {
                cData.forEach((item) => {
                    newTypeTexts.push({ key: item.id, text: item.name + ' - ' + item.description });
                });
                newTypeTexts.sort((a, b) => a.text.localeCompare(b.text));
                setThirdParties(newTypeTexts);
            }
        }
    }, [customerThirdPartiesList.data]);

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

                    if (item.code === details.paymentTerms) {
                        form.setFieldsValue({ paymentTermsText: item.text });
                    }
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
                    if (item.code === details.paymentMethod) {
                        form.setFieldsValue({ paymentMethodText: item.text });
                    }
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
                    if (item.code === details.paymentAccount) {
                        form.setFieldsValue({ paymentAccountText: item.text });
                    }
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
                    if (item.code === details.currency) {
                        form.setFieldsValue({ currencyText: item.text });
                    }
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
        if (key === undefined) {
            form.setFieldsValue({
                paymentTermsText: null,
                paymentTerms: null,
                paymentMethodText: null,
                paymentMethod: null,
                paymentAccountText: null,
                paymentAccount: null,
                currencyText: null,
                currency: null,
                invoiceDiscount: null
            });
        }
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
                            invoiceDiscount: customerThirdParty.defaultDiscount,
                            priceTypeText: customerThirdParty.priceTypeText,
                            priceType: customerThirdParty.priceType
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
                <Form.Item label={name} name="name">
                    <Input disabled />
                </Form.Item>
                <Form.Item
                    label={stockOwnerNameLabel}
                    name="stockOwnerId"
                    rules={[{ required: true, message: errorMessageEmptyInput }]}
                >
                    <Select>
                        {stockOwners?.map((stockOwner: any) => (
                            <Option key={stockOwner.id} value={stockOwner.id}>
                                {stockOwner.name}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item label={expectedDeliveryDateLabel} name="expectedDeliveryDate">
                    <DatePicker
                        allowClear
                        format={router.locale === 'fr' ? 'DD/MM/YYYY' : 'MM/DD/YYYY'}
                        locale={router.locale === 'fr' ? fr_FR : en_US}
                        defaultValue={dayjs()}
                    />
                </Form.Item>
                <Form.Item label={thirdPartyLabel} name="thirdPartyId">
                    <Select
                        showSearch
                        filterOption={(inputValue, option) =>
                            option!.props.children
                                .toUpperCase()
                                .indexOf(inputValue.toUpperCase()) !== -1
                        }
                        allowClear
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:thirdParty')
                        })}`}
                        onChange={handleThirdPartySelection}
                    >
                        {thirdParties?.map((thirdParty: any) => (
                            <Option key={thirdParty.key} value={thirdParty.key}>
                                {thirdParty.text}
                            </Option>
                        ))}
                    </Select>
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
                <Form.Item
                    label={deliveryPoTypeLabel}
                    name="deliveryPoType"
                    rules={[{ required: true, message: errorMessageEmptyInput }]}
                >
                    <Select>
                        {deliveryTypes?.map((deliveryType: any) => (
                            <Option key={deliveryType.key} value={deliveryType.key}>
                                {deliveryType.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item
                    label={priorityLabel}
                    name="priority"
                    rules={[{ required: true, message: errorMessageEmptyInput }]}
                >
                    <Select>
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
                <Space>
                    <Button type="primary" loading={updateLoading} onClick={onFinish}>
                        {t('actions:submit')}
                    </Button>
                    <Button onClick={onCancel}>{t('actions:cancel')}</Button>
                </Space>
            </div>
        </WrapperForm>
    );
};
