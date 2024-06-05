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
import { Button, Input, Form, Select, Space, Modal, Collapse } from 'antd';
import useTranslation from 'next-translate/useTranslation';
import { FC, useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import { showError, showSuccess, showInfo } from '@helpers';
import {
    GetThirdPartyAddressContactsQuery,
    GetThirdPartyAddressesQuery,
    UpdateOrderAddressMutation,
    UpdateOrderAddressMutationVariables,
    useGetThirdPartyAddressContactsQuery,
    useGetThirdPartyAddressesQuery,
    useUpdateOrderAddressMutation
} from 'generated/graphql';
import configs from '../../../../common/configs.json';
import { FormOptionType } from 'models/ModelsV2';

export type EditCreditAddressFormProps = {
    orderAddressId: string;
    details: any;
};

export const EditCreditAddressForm: FC<EditCreditAddressFormProps> = ({
    orderAddressId,
    details
}: EditCreditAddressFormProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes
    const [thirdPartyAddresses, setThirdPartyAddresses] = useState<Array<FormOptionType>>();
    const [chosenAddress, setChosenAddress] = useState<string | undefined>();
    const [thirdPartyAddressContacts, setThirdPartyAddressContacts] =
        useState<Array<FormOptionType>>();

    const { Option } = Select;
    const { Panel } = Collapse;

    const address = t('d:address');
    const contact = t('d:contact');
    const general = t('d:general');

    // TYPED SAFE ALL
    const [form] = Form.useForm();

    form.setFieldsValue({
        creditName: details?.order?.name,
        category: details?.category,
        categoryText: details?.categoryText,
        thirdPartyName: details?.thirdParty?.name
    });

    //ThirdPartyAddresses
    const addressesList = useGetThirdPartyAddressesQuery<
        Partial<GetThirdPartyAddressesQuery>,
        Error
    >(graphqlRequestClient, {
        filters: {
            status: configs.THIRD_PARTY_ADDRESS_STATUS_ENABLED,
            thirdPartyId: details?.thirdPartyId,
            category: details?.category
        },
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
            setChosenAddress(details.thirdPartyAddressId);
        }
    }, [addressesList.data]);

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
        itemsPerPage: 100000
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

    const { mutate, isLoading: updateLoading } = useUpdateOrderAddressMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: UpdateOrderAddressMutation,
                _variables: UpdateOrderAddressMutationVariables,
                _context: any
            ) => {
                router.push(`/credits/address/${orderAddressId}`);
            },
            onError: () => {
                showError(t('messages:error-update-data'));
            }
        }
    );

    const updateOrderAddress = ({ id, input }: UpdateOrderAddressMutationVariables) => {
        mutate({ id, input });
    };

    // Call api to create new group
    const onFinish = () => {
        form.validateFields()
            .then(() => {
                // Here make api call of something else
                const formData = form.getFieldsValue(true);

                //end part to update priorities on foreigners
                delete formData['categoryText'];
                delete formData['creditName'];
                delete formData['thirdPartyName'];
                delete formData['order'];
                delete formData['stockOwnerName'];
                delete formData['thirdParty'];

                updateOrderAddress({ id: orderAddressId, input: formData });
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
    }, [updateLoading]);

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

    //manage call back on address change
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
                <Form.Item label={t('d:creditName')} name="creditName">
                    <Input disabled />
                </Form.Item>
                <Form.Item
                    label={t('d:category')}
                    name="categoryText"
                    rules={[
                        {
                            required: true,
                            message: t('messages:error-message-empty-input')
                        }
                    ]}
                >
                    <Input disabled />
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
