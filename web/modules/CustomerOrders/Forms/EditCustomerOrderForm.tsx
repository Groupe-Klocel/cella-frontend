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
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useEffect, useMemo, useState } from 'react';
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
import { useAppState } from 'context/AppContext';

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
    const { parameters: appParameters, configs: appConfigs } = useAppState();
    const router = useRouter();
    const { locale } = router;
    const language = (locale === 'en-US' ? 'en' : locale) ?? 'en';
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
    const discountTypeLabel = t('d:discount_type');
    const discountLabel = t('d:discount_percent');
    const discountAmountLabel = t('d:discount_amount');
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
        const paymentTerms = findAllByScope(appParameters, 'payment_terms');
        const paymentMethods = findAllByScope(appParameters, 'payment_method');
        const paymentAccounts = findAllByScope(appParameters, 'bank_account');
        const priceTypes = findAllByScope(appParameters, 'price_type');
        const currencies = findAllByScope(appParameters, 'currency');
        const discountTypes = findAllByScope(appParameters, 'discount_type');
        const priorities = findAllByScope(appParameters, 'priority');
        const deliveryTypes = findAllByScope(appConfigs, 'delivery_po_type');
        return {
            paymentTerms,
            paymentMethods,
            paymentAccounts,
            priceTypes,
            currencies,
            discountTypes,
            priorities,
            deliveryTypes
        };
    }, [appConfigs, appParameters, language]);

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
                showSuccess(t('messages:success-updated'));
                router.push(`/customer-orders/${data.updateOrder?.id}`);
            },
            onError: (err) => {
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
                showInfo(t('messages:info-update-wip'));
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
                delete formData['invoiceDiscountTypeText'];
                formData.invoiceDiscount = formData.invoiceDiscount ?? 0;
                formData.invoiceDiscountAmount = formData.invoiceDiscountAmount ?? 0;

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
            stockOwnerName: details?.stockOwner?.name,
            invoiceDiscountAmount: details?.invoiceDiscountAmount
                ? Math.abs(details.invoiceDiscountAmount)
                : details?.invoiceDiscountAmount
        };
        delete tmp_details['id'];
        delete tmp_details['created'];
        delete tmp_details['createdBy'];
        delete tmp_details['modified'];
        delete tmp_details['modifiedBy'];
        setSelectedDiscountType(tmp_details.invoiceDiscountType);
        form.setFieldsValue(tmp_details);
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

    const [selectedDiscountType, setSelectedDiscountType] = useState<any>();
    const handleDiscountTypeSelection = (key: any, value: any) => {
        setSelectedDiscountType(parseInt(key));
        form.setFieldsValue({
            invoiceDiscount: null,
            invoiceDiscountAmount: null
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
                <Form.Item label={paymentTermLabel} name="paymentTerms">
                    <Select
                        allowClear
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:paymentTerm')
                        })}`}
                    >
                        {configsParamsCodes.paymentTerms?.map((paymentTerm: any) => (
                            <Option key={paymentTerm.code} value={paymentTerm.code}>
                                {paymentTerm.value}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item label={paymentMethodLabel} name="paymentMethod">
                    <Select
                        allowClear
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:paymentMethod')
                        })}`}
                    >
                        {configsParamsCodes.paymentMethods?.map((paymentMethod: any) => (
                            <Option key={paymentMethod.code} value={paymentMethod.code}>
                                {paymentMethod.value}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item label={paymentAccountLabel} name="paymentAccount">
                    <Select
                        allowClear
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:paymentAccount')
                        })}`}
                    >
                        {configsParamsCodes.paymentAccounts?.map((paymentAccount: any) => (
                            <Option key={paymentAccount.code} value={paymentAccount.code}>
                                {paymentAccount.value}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item label={priceTypeLabel} name="priceType">
                    <Select
                        allowClear
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:priceType')
                        })}`}
                    >
                        {configsParamsCodes.priceTypes?.map((priceType: any) => (
                            <Option key={priceType.code} value={parseInt(priceType.code)}>
                                {priceType.value}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item label={currencyLabel} name="currency">
                    <Select
                        allowClear
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:currency')
                        })}`}
                    >
                        {configsParamsCodes.currencies?.map((currency: any) => (
                            <Option key={currency.code} value={currency.code}>
                                {currency.value}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item label={discountTypeLabel} name="invoiceDiscountType">
                    <Select
                        allowClear
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:discount_type')
                        })}`}
                        onChange={handleDiscountTypeSelection}
                        disabled={details.fixedPrice}
                    >
                        {configsParamsCodes.discountTypes?.map((discountType: any) => (
                            <Option key={discountType.code} value={parseInt(discountType.code)}>
                                {discountType.value}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                {selectedDiscountType == 20 && selectedDiscountType != undefined && (
                    <Form.Item
                        label={discountLabel}
                        name="invoiceDiscount"
                        rules={[
                            { type: 'number', min: 0, message: errorMessageMinInputNumber },
                            { type: 'number', max: 100, message: errorMessageMaxInputNumber }
                        ]}
                    >
                        <InputNumber disabled={details.fixedPrice} />
                    </Form.Item>
                )}
                {selectedDiscountType == 10 && selectedDiscountType != undefined && (
                    <Form.Item
                        label={discountAmountLabel}
                        name="invoiceDiscountAmount"
                        rules={[{ type: 'number', min: 0, message: errorMessageMinInputNumber }]}
                    >
                        <InputNumber disabled={details.fixedPrice} />
                    </Form.Item>
                )}
                <Form.Item
                    label={deliveryPoTypeLabel}
                    name="deliveryPoType"
                    rules={[{ required: true, message: errorMessageEmptyInput }]}
                >
                    <Select>
                        {configsParamsCodes.deliveryTypes?.map((deliveryType: any) => (
                            <Option key={deliveryType.code} value={parseInt(deliveryType.code)}>
                                {deliveryType.value}
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
                        {configsParamsCodes.priorities?.map((priority: any) => (
                            <Option key={priority.code} value={parseInt(priority.code)}>
                                {priority.value}
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
