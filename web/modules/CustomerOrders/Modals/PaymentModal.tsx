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
import useTranslation from 'next-translate/useTranslation';
import { Button, DatePicker, Form, InputNumber, Modal, Select, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { showError, showSuccess } from '@helpers';
import { useListParametersForAScopeQuery } from 'generated/graphql';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { useRouter } from 'next/router';
import { FormOptionType } from 'models/ModelsV2';
import dayjs from 'dayjs';
import fr_FR from 'antd/lib/date-picker/locale/fr_FR';
import en_US from 'antd/lib/date-picker/locale/en_US';

const { Option } = Select;
const { Text } = Typography;

export interface IPaymentModalProps {
    orderId: string;
    showModal: any;
    setRefetch?: any;
}

const PaymentModal = ({ showModal, orderId, setRefetch }: IPaymentModalProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const errorMessageEmptyInput = t('messages:error-message-empty-input');
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const [orderData, setOrderData] = useState<any>();
    const [isCreationLoading, setIsCreationLoading] = useState<boolean>(false);

    const getCustomerOrder = async (
        orderId: string
    ): Promise<{ [key: string]: any } | undefined> => {
        const query = gql`
            query customerOrder($id: String!) {
                order(id: $id) {
                    id
                    name
                    thirdPartyId
                    thirdParty {
                        name
                        description
                    }
                    orderType
                    invoiceReference
                    orderDate
                    status
                    deliveryPoType
                    priority
                    comment
                    printLanguage
                    reference1
                    reference2
                    reference3
                    paymentTerms
                    paymentTermsText
                    paymentMethod
                    paymentMethodText
                    paymentAccount
                    paymentAccountText
                    invoiceTotalIncludingTaxes
                    stockOwnerId
                    stockOwner {
                        name
                    }
                    currency
                    currencyText
                    created
                    createdBy
                    modified
                    modifiedBy
                }
            }
        `;

        const variables = {
            id: orderId
        };

        const customerOrder = await graphqlRequestClient.request(query, variables);
        return customerOrder;
    };

    useEffect(() => {
        async function fetchData() {
            const result = await getCustomerOrder(orderId);
            if (result) setOrderData(result.order);
        }
        if (orderId) {
            fetchData();
        }
    }, [orderId]);

    const setFieldsValue = () => {
        form.setFieldsValue({
            //paymentDate: orderData?.paymentDate,
            paymentMethodText: orderData?.paymentMethodText,
            paymentMethod: orderData?.paymentMethod,
            paymentAccountText: orderData?.paymentAccountText,
            paymentAccount: orderData?.paymentAccount,
            amount: orderData?.invoiceTotalIncludingTaxes,
            orderType: orderData?.orderType,
            stockOwnerId: orderData?.stockOwnerId
        });
    };

    useEffect(() => {
        setFieldsValue();
    }, [orderData]);

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

    //createPayment on click
    const createPayment = async (
        paymentInputs: any
    ): Promise<{ [key: string]: any } | undefined> => {
        const createPaymentMutation = gql`
            mutation createPayment($input: CreatePaymentInput!) {
                createPayment(input: $input) {
                    id
                }
            }
        `;
        const createPaymentVariables = {
            input: {
                paymentInputs
            }
        };
        const result = await graphqlRequestClient.request(
            createPaymentMutation,
            createPaymentVariables
        );
        return result;
    };

    const handleCancel = () => {
        setIsCreationLoading(false);
        showModal.setShowPaymentModal(false);
        form.resetFields();
        setFieldsValue();
    };

    const onClickOk = () => {
        setIsCreationLoading(true);
        form.validateFields()
            .then(() => {
                const formData = form.getFieldsValue(true);
                const {
                    paymentMethod,
                    paymentAccount,
                    amount,
                    orderType,
                    paymentDate,
                    stockOwnerId
                } = formData;
                const fetchData = async () => {
                    const res = await fetch(`/api/payments/createPaymentAndLine`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            paymentDate,
                            orderType,
                            amount,
                            paymentMethod,
                            paymentAccount,
                            orderId,
                            stockOwnerId
                        })
                    });
                    if (res.ok) {
                        showSuccess(t('messages:success-created'));
                        setIsCreationLoading(false);
                        showModal.setShowPaymentModal(false);
                        setRefetch((refetchBool: boolean) => !refetchBool);
                        form.resetFields();
                        setFieldsValue();
                    }
                    if (!res.ok) {
                        const errorResponse = await res.json();
                        if (errorResponse.error.response.errors[0].extensions) {
                            showError(
                                t(
                                    `errors:${errorResponse.error.response.errors[0].extensions.code}`
                                )
                            );
                        } else {
                            showError(t('messages:error-creating-data'));
                        }
                        setIsCreationLoading(false);
                        showModal.setShowPaymentModal(false);
                    }
                };
                fetchData();
            })
            .catch((err) => {
                showError(t('messages:error-creating-data'));
                setIsCreationLoading(false);
                showModal.setShowPaymentModal(false);
            });
    };

    return (
        <Modal
            title={t('actions:enter-payment-information')}
            open={showModal.showPaymentModal}
            width={800}
            styles={{
                body: {
                    maxHeight: '70vh',
                    overflowY: 'auto',
                    padding: '0px 24px'
                }
            }}
            onCancel={handleCancel}
            footer={[
                <Button key="back" onClick={handleCancel}>
                    {t('messages:cancel')}
                </Button>,
                <Button key="submit" type="primary" loading={isCreationLoading} onClick={onClickOk}>
                    {t('messages:confirm')}
                </Button>
            ]}
        >
            <Form form={form} layout="vertical" scrollToFirstError size="small">
                <Text strong>
                    {t('d:thirdParty')}: {orderData?.thirdParty?.name} -{' '}
                    {orderData?.thirdParty?.description}
                </Text>
                <Form.Item
                    label={t('d:paymentDate')}
                    name="paymentDate"
                    rules={[{ required: true, message: errorMessageEmptyInput }]}
                    initialValue={dayjs()}
                >
                    <DatePicker
                        allowClear
                        format={router.locale === 'fr' ? 'DD/MM/YYYY' : 'MM/DD/YYYY'}
                        locale={router.locale === 'fr' ? fr_FR : en_US}
                        defaultValue={dayjs()}
                    />
                </Form.Item>
                <Form.Item
                    label={t('d:amount')}
                    name="amount"
                    rules={[{ required: true, message: errorMessageEmptyInput }]}
                >
                    <InputNumber precision={2} />
                </Form.Item>
                <Form.Item label={t('d:paymentMethod')} name="paymentMethodText">
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
                <Form.Item label={t('d:paymentAccount')} name="paymentAccountText">
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
            </Form>
        </Modal>
    );
};

export { PaymentModal };
