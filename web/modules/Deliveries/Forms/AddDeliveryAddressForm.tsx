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
import { Button, Input, Form, Select, Collapse } from 'antd';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import { showError, showSuccess, showInfo } from '@helpers';
import { FormOptionType } from 'models/Models';
import {
    CreateDeliveryAddressMutation,
    CreateDeliveryAddressMutationVariables,
    GetDeliveryByIdQuery,
    GetThirdPartiesQuery,
    GetThirdPartyAddressContactsQuery,
    GetThirdPartyAddressesQuery,
    SimpleGetThirdPartiesQuery,
    useCreateDeliveryAddressMutation,
    useGetDeliveryByIdQuery,
    useGetThirdPartiesQuery,
    useGetThirdPartyAddressContactsQuery,
    useGetThirdPartyAddressesQuery,
    useListConfigsForAScopeQuery,
    useSimpleGetThirdPartiesQuery
} from 'generated/graphql';
import configs from '../../../../common/configs.json';
import { gql } from 'graphql-request';

interface IOption {
    value: string;
    id: string;
}
const { Option } = Select;
const { Panel } = Collapse;

export interface ISingleItemProps {
    deliveryId: string | any;
    deliveryName: string | any;
}

export const AddDeliveryAddressForm = (props: ISingleItemProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const [category, setCategory] = useState<Array<FormOptionType>>();
    const [thirdParties, setThirdParties] = useState<Array<FormOptionType>>();
    const [thirdPartyAddresses, setThirdPartyAddresses] = useState<Array<FormOptionType>>();
    const [thirdPartyAddressContacts, setThirdPartyAddressContacts] =
        useState<Array<FormOptionType>>();

    //ThirdParties
    const delivery = useGetDeliveryByIdQuery<GetDeliveryByIdQuery, Error>(graphqlRequestClient, {
        id: props.deliveryId
    });
    useEffect(() => {
        if (delivery) {
            form.setFieldsValue({ thirdPartyId: delivery.data?.delivery?.thirdPartyId });
            form.setFieldsValue({
                thirdPartyName:
                    delivery.data?.delivery?.thirdParty?.name +
                    ' - ' +
                    delivery.data?.delivery?.thirdParty?.description,
                customerOrderName: delivery.data?.delivery?.name
            });
            const thirdPartyIdOrder = delivery.data?.delivery?.thirdPartyId;
            if (thirdPartyIdOrder) {
                setChosenThirdParty(thirdPartyIdOrder);
            }
        }
    }, [delivery.data]);
    const customerThirdPartiesList = useSimpleGetThirdPartiesQuery<
        Partial<SimpleGetThirdPartiesQuery>,
        Error
    >(graphqlRequestClient, {
        filters: {
            category: [configs.THIRD_PARTY_CATEGORY_CUSTOMER],
            status: [configs.THIRD_PARTY_STATUS_ENABLED]
        },
        orderBy: null,
        page: 1,
        itemsPerPage: 30000
    });

    useEffect(() => {
        if (customerThirdPartiesList) {
            const newTypeTexts: Array<any> = [];
            const cData = customerThirdPartiesList?.data?.thirdParties?.results;
            if (cData) {
                cData.forEach((item) => {
                    newTypeTexts.push({ key: item.id, text: item.name });
                });
                newTypeTexts.sort((a, b) => a.text.localeCompare(b.text));
                setThirdParties(newTypeTexts);
            }
        }
    }, [customerThirdPartiesList.data]);

    const [chosenThirdParty, setChosenThirdParty] = useState<string | undefined>();

    // handle call back on thirdparty change
    const handleThirdPartyChange = async (value: any) => {
        setChosenThirdParty(value);
    };

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
                    newTypeTexts.push({ key: item.id, text: item.entityName ?? item.entityCode });
                });
                newTypeTexts.sort((a, b) => a?.text?.localeCompare(b?.text));
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
                entityDeliveryPointNumber: null
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
                        entityDeliveryPointNumber: address.entityDeliveryPointNumber
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

    //CREATE delivery address
    const { mutate, isLoading: createLoading } = useCreateDeliveryAddressMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: CreateDeliveryAddressMutation,
                _variables: CreateDeliveryAddressMutationVariables,
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

    const createDeliveryAddress = ({ input }: CreateDeliveryAddressMutationVariables) => {
        mutate({ input });
    };

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                // Here make api call of something else
                const formData = form.getFieldsValue(true);
                delete formData.deliveryName;
                delete formData.thirdPartyName;
                delete formData.customerOrderName;
                createDeliveryAddress({ input: formData });
            })
            .catch((err) => {
                showError(t('messages:error-creating-data'));
            });
    };

    useEffect(() => {
        const tmp_details = {
            deliveryName: props.deliveryName,
            deliveryId: props.deliveryId
        };
        form.setFieldsValue(tmp_details);
        if (createLoading) {
            showInfo(t('messages:info-create-wip'));
        }
    }, [createLoading]);

    return (
        <WrapperForm>
            <Form form={form} layout="vertical" scrollToFirstError>
                <Form.Item label={t('d:deliveryName')} name="deliveryName">
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
                        <Form.Item label={t('d:customer')} name="thirdPartyId">
                            <Select
                                allowClear
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('d:customer')
                                })}`}
                                onChange={handleThirdPartyChange}
                                showSearch
                                filterOption={(input, option) =>
                                    option?.props.children
                                        .toLowerCase()
                                        .indexOf(input.toLowerCase()) >= 0
                                }
                            >
                                {thirdParties?.map((item: any) => (
                                    <Option key={item.key} value={item.key}>
                                        {item.text}
                                    </Option>
                                ))}
                            </Select>
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
                                showSearch
                                filterOption={(input, option) =>
                                    option?.props.children
                                        .toLowerCase()
                                        .indexOf(input.toLowerCase()) >= 0
                                }
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
                                showSearch
                                filterOption={(input, option) =>
                                    option?.props.children
                                        .toLowerCase()
                                        .indexOf(input.toLowerCase()) >= 0
                                }
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
                <Form.Item label={t('d:entityName')} name="entityName">
                    <Input />
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
                <Form.Item label={t('d:entityCountry')} name="entityCountry">
                    <Input />
                </Form.Item>
                <Form.Item label={t('d:entityCountryCode')} name="entityCountryCode">
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
                <Form.Item label={t('d:reference1')} name="reference1">
                    <Input />
                </Form.Item>
                <Form.Item label={t('d:reference2')} name="reference2">
                    <Input />
                </Form.Item>
                <Form.Item label={t('d:reference3')} name="reference3">
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
