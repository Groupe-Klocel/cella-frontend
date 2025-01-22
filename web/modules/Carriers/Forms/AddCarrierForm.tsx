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
import { useState, useEffect, FC } from 'react';
import { Form, Button, Modal, Collapse, Select, Input, AutoComplete, Checkbox } from 'antd';
import { WrapperForm } from '@components';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useRouter } from 'next/router';
import { showError, showSuccess } from '@helpers';
import { FilterFieldType, FormOptionType, ModelType } from 'models/ModelsV2';
import {
    CreateCarrierMutation,
    CreateCarrierMutationVariables,
    GetAllCarriersQuery,
    GetThirdPartyAddressContactsQuery,
    GetThirdPartyAddressesQuery,
    SimpleGetThirdPartiesQuery,
    useCreateCarrierMutation,
    useGetAllCarriersQuery,
    useGetThirdPartyAddressContactsQuery,
    useGetThirdPartyAddressesQuery,
    useSimpleGetThirdPartiesQuery
} from 'generated/graphql';
import { useAuth } from 'context/AuthContext';
import configs from '../../../../common/configs.json';
import { gql } from 'graphql-request';
import { CheckboxChangeEvent } from 'antd/es/checkbox';

const { Option } = Select;
const { Panel } = Collapse;

export interface IAddCarrierFormProps {
    dataModel: ModelType;
    addSteps: Array<Array<FilterFieldType>>;
    routeAfterSuccess: string;
    extraData: any;
    routeOnCancel?: string;
    setFormInfos: (formInfos: any) => void;
    dependentFields: Array<any>;
}

export const AddCarrierForm: FC<IAddCarrierFormProps> = (props: IAddCarrierFormProps) => {
    const { t } = useTranslation();
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes
    const [selectedAvailable, setSelectedAvailable] = useState<any>();
    const [selectedToBeLoaded, setSelectedToBeLoaded] = useState<any>();
    const [thirdParties, setThirdParties] = useState<Array<FormOptionType>>();
    const [thirdPartyAddresses, setThirdPartyAddresses] = useState<Array<FormOptionType>>();
    const [thirdPartyAddressContacts, setThirdPartyAddressContacts] =
        useState<Array<FormOptionType>>();

    const [form] = Form.useForm();
    const errorMessageEmptyInput = t('messages:error-message-empty-input');
    const submit = t('actions:submit');

    //ThirdParties
    const carrierThirdPartiesList = useSimpleGetThirdPartiesQuery<
        Partial<SimpleGetThirdPartiesQuery>,
        Error
    >(graphqlRequestClient, {
        filters: {
            category: [configs.THIRD_PARTY_CATEGORY_CARRIER],
            status: [configs.THIRD_PARTY_STATUS_ENABLED]
        },
        orderBy: null,
        page: 1,
        itemsPerPage: 30000
    });

    useEffect(() => {
        if (carrierThirdPartiesList) {
            const newTypeTexts: Array<any> = [];
            const cData = carrierThirdPartiesList?.data?.thirdParties?.results;
            if (cData) {
                cData.forEach((item) => {
                    newTypeTexts.push({ key: item.id, text: item.name });
                });
                newTypeTexts.sort((a, b) => a.text.localeCompare(b.text));
                setThirdParties(newTypeTexts);
            }
        }
    }, [carrierThirdPartiesList.data]);

    const [chosenThirdParty, setChosenThirdParty] = useState<string | undefined>();
    // handle call back on thirdparty change
    const handleThirdPartyChange = (value: any) => {
        setChosenThirdParty(value);
    };

    //handle dynamic filters update for third party addresses
    const defaultAddressFilters: any = { status: configs.THIRD_PARTY_ADDRESS_STATUS_ENABLED };
    const addressFilters = {
        ...defaultAddressFilters,
        ...(chosenThirdParty ? { thirdPartyId: `${chosenThirdParty}` } : {})
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
                    newTypeTexts.push({ key: item.id, text: item.entityName });
                });
                newTypeTexts.sort((a, b) => a.text.localeCompare(b.text));
                setThirdPartyAddresses(newTypeTexts);
            }
        }
    }, [addressesList.data]);

    const onAvailableChange = (e: CheckboxChangeEvent) => {
        setSelectedAvailable(e.target.checked);
        form.setFieldsValue({ available: e.target.checked });
    };
    const onToBeLoadedChange = (e: CheckboxChangeEvent) => {
        setSelectedToBeLoaded(e.target.checked);
        form.setFieldsValue({ toBeLoaded: e.target.checked });
    };

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

    // Get all civility
    useEffect(() => {
        const query = gql`
            query ListParametersForAScope($scope: String!, $code: String, $language: String) {
                listParametersForAScope(scope: $scope, code: $code, language: $language) {
                    id
                    text
                    scope
                    code
                }
            }
        `;
        const queryVariables = {
            language: router.locale,
            scope: 'civility'
        };

        graphqlRequestClient.request(query, queryVariables).then((data: any) => {
            setCivilities(data?.listParametersForAScope);
        });
    }, []);
    const [civilities, setCivilities] = useState([]);
    const civilityList = civilities.map((item: any) => ({ value: item.text }));
    const [civilityOptions, setCivilityOptions] = useState<{ value: string }[]>(civilityList);

    const handleSearch = (value: string) => {
        setCivilityOptions(
            value
                ? civilities
                      .filter((item: any) => item.text.toLowerCase().includes(value.toLowerCase()))
                      .map((item: any) => ({ value: item.text }))
                : civilityList
        );
    };

    // Get all carriers
    const carrierParents = useGetAllCarriersQuery<Partial<GetAllCarriersQuery>, Error>(
        graphqlRequestClient,
        {
            orderBy: null,
            page: 1,
            itemsPerPage: 100
        }
    );

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

    //CREATE Carrier
    const { mutate, isPending: createLoading } = useCreateCarrierMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: CreateCarrierMutation,
                _variables: CreateCarrierMutationVariables,
                _context: any
            ) => {
                setUnsavedChanges(false);
                router.push(`/carriers/${data.createCarrier.id}`);
                showSuccess(t('messages:success-created'));
            },
            onError: (err) => {
                console.log(err);
                showError(t('messages:error-creating-data'));
            }
        }
    );
    const createCarrier = ({ input }: CreateCarrierMutationVariables) => {
        mutate({ input });
    };

    const onFinish = () => {
        Modal.confirm({
            title: t('messages:create-confirm'),
            onOk: () => {
                form.validateFields()
                    .then(() => {
                        const formData = form.getFieldsValue(true);
                        delete formData.thirdPartyId;
                        delete formData.thirdPartyAddressId;
                        delete formData.thirdPartyAddressContactId;
                        createCarrier({ input: formData });
                        setUnsavedChanges(false);
                    })
                    .catch((err) => {
                        showError(t('messages:error-creating-data'));
                    });
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
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
                <Collapse style={{ marginBottom: 10 }}>
                    <Panel header={t('actions:open-prepopulate-section')} key="1">
                        <Form.Item label={t('d:customer')} name="thirdPartyId">
                            <Select
                                allowClear
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('d:customer')
                                })}`}
                                onChange={handleThirdPartyChange}
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
                <Form.Item
                    label={t('d:code')}
                    name="code"
                    rules={[{ required: true, message: errorMessageEmptyInput }]}
                >
                    <Input />
                </Form.Item>
                <Form.Item
                    label={t('d:name')}
                    name="name"
                    rules={[{ required: true, message: errorMessageEmptyInput }]}
                >
                    <Input />
                </Form.Item>
                <Form.Item label={t('d:parentCarrierId')} name="parentCarrierId">
                    <Select
                        allowClear
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:parentCarrier')
                        })}`}
                    >
                        {carrierParents?.data?.carriers?.results.map((carrierParent: any) => (
                            <Option key={carrierParent.id} value={carrierParent.id}>
                                {carrierParent.name}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item name="available">
                    <Checkbox onChange={onAvailableChange}>{t('d:available')}</Checkbox>
                </Form.Item>
                <Form.Item name="toBeLoaded">
                    <Checkbox onChange={onToBeLoadedChange}>{t('d:toBeLoaded')}</Checkbox>
                </Form.Item>

                <Form.Item label={t('d:contactName')} name="contactName">
                    <Input />
                </Form.Item>
                <Form.Item label={t('d:contactCivility')} name={'contactCivility'}>
                    <AutoComplete
                        options={civilityOptions}
                        onSearch={handleSearch}
                        onFocus={() => setCivilityOptions(civilityList)}
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:contactCivility')
                        })}`}
                        className="custom"
                    ></AutoComplete>
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
                <Form.Item label={t('d:entityName')} name="entityName">
                    <Input />
                </Form.Item>
                <Form.Item label={t('d:entityAddress1')} name="entityAddress1">
                    <Input maxLength={50} />
                </Form.Item>
                <Form.Item label={t('d:entityAddress2')} name="entityAddress2">
                    <Input maxLength={50} />
                </Form.Item>
                <Form.Item label={t('d:entityAddress3')} name="entityAddress3">
                    <Input maxLength={50} />
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
                    <Input maxLength={15} />
                </Form.Item>
                <Form.Item
                    label={t('d:entityDeliveryPointNumber')}
                    name="entityDeliveryPointNumber"
                >
                    <Input maxLength={15} />
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
