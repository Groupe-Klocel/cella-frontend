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
    InputNumber,
    Select,
    Modal,
    AutoComplete,
    Checkbox,
    DatePicker
} from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useAuth } from 'context/AuthContext';
import { useAppState } from 'context/AppContext';
import { useRouter } from 'next/router';
import { showError, showSuccess, useCarrierShippingModeIds, useStockOwners } from '@helpers';
import configs from '../../../../common/configs.json';
import parameters from '../../../../common/parameters.json';
import { FC, useEffect, useMemo, useState } from 'react';
import { FilterFieldType, ModelType } from 'models/ModelsV2';
import {
    CreateOrderMutation,
    CreateOrderMutationVariables,
    GetThirdPartiesQuery,
    useCreateOrderMutation,
    useGetThirdPartiesQuery
} from 'generated/graphql';
import moment from 'moment';
import dayjs from 'dayjs';
import { debounce } from 'lodash';
import TextArea from 'antd/lib/input/TextArea';
import fr_FR from 'antd/lib/date-picker/locale/fr_FR';
import en_US from 'antd/lib/date-picker/locale/en_US';

interface IOption {
    label: string;
    value: string;
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
    const { parameters: appParameters, configs: appConfigs } = useAppState();
    const router = useRouter();
    const { locale } = router;
    const language = (locale === 'en-US' ? 'en' : locale) ?? 'en';
    const [thirdParties, setThirdParties] = useState<Array<IOption>>([]);
    const [thirdPartyName, setThirdPartyName] = useState<string>('');
    const [debouncedThirdPartyName, setDebouncedThirdPartyName] = useState<string>('');

    // Create the debounced function using useMemo to prevent recreation on each render
    const debouncedSetThirdPartyName = useMemo(
        () =>
            debounce((value: string) => {
                setDebouncedThirdPartyName(value);
            }, 500),
        []
    );

    // Use the debounced function when thirdPartyName changes
    useEffect(() => {
        debouncedSetThirdPartyName(thirdPartyName);
        return () => {
            debouncedSetThirdPartyName.cancel();
        };
    }, [thirdPartyName, debouncedSetThirdPartyName]);

    const errorMessageEmptyInput = t('messages:error-message-empty-input');
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
    const discountTypeLabel = t('d:discount_type');
    const discountLabel = t('d:discount_percent');
    const discountAmountLabel = t('d:discount_amount');
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
    const carrierImposed = t('d:carrierImposed');
    const genericDeliveryComment = t('d:genericDeliveryComment');
    // END TEXTS TRANSLATION

    const { Option } = Select;

    // TYPED SAFE ALL
    const [form] = Form.useForm();
    const [unsavedChanges, setUnsavedChanges] = useState(false);

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

    const { mutate, isPending: createLoading } = useCreateOrderMutation<Error>(
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
                const formData = form.getFieldsValue(true);
                formData.thirdPartyId = thirdParties.find(
                    (tp) => tp.label === formData.thirdParty
                )?.value;
                formData.status = configs.ORDER_STATUS_CREATED;
                formData.orderDate = nowDate;
                formData.orderType = configs.ORDER_TYPE_CUSTOMER_ORDER;
                formData.extraStatus1 = parameters.ORDER_EXTRA_STATUS1_NOT_PAID;
                formData.extraStatus2 = parameters.ORDER_EXTRA_STATUS2_NOT_DELIVERED;
                delete formData.thirdParty;

                createOrder({ input: formData });
                setUnsavedChanges(false);
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
                name: `${debouncedThirdPartyName}%`
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
                    newIdOpts.push({ label: name! + ' - ' + description!, value: id! });
                }
            );
            setThirdParties(newIdOpts);
        }
    }, [customerThirdPartiesList.data]);

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

    const [selectedDiscountType, setSelectedDiscountType] = useState<any>();
    const handleDiscountTypeSelection = (key: any, value: any) => {
        setSelectedDiscountType(parseInt(key));
        form.setFieldsValue({
            invoiceDiscount: null,
            invoiceDiscountAmount: null
        });
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
                <Form.Item label={thirdPartyLabel} name="thirdParty">
                    <AutoComplete
                        placeholder={`${t('messages:please-fill-letter-your', {
                            name: t('d:thirdParty')
                        })}`}
                        style={{ width: '100%' }}
                        options={thirdParties}
                        onSearch={(value) => {
                            setThirdPartyName(value);
                        }}
                        onSelect={(value, option) => {
                            if (customerThirdPartiesList.data) {
                                customerThirdPartiesList.data.thirdParties?.results.forEach(
                                    (customerThirdParty: any) => {
                                        if (customerThirdParty.id === option.value) {
                                            form.setFieldsValue({
                                                thirdParty: option.label,
                                                paymentTerms:
                                                    customerThirdParty.defaultPaymentTerms,
                                                paymentMethod:
                                                    customerThirdParty.defaultPaymentMethod,
                                                paymentAccount:
                                                    customerThirdParty.defaultPaymentAccount,
                                                currency: customerThirdParty.defaultCurrency,
                                                invoiceDiscount: customerThirdParty.defaultDiscount,
                                                priceType: customerThirdParty.priceType,
                                                genericDeliveryComment:
                                                    customerThirdParty.genericDeliveryComment
                                            });
                                        }
                                    }
                                );
                            }
                        }}
                        allowClear
                    />
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
                    >
                        {configsParamsCodes.discountTypes?.map((discountType: any) => (
                            <Option key={discountType.code} value={parseInt(discountType.code)}>
                                {discountType.value}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                {selectedDiscountType != 10 && selectedDiscountType != undefined && (
                    <Form.Item
                        label={discountLabel}
                        name="invoiceDiscount"
                        rules={[
                            { type: 'number', min: 0, message: errorMessageMinInputNumber },
                            { type: 'number', max: 100, message: errorMessageMaxInputNumber }
                        ]}
                    >
                        <InputNumber
                            disabled={
                                selectedDiscountType != 10 && selectedDiscountType != undefined
                                    ? false
                                    : true
                            }
                        />
                    </Form.Item>
                )}
                {selectedDiscountType == 10 && selectedDiscountType != undefined && (
                    <Form.Item
                        label={discountAmountLabel}
                        name="invoiceDiscountAmount"
                        rules={[{ type: 'number', min: 0, message: errorMessageMinInputNumber }]}
                    >
                        <InputNumber
                            disabled={
                                selectedDiscountType == 10 && selectedDiscountType != undefined
                                    ? false
                                    : true
                            }
                        />
                    </Form.Item>
                )}
                <Form.Item label={expectedDeliveryDateLabel} name="expectedDeliveryDate">
                    <DatePicker
                        allowClear
                        format={router.locale === 'fr' ? 'DD/MM/YYYY' : 'MM/DD/YYYY'}
                        locale={router.locale === 'fr' ? fr_FR : en_US}
                        defaultValue={dayjs()}
                    />
                </Form.Item>
                <Form.Item
                    label={deliveryTypeLabel}
                    name="deliveryPoType"
                    rules={[{ required: true, message: errorMessageEmptyInput }]}
                >
                    <Select allowClear>
                        {configsParamsCodes.deliveryTypes?.map((deliveryType: any) => (
                            <Option key={deliveryType.code} value={parseInt(deliveryType.code)}>
                                {deliveryType.value}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item name="carrierImposed" valuePropName="checked">
                    <Checkbox>{carrierImposed}</Checkbox>
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
                <Form.Item label={genericDeliveryComment} name="genericDeliveryComment">
                    <TextArea />
                </Form.Item>
                <Form.Item
                    label={priorityLabel}
                    name="priority"
                    rules={[{ required: true, message: errorMessageEmptyInput }]}
                >
                    <Select allowClear>
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
                <Button type="primary" onClick={onFinish}>
                    {submit}
                </Button>
                <Button onClick={onCancel}>{t('actions:cancel')}</Button>
            </div>
        </WrapperForm>
    );
};
