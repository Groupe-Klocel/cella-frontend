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
    Modal,
    Space,
    InputNumber,
    Checkbox,
    AutoComplete
} from 'antd';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import {
    useCreateThirdPartyAddressMutation,
    CreateThirdPartyAddressMutation,
    CreateThirdPartyAddressMutationVariables,
    useListConfigsForAScopeQuery,
    useListParametersForAScopeQuery
} from 'generated/graphql';
import { showError, showSuccess, showInfo } from '@helpers';
import { FormOptionType } from 'models/Models';
import configs from '../../../../common/configs.json';
import { gql, GraphQLClient } from 'graphql-request';
import { debounce } from 'lodash';

const { Option } = Select;

export interface ISingleItemProps {
    thirdPartyId: string | any;
    thirdPartyName: string | any;
}

interface MappedAdresses {
    address1: string;
    city: string;
    postalCode: string;
}

export const AddThirdPartyAddressForm = (props: ISingleItemProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes

    const [dataLocations, setDataLocations] = useState<any>();
    const [aIdOptions, setAIdOptions] = useState<Array<any>>([]);
    const [addressInput, setAddressInput] = useState<string>('');

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

    // TEXTS TRANSLATION ( REFACTORING POSSIBLE / EXPORT / DON'T KNOW YET )
    const errorMessageEmptyInput = t('messages:error-message-empty-input');
    const submit = t('actions:submit');
    // END TEXTS TRANSLATION

    // TYPED SAFE ALL
    const [form] = Form.useForm();
    const [thirdPartyCategories, setThirdPartyCategories] = useState<Array<FormOptionType>>();
    // Get all third party categories
    const thirdPartyAddressCategoryList = useListConfigsForAScopeQuery(graphqlRequestClient, {
        language: router.locale,
        scope: 'third_party_address_category'
    });
    useEffect(() => {
        if (thirdPartyAddressCategoryList) {
            const newThirdPartyCategory: Array<FormOptionType> = [];

            const cData = thirdPartyAddressCategoryList?.data?.listConfigsForAScope;
            if (cData) {
                cData.forEach((item) => {
                    newThirdPartyCategory.push({ key: parseInt(item.code), text: item.text });
                });
                setThirdPartyCategories(newThirdPartyCategory);
            }
        }
    }, [thirdPartyAddressCategoryList.data]);

    const [currencies, setCurrencies] = useState<Array<FormOptionType>>();
    // Get all currencies
    const currenciesList = useListParametersForAScopeQuery(graphqlRequestClient, {
        language: router.locale,
        scope: 'currency'
    });
    useEffect(() => {
        if (currenciesList) {
            const tmp_array: Array<FormOptionType> = [];

            const cData = currenciesList?.data?.listParametersForAScope;
            if (cData) {
                cData.forEach((item) => {
                    tmp_array.push({ key: item.code, text: item.text });
                });
                setCurrencies(tmp_array);
            }
        }
    }, [currenciesList.data]);

    const [paymentTerms, setPaymentTerms] = useState<Array<FormOptionType>>();
    // Get all paymentTerms
    const paymentTermsList = useListParametersForAScopeQuery(graphqlRequestClient, {
        language: router.locale,
        scope: 'payment_terms'
    });
    useEffect(() => {
        if (paymentTermsList) {
            const tmp_array: Array<FormOptionType> = [];

            const cData = paymentTermsList?.data?.listParametersForAScope;
            if (cData) {
                cData.forEach((item) => {
                    tmp_array.push({ key: item.code, text: item.text });
                });
                setPaymentTerms(tmp_array);
            }
        }
    }, [paymentTermsList.data]);

    const [paymentMethods, setPaymentMethods] = useState<Array<FormOptionType>>();
    // Get all paymentMethods
    const paymentMethodsList = useListParametersForAScopeQuery(graphqlRequestClient, {
        language: router.locale,
        scope: 'payment_method'
    });
    useEffect(() => {
        if (paymentMethodsList) {
            const tmp_array: Array<FormOptionType> = [];

            const cData = paymentMethodsList?.data?.listParametersForAScope;
            if (cData) {
                cData.forEach((item) => {
                    tmp_array.push({ key: item.code, text: item.text });
                });
                setPaymentMethods(tmp_array);
            }
        }
    }, [paymentMethodsList.data]);

    const [bankAccounts, setBankAccounts] = useState<Array<FormOptionType>>();
    // Get all bankAccounts
    const bankAccountsList = useListParametersForAScopeQuery(graphqlRequestClient, {
        language: router.locale,
        scope: 'bank_account'
    });
    useEffect(() => {
        if (bankAccountsList) {
            const tmp_array: Array<FormOptionType> = [];

            const cData = bankAccountsList?.data?.listParametersForAScope;
            if (cData) {
                cData.forEach((item) => {
                    tmp_array.push({ key: item.code, text: item.text });
                });
                setBankAccounts(tmp_array);
            }
        }
    }, [bankAccountsList.data]);

    const [vatRates, setVatRates] = useState<Array<FormOptionType>>();
    // Get all vatRates
    const vatRatesList = useListParametersForAScopeQuery(graphqlRequestClient, {
        language: router.locale,
        scope: 'vat_rate'
    });

    useEffect(() => {
        if (vatRatesList) {
            const tmp_array: Array<FormOptionType> = [];

            const cData = vatRatesList?.data?.listParametersForAScope;
            if (cData) {
                cData.forEach((item) => {
                    tmp_array.push({ key: parseInt(item.code), text: item.text });
                });
                setVatRates(tmp_array);
            }
        }
    }, [vatRatesList.data]);

    // CREATION //
    const { mutate, isPending: createLoading } = useCreateThirdPartyAddressMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: CreateThirdPartyAddressMutation,
                _variables: CreateThirdPartyAddressMutationVariables,
                _context: any
            ) => {
                router.push(`/third-parties/address/${data.createThirdPartyAddress.id}`);
                showSuccess(t('messages:success-created'));
            },
            onError: (err) => {
                showError(t('messages:error-creating-data'));
            }
        }
    );

    const createThirdPartyAddress = ({ input }: CreateThirdPartyAddressMutationVariables) => {
        mutate({ input });
    };

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                // Here make api call of something else
                const formData = form.getFieldsValue(true);
                formData.status = configs.THIRD_PARTY_ADDRESS_STATUS_ENABLED;
                delete formData.thirdPartyName;
                createThirdPartyAddress({ input: formData });
                setUnsavedChanges(false);
            })
            .catch((err) => {
                showError(t('messages:error-creating-data'));
            });
    };

    //GQL REQUEST
    async function getKloship() {
        //GET PARAMETER
        const queryParameter = gql`
            query getParameter {
                listParametersForAScope(scope: "kloship") {
                    code
                    value
                }
            }
        `;

        try {
            const queryParameterResult = await graphqlRequestClient.request(queryParameter);

            if (queryParameterResult) {
                const ksApiEndpoint = queryParameterResult.listParametersForAScope.find(
                    (e: any) => e.code == 'KS_API_ENDPOINT'
                ).value;

                //GET KLOSHIP
                const clientKloship = new GraphQLClient(ksApiEndpoint, {
                    signal: AbortSignal.timeout(600000),
                    headers: {}
                });

                const queryKloship = gql`
                    query checkAddressV1($auth: AuthInput!, $input: AdressInput!) {
                        checkAddressV1(
                            auth: $auth
                            input: $input
                            limit: 50
                            mapWithoutPostalCode: true
                        ) {
                            valid
                            message
                            mappedAdresses {
                                name
                                address1
                                countryCode
                                postalCode
                                cityCode
                                city
                            }
                        }
                    }
                `;

                const auth = {
                    accountId: queryParameterResult.listParametersForAScope.find(
                        (e: any) => e.code == 'KS_ACCOUNT_ID'
                    ).value,
                    accessKey: queryParameterResult.listParametersForAScope.find(
                        (e: any) => e.code == 'KS_ACCESS_KEY'
                    ).value
                };

                const input = {
                    name: '',
                    address1: addressInput,
                    city: '',
                    countryCode: 'FR' //default value
                };

                try {
                    const queryKloshipResult: any = await clientKloship.request(queryKloship, {
                        auth,
                        input
                    });
                    if (queryKloshipResult.checkAddressV1.mappedAdresses) {
                        console.log(queryKloshipResult.checkAddressV1.mappedAdresses);
                        const newIdOpts: Array<any> = [];
                        (
                            queryKloshipResult.checkAddressV1.mappedAdresses as MappedAdresses[]
                        ).forEach(({ address1, city, postalCode }) => {
                            if (input.address1 === `${address1} - ${city}`) {
                                form.setFieldsValue({
                                    entityAddress1: address1,
                                    entityStreetNumber: (address1.match(/^\d+/)?.[0] || '') + '',
                                    entityPostCode: postalCode,
                                    entityCity: city
                                });
                            }
                            newIdOpts.push({
                                value: `${address1} - ${city}`,
                                label: `${address1} - ${city}`
                            });
                        });
                        console.log(newIdOpts);
                        setAIdOptions(newIdOpts);
                    }
                    return queryKloshipResult.checkAddressV1;
                } catch (error) {
                    console.log('qKS_error', error);
                }
            }
        } catch (error) {
            console.error;
        }
    }

    useEffect(() => {
        async function fetchData() {
            const queryKloshipResult = await getKloship();
            if (queryKloshipResult) setDataLocations(queryKloshipResult);
        }
        fetchData();
    }, [addressInput]);

    const onChange = (data: string) => {
        setAddressInput(data);
        // if we clear the select, we clear the form
        if (data === null || data === undefined) {
            form.setFieldsValue({
                entityAddress1: '',
                entityStreetNumber: '',
                entityPostCode: '',
                entityCity: ''
            });
        }
    };

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

    useEffect(() => {
        const tmp_details = {
            thirdPartyName: props.thirdPartyName,
            thirdPartyId: props.thirdPartyId
        };
        form.setFieldsValue(tmp_details);
        if (createLoading) {
            showInfo(t('messages:info-create-wip'));
        }
    }, [createLoading]);

    return (
        <WrapperForm>
            <Form form={form} layout="vertical" scrollToFirstError>
                <Form.Item label={t('d:thirdParty')} name="thirdPartyName">
                    <Input disabled />
                </Form.Item>
                <Form.Item label={t('d:category')} name="category">
                    <Select
                        allowClear
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:category')
                        })}`}
                    >
                        {thirdPartyCategories?.map((item: any) => (
                            <Option key={item.key} value={item.key}>
                                {item.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item
                    label={t('d:entityName')}
                    name="entityName"
                    rules={[{ required: true, message: errorMessageEmptyInput }]}
                >
                    <Input maxLength={100} />
                </Form.Item>

                <Form.Item label={t('d:entityCode')} name="entityCode">
                    <Input maxLength={30} />
                </Form.Item>

                <Form.Item
                    label={t('d:addressToSearch')}
                    style={{
                        backgroundColor: '#a8a8a8',
                        border: '#d9d9d9',
                        padding: '10px',
                        borderRadius: '4px',
                        marginBottom: '16px'
                    }}
                >
                    <AutoComplete
                        style={{ width: '100%' }}
                        options={aIdOptions}
                        value={addressInput}
                        onKeyUp={(e: any) => {
                            debounce(() => {
                                setAddressInput(e.target.value);
                            }, 3000);
                        }}
                        onSelect={(value, option) => {
                            setAddressInput(value);
                            const AddressInfo = dataLocations.mappedAdresses.find(
                                (e: { id: any }) => e.id === option.id
                            );
                        }}
                        allowClear
                        onChange={onChange}
                        placeholder={`${t('messages:please-enter-address-to-search')}`}
                    />
                </Form.Item>
                <Form.Item label={t('d:entityAddress1')} name="entityAddress1">
                    <Input maxLength={100} />
                </Form.Item>
                <Form.Item label={t('d:entityAddress2')} name="entityAddress2">
                    <Input maxLength={100} />
                </Form.Item>
                <Form.Item label={t('d:entityAddress3')} name="entityAddress3">
                    <Input maxLength={100} />
                </Form.Item>
                <Form.Item label={t('d:entityStreetNumber')} name="entityStreetNumber">
                    <Input maxLength={100} />
                </Form.Item>
                <Form.Item label={t('d:entityPostCode')} name="entityPostCode">
                    <Input maxLength={20} />
                </Form.Item>
                <Form.Item label={t('d:entityCity')} name="entityCity">
                    <Input maxLength={100} />
                </Form.Item>
                <Form.Item label={t('d:entityState')} name="entityState">
                    <Input maxLength={100} />
                </Form.Item>
                <Form.Item label={t('d:entityDistrict')} name="entityDistrict">
                    <Input maxLength={100} />
                </Form.Item>
                <Form.Item
                    label={t('d:entityCountry')}
                    name="entityCountry"
                    initialValue={'France'}
                >
                    <Input maxLength={100} />
                </Form.Item>

                <Form.Item
                    label={t('d:entityCountryCode')}
                    name="entityCountryCode"
                    initialValue={'FR'}
                >
                    <Input maxLength={3} />
                </Form.Item>

                <Form.Item label={t('d:entityVatCode')} name="entityVatCode">
                    <Input maxLength={20} />
                </Form.Item>
                <Form.Item label={t('d:entityEoriCode')} name="entityEoriCode">
                    <Input maxLength={20} />
                </Form.Item>
                <Form.Item label={t('d:entityAccountingCode')} name="entityAccountingCode">
                    <Input maxLength={20} />
                </Form.Item>
                <Form.Item
                    label={t('d:entityIdentificationNumber')}
                    name="entityIdentificationNumber"
                >
                    <Input maxLength={30} />
                </Form.Item>
                <Form.Item label={t('d:entityLanguage')} name="entityLanguage">
                    <Input maxLength={15} />
                </Form.Item>
                <Form.Item
                    label={t('d:entityDeliveryPointNumber')}
                    name="entityDeliveryPointNumber"
                >
                    <Input maxLength={20} />
                </Form.Item>
                <Form.Item label={t('d:defaultCurrency')} name="defaultCurrency">
                    <Select
                        allowClear
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:defaultCurrency')
                        })}`}
                    >
                        {currencies?.map((item: any) => (
                            <Option key={item.key} value={item.key}>
                                {item.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item label={t('d:defaultDiscount')} name="defaultDiscount">
                    <InputNumber min={0} max={100} />
                </Form.Item>
                <Form.Item label={t('d:defaultPaymentTerms')} name="defaultPaymentTerms">
                    <Select
                        allowClear
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:defaultPaymentTerms')
                        })}`}
                    >
                        {paymentTerms?.map((item: any) => (
                            <Option key={item.key} value={item.key}>
                                {item.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item label={t('d:defaultPaymentMethod')} name="defaultPaymentMethod">
                    <Select
                        allowClear
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:defaultPaymentMethod')
                        })}`}
                    >
                        {paymentMethods?.map((item: any) => (
                            <Option key={item.key} value={item.key}>
                                {item.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item label={t('d:defaultPaymentAccount')} name="defaultPaymentAccount">
                    <Select
                        allowClear
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:defaultPaymentAccount')
                        })}`}
                    >
                        {bankAccounts?.map((item: any) => (
                            <Option key={item.key} value={item.key}>
                                {item.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item label={t('d:vatEligible')} name="vatEligible">
                    <Checkbox />
                </Form.Item>

                <Form.Item label={t('d:vatRate')} name="vatRateCode">
                    <Select
                        allowClear
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:vatRate')
                        })}`}
                    >
                        {vatRates?.map((item: any) => (
                            <Option key={item.key} value={item.key}>
                                {item.text}
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
