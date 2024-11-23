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
import { HeaderContent, WrapperForm } from '@components';
import { gql, GraphQLClient } from 'graphql-request';
import { Button, AutoComplete, Input, Form, Select, Collapse, Modal } from 'antd';
import useTranslation from 'next-translate/useTranslation';
import { SetStateAction, useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import { showError, showSuccess, showInfo, GraphQLResponseType } from '@helpers';
import { debounce, result, set } from 'lodash';
import { FormOptionType } from 'models/Models';
import configs from '../../../../common/configs.json';
import {
    GetThirdPartiesQuery,
    GetThirdPartyAddressContactsQuery,
    GetThirdPartyAddressesQuery,
    useGetThirdPartiesQuery,
    useGetThirdPartyAddressContactsQuery,
    useGetThirdPartyAddressesQuery,
    useListConfigsForAScopeQuery,
    useCreateOrderAddressMutation,
    CreateOrderAddressMutation,
    CreateOrderAddressMutationVariables,
    useGetOrderByIdQuery,
    GetOrderByIdQuery,
    GetParameterByIdDocument
} from 'generated/graphql';

const { Option } = Select;
const { Panel } = Collapse;

export interface ISingleItemProps {
    orderId: string | any;
    orderName: string | any;
    routeOnCancel?: string;
}

interface MappedAdresses {
    address1: string;
    city: string;
    postalCode: string;
}

export const AddCustomerOrderAddressForm = (props: ISingleItemProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const [category, setCategory] = useState<Array<FormOptionType>>();
    const [thirdPartyAddresses, setThirdPartyAddresses] = useState<Array<FormOptionType>>();
    const [thirdPartyAddressContacts, setThirdPartyAddressContacts] =
        useState<Array<FormOptionType>>();
    const [chosenThirdParty, setChosenThirdParty] = useState<string | undefined>();
    const [unsavedChanges, setUnsavedChanges] = useState(false);

    const [dataLocations, setDataLocations] = useState<any>();
    const [aIdOptions, setAIdOptions] = useState<Array<any>>([]);
    const [addressInput, setAddressInput] = useState<string>('');

    const address = t('d:address');
    const contact = t('d:contact');
    const general = t('d:general');

    const order = useGetOrderByIdQuery<GetOrderByIdQuery, Error>(graphqlRequestClient, {
        id: props.orderId
    });

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

    useEffect(() => {
        if (order) {
            form.setFieldsValue({ thirdPartyId: order.data?.order?.thirdPartyId });
            form.setFieldsValue({
                thirdPartyName:
                    order.data?.order?.thirdParty?.name +
                    ' - ' +
                    order.data?.order?.thirdParty?.description,
                customerOrderName: order.data?.order?.name
            });
            const thirdPartyIdOrder = order.data?.order?.thirdPartyId;
            if (thirdPartyIdOrder) {
                setChosenThirdParty(thirdPartyIdOrder);
            }
        }
    }, [order.data]);

    // PARAMETER : category
    const categoryList = useListConfigsForAScopeQuery(graphqlRequestClient, {
        language: router.locale,
        scope: 'third_party_address_category'
    });
    useEffect(() => {
        if (categoryList) {
            const newCategory: Array<FormOptionType> = [];

            const parameters = categoryList?.data?.listConfigsForAScope;
            if (parameters) {
                parameters.forEach((item) => {
                    newCategory.push({ key: parseInt(item.code), text: item.text });
                });
                setCategory(newCategory);
            }
        }
    }, [categoryList.data]);

    const [chosenCategory, setChosenCategory] = useState<number | undefined>();
    // handle call back on category change
    const handleCategoryChange = (value: number) => {
        setChosenCategory(value);
    };

    //handle dynamic filters update for third party addresses
    const defaultAddressFilters: any = { status: configs.THIRD_PARTY_ADDRESS_STATUS_ENABLED };
    const addressFilters = {
        ...defaultAddressFilters,
        ...(chosenThirdParty ? { thirdPartyId: `${chosenThirdParty}` } : {}),
        ...(chosenCategory ? { category: chosenCategory } : {})
    };

    //ThirdPartyAddresses
    const addressesList = useGetThirdPartyAddressesQuery<
        Partial<GetThirdPartyAddressesQuery>,
        Error
    >(graphqlRequestClient, {
        filters: addressFilters,
        orderBy: null,
        page: 1,
        itemsPerPage: 100
    });

    useEffect(() => {
        if (addressesList) {
            const newTypeTexts: Array<any> = [];
            const cData = addressesList?.data?.thirdPartyAddresses?.results;
            if (cData) {
                cData.forEach((item) => {
                    newTypeTexts.push({
                        key: item.id,
                        text: item.entityName + ' (' + item.categoryText + ')'
                    });
                });
                newTypeTexts.sort((a, b) => a.text.localeCompare(b.text));
                setThirdPartyAddresses(newTypeTexts);
            }
        }
    }, [addressesList.data]);

    //manage call back on address change
    const [chosenAddress, setChosenAddress] = useState<string | undefined>();
    const handleAddressChange = (key: any, value: any) => {
        // if we clear the select, we clear the form
        if (value === null || value === undefined) {
            setChosenAddress(undefined);
            form.setFieldsValue({
                entityName: null,
                entityStreetNumber: null,
                entityAddress1: null,
                entityAddress2: null,
                entityAddress3: null,
                entityPostCode: null,
                entityCity: null,
                entityState: null,
                entityDistrict: null,
                entityCountry: null,
                entityCountryCode: null,
                entityVatCode: null,
                entityEoriCode: null,
                entityAccountingCode: null,
                entityIdentificationNumber: null,
                entityLanguage: null,
                entityDeliveryPointNumber: null,
                category: null
            });
        }

        // if we select a new value, we fill the form
        if (addressesList.data) {
            addressesList.data.thirdPartyAddresses?.results.forEach((address: any) => {
                if (address.id == key) {
                    setChosenAddress(value?.key);
                    form.setFieldsValue({
                        entityName: address.entityName,
                        entityStreetNumber: address.entityStreetNumber,
                        entityAddress1: address.entityAddress1,
                        entityAddress2: address.entityAddress2,
                        entityAddress3: address.entityAddress3,
                        entityPostCode: address.entityPostCode,
                        entityCity: address.entityCity,
                        entityState: address.entityState,
                        entityDistrict: address.entityDistrict,
                        entityCountry: address.entityCountry,
                        entityCountryCode: address.entityCountryCode,
                        entityVatCode: address.entityVatCode,
                        entityEoriCode: address.entityEoriCode,
                        entityAccountingCode: address.entityAccountingCode,
                        entityIdentificationNumber: address.entityIdentificationNumber,
                        entityLanguage: address.entityLanguage,
                        entityDeliveryPointNumber: address.entityDeliveryPointNumber,
                        category: address.category
                    });
                }
            });
        }
    };

    //handle dynamic filters update for third party address contacts
    const defaultContactFilters: any = {
        status: configs.THIRD_PARTY_ADDRESS_CONTACT_STATUS_ENABLED
    };
    const contactFilters = {
        ...defaultContactFilters,
        ...(chosenAddress ? { thirdPartyAddressId: `${chosenAddress}` } : {})
    };

    //ThirdPartyAddressContacts
    const contactsList = useGetThirdPartyAddressContactsQuery<
        Partial<GetThirdPartyAddressContactsQuery>,
        Error
    >(graphqlRequestClient, {
        filters: contactFilters,
        orderBy: null,
        page: 1,
        itemsPerPage: 100
    });

    useEffect(() => {
        if (contactsList) {
            const newTypeTexts: Array<any> = [];
            const cData = contactsList?.data?.thirdPartyAddressContacts?.results;
            if (cData) {
                cData.forEach((item) => {
                    newTypeTexts.push({ key: item.id, text: item.contactName });
                });
                newTypeTexts.sort((a, b) => a.text.localeCompare(b.text));
                setThirdPartyAddressContacts(newTypeTexts);
            }
        }
    }, [contactsList.data]);

    const handleContactChange = (key: any, value: any) => {
        // if we clear the select, we clear the form
        if (value === null || value === undefined) {
            form.setFieldsValue({
                contactName: null,
                contactCivility: null,
                contactFirstName: null,
                contactLastName: null,
                contactPhone: null,
                contactMobile: null,
                contactEmail: null,
                contactLanguage: null
            });
        }

        // if we select a new value, we fill the form
        if (contactsList.data) {
            contactsList.data.thirdPartyAddressContacts?.results.forEach((contact: any) => {
                if (contact.id == key) {
                    form.setFieldsValue({
                        contactName: contact.contactName,
                        contactCivility: contact.contactCivility,
                        contactFirstName: contact.contactFirstName,
                        contactLastName: contact.contactLastName,
                        contactPhone: contact.contactPhone,
                        contactMobile: contact.contactMobile,
                        contactEmail: contact.contactEmail,
                        contactLanguage: contact.contactLanguage
                    });
                }
            });
        }
    };

    const submit = t('actions:submit');

    // TYPED SAFE ALL
    const [form] = Form.useForm();

    //CREATE order address
    const { mutate, isPending: createLoading } = useCreateOrderAddressMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: CreateOrderAddressMutation,
                _variables: CreateOrderAddressMutationVariables,
                _context: any
            ) => {
                setUnsavedChanges(false);
                router.push(`/customer-orders/${props.orderId}`);
                showSuccess(t('messages:success-created'));
            },
            onError: (err) => {
                showError(t('messages:error-creating-data'));
            }
        }
    );

    const createCustomerOrderAddress = ({ input }: CreateOrderAddressMutationVariables) => {
        mutate({ input });
    };

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                // Here make api call of something else
                const formData = form.getFieldsValue(true);
                delete formData.customerOrderName;
                delete formData.thirdPartyName;
                createCustomerOrderAddress({ input: formData });
                setUnsavedChanges(false);
            })
            .catch((err) => {
                showError(t('messages:error-creating-data'));
            });
    };

    useEffect(() => {
        const tmp_details = {
            customerOrderName: props.orderName,
            orderId: props.orderId
        };
        form.setFieldsValue(tmp_details);
        if (createLoading) {
            showInfo(t('messages:info-create-wip'));
        }
    }, [createLoading]);

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
                    const queryKloshipResult: GraphQLResponseType = await clientKloship.request(
                        queryKloship,
                        {
                            auth,
                            input
                        }
                    );
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
                <Form.Item label={t('d:customerOrderName')} name="customerOrderName">
                    <Input disabled />
                </Form.Item>
                <Form.Item
                    label={t('d:category')}
                    name="category"
                    rules={[
                        {
                            required: true,
                            message: t('messages:error-message-empty-input')
                        }
                    ]}
                >
                    <Select
                        allowClear
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:category')
                        })}`}
                        onChange={handleCategoryChange}
                    >
                        {category?.map((item: any) => (
                            <Option key={item.key} value={item.key}>
                                {item.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Collapse style={{ marginBottom: 10 }}>
                    <Panel header={t('actions:open-prepopulate-section')} key="1">
                        <Form.Item label={t('d:customer')} name="thirdPartyName">
                            <Input disabled />
                        </Form.Item>
                        <Form.Item
                            label={t('d:third-party-address-model')}
                            name="thirdPartyAddressId"
                        >
                            <Select
                                allowClear
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('d:third-party-address-model')
                                })}`}
                                onChange={handleAddressChange}
                            >
                                {thirdPartyAddresses?.map((item: any) => (
                                    <Option key={item.key} value={item.key}>
                                        {item.text}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item
                            label={t('d:third-party-address-contact-model')}
                            name="thirdPartyAddressContactId"
                        >
                            <Select
                                allowClear
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('d:third-party-address-contact-model')
                                })}`}
                                onChange={handleContactChange}
                            >
                                {thirdPartyAddressContacts?.map((item: any) => (
                                    <Option key={item.key} value={item.key}>
                                        {item.text}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Panel>
                </Collapse>
                <HeaderContent title={address}>
                    <Form.Item label={t('d:entityName')} name="entityName">
                        <Input />
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
                        <Input />
                    </Form.Item>
                    <Form.Item label={t('d:entityAddress2')} name="entityAddress2">
                        <Input />
                    </Form.Item>
                    <Form.Item label={t('d:entityAddress3')} name="entityAddress3">
                        <Input />
                    </Form.Item>
                    <Form.Item label={t('d:entityStreetNumber')} name="entityStreetNumber">
                        <Input />
                    </Form.Item>
                    <Form.Item label={t('d:entityPostCode')} name="entityPostCode">
                        <Input />
                    </Form.Item>
                    <Form.Item label={t('d:entityCity')} name="entityCity">
                        <Input />
                    </Form.Item>
                    <Form.Item label={t('d:entityState')} name="entityState">
                        <Input />
                    </Form.Item>
                    <Form.Item label={t('d:entityDistrict')} name="entityDistrict">
                        <Input />
                    </Form.Item>
                    <Form.Item
                        label={t('d:entityCountry')}
                        name="entityCountry"
                        initialValue={'France'}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        label={t('d:entityCountryCode')}
                        name="entityCountryCode"
                        initialValue={'FR'}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item label={t('d:entityVatCode')} name="entityVatCode">
                        <Input />
                    </Form.Item>
                    <Form.Item label={t('d:entityEoriCode')} name="entityEoriCode">
                        <Input />
                    </Form.Item>
                    <Form.Item label={t('d:entityAccountingCode')} name="entityAccountingCode">
                        <Input />
                    </Form.Item>
                    <Form.Item
                        label={t('d:entityIdentificationNumber')}
                        name="entityIdentificationNumber"
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item label={t('d:entityLanguage')} name="entityLanguage">
                        <Input />
                    </Form.Item>
                    <Form.Item
                        label={t('d:entityDeliveryPointNumber')}
                        name="entityDeliveryPointNumber"
                    >
                        <Input />
                    </Form.Item>
                </HeaderContent>
                <HeaderContent title={contact}>
                    <Form.Item label={t('d:contactName')} name="contactName">
                        <Input />
                    </Form.Item>
                    <Form.Item label={t('d:contactCivility')} name="contactCivility">
                        <Input />
                    </Form.Item>
                    <Form.Item label={t('d:contactFirstName')} name="contactFirstName">
                        <Input />
                    </Form.Item>
                    <Form.Item label={t('d:contactLastName')} name="contactLastName">
                        <Input />
                    </Form.Item>
                    <Form.Item label={t('d:contactPhone')} name="contactPhone">
                        <Input />
                    </Form.Item>
                    <Form.Item label={t('d:contactMobile')} name="contactMobile">
                        <Input />
                    </Form.Item>
                    <Form.Item label={t('d:contactEmail')} name="contactEmail">
                        <Input />
                    </Form.Item>
                    <Form.Item label={t('d:contactLanguage')} name="contactLanguage">
                        <Input />
                    </Form.Item>
                </HeaderContent>
                <HeaderContent title={general}>
                    <Form.Item label={t('d:reference1')} name="reference1">
                        <Input />
                    </Form.Item>
                    <Form.Item label={t('d:reference2')} name="reference2">
                        <Input />
                    </Form.Item>
                    <Form.Item label={t('d:reference3')} name="reference3">
                        <Input />
                    </Form.Item>
                </HeaderContent>
            </Form>
            <div style={{ textAlign: 'center' }}>
                <Button type="primary" loading={createLoading} onClick={onFinish}>
                    {submit}
                </Button>
                <Button onClick={onCancel}>{t('actions:cancel')}</Button>
            </div>
        </WrapperForm>
    );
};
