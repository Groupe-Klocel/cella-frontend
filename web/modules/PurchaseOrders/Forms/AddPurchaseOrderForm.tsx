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
import {
    Form,
    Button,
    Space,
    Modal,
    Collapse,
    Select,
    Input,
    AutoComplete,
    DatePicker
} from 'antd';
import { WrapperForm, StepsPanel, WrapperStepContent } from '@components';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useRouter } from 'next/router';
import { showError, showSuccess, showInfo, useCreate } from '@helpers';
import { FilterFieldType, FormOptionType, ModelType } from 'models/ModelsV2';
import { FormGroup } from 'modules/Crud/submodules/FormGroup';
import configs from '../../../../common/configs.json';
import {
    CreatePurchaseOrderMutation,
    CreatePurchaseOrderMutationVariables,
    GetAllStockOwnersQuery,
    GetThirdPartyAddressContactsQuery,
    GetThirdPartyAddressesQuery,
    SimpleGetThirdPartiesQuery,
    useCreatePurchaseOrderMutation,
    useGetAllStockOwnersQuery,
    useGetThirdPartyAddressContactsQuery,
    useGetThirdPartyAddressesQuery,
    useListConfigsForAScopeQuery,
    useSimpleGetThirdPartiesQuery
} from 'generated/graphql';
import { useAuth } from 'context/AuthContext';
import TextArea from 'antd/es/input/TextArea';
import dayjs from 'dayjs';
import { gql } from 'graphql-request';
import fr_FR from 'antd/lib/date-picker/locale/fr_FR';
import en_US from 'antd/lib/date-picker/locale/en_US';

const { Option } = Select;
const { Panel } = Collapse;

export interface IAddPurchaseOrderFormProps {
    dataModel: ModelType;
    addSteps: Array<Array<FilterFieldType>>;
    routeAfterSuccess: string;
    extraData: any;
    routeOnCancel?: string;
    setFormInfos: (formInfos: any) => void;
    dependentFields: Array<any>;
}

export const AddPurchaseOrderForm: FC<IAddPurchaseOrderFormProps> = (
    props: IAddPurchaseOrderFormProps
) => {
    const { t } = useTranslation();
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes
    const [thirdParties, setThirdParties] = useState<Array<FormOptionType>>();
    const [thirdPartyAddresses, setThirdPartyAddresses] = useState<Array<FormOptionType>>();
    const [thirdPartyAddressContacts, setThirdPartyAddressContacts] =
        useState<Array<FormOptionType>>();

    const [current, setCurrent] = useState(0);
    const [form] = Form.useForm();
    const errorMessageEmptyInput = t('messages:error-message-empty-input');
    const submit = t('actions:submit');

    // Get all stockOwners
    const stockOwnerList = useGetAllStockOwnersQuery<Partial<GetAllStockOwnersQuery>, Error>(
        graphqlRequestClient,
        {
            orderBy: null,
            page: 1,
            itemsPerPage: 100
        }
    );

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

    // Get all type
    const typeList = useListConfigsForAScopeQuery(graphqlRequestClient, {
        language: router.locale,
        scope: 'purchase_order_type'
    });
    const excludedCodes = ['10100', '10104'];
    const filteredConfigs = typeList.data?.listConfigsForAScope.filter(
        (config: any) => !excludedCodes.includes(config.code)
    );

    //ThirdParties
    const supplierThirdPartiesList = useSimpleGetThirdPartiesQuery<
        Partial<SimpleGetThirdPartiesQuery>,
        Error
    >(graphqlRequestClient, {
        filters: {
            category: [configs.THIRD_PARTY_CATEGORY_SUPPLIER],
            status: [configs.THIRD_PARTY_STATUS_ENABLED]
        },
        orderBy: null,
        page: 1,
        itemsPerPage: 30000
    });

    useEffect(() => {
        if (supplierThirdPartiesList) {
            const newTypeTexts: Array<any> = [];
            const cData = supplierThirdPartiesList?.data?.thirdParties?.results;
            if (cData) {
                cData.forEach((item) => {
                    newTypeTexts.push({ key: item.id, text: item.name });
                });
                newTypeTexts.sort((a, b) => a.text.localeCompare(b.text));
                setThirdParties(newTypeTexts);
            }
        }
    }, [supplierThirdPartiesList.data]);

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

    //manage call back on address change
    const [chosenAddress, setChosenAddress] = useState<string | undefined>();
    const handleAddressChange = (key: any, value: any) => {
        // if we clear the select, we clear the form
        if (value === null || value === undefined) {
            setChosenAddress(undefined);
            form.setFieldsValue({
                supplier: null,
                entityCode: null,
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
                        supplier: address.thirdParty.name,
                        entityCode: address.entityCode,
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

    //CREATE PURCHASE ORDER
    const { mutate, isPending: createLoading } = useCreatePurchaseOrderMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: CreatePurchaseOrderMutation,
                _variables: CreatePurchaseOrderMutationVariables,
                _context: any
            ) => {
                setUnsavedChanges(false);
                router.push(`/purchase-orders/${data.createPurchaseOrder.id}`);
                showSuccess(t('messages:success-created'));
            },
            onError: (err) => {
                console.log(err);
                showError(t('messages:error-creating-data'));
            }
        }
    );
    const createPurchaseOrder = ({ input }: CreatePurchaseOrderMutationVariables) => {
        mutate({ input });
    };

    const onFinish = () => {
        Modal.confirm({
            title: t('messages:create-confirm'),
            onOk: () => {
                const nowDate = dayjs();
                form.validateFields()
                    .then(() => {
                        form.setFieldsValue({
                            status: configs.PURCHASE_ORDER_STATUS_IN_PROGRESS,
                            orderDate: nowDate
                        });
                        const formData = form.getFieldsValue(true);

                        delete formData.thirdPartyId;
                        delete formData.thirdPartyAddressId;
                        delete formData.thirdPartyAddressContactId;

                        createPurchaseOrder({ input: formData });
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
                        <Form.Item label={t('d:supplier')} name="thirdPartyId">
                            <Select
                                allowClear
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('d:supplier')
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
                    label={t('d:stockOwner_name')}
                    name="stockOwnerId"
                    rules={[{ required: true, message: errorMessageEmptyInput }]}
                >
                    <Select
                        allowClear
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:stockOwner')
                        })}`}
                    >
                        {stockOwnerList?.data?.stockOwners?.results.map((stockOwner: any) => (
                            <Option key={stockOwner.id} value={stockOwner.id}>
                                {stockOwner.name}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item label={t('d:purchaseOrder_name')} name="name">
                    <Input />
                </Form.Item>
                <Form.Item
                    label={t('d:entityName')}
                    name="entityName"
                    rules={[{ required: true, message: errorMessageEmptyInput }]}
                >
                    <Input maxLength={50} />
                </Form.Item>
                <Form.Item label={t('d:entityCode')} name="entityCode">
                    <Input />
                </Form.Item>
                <Form.Item label={t('d:expectedGoodsInDate')} name={'expectedGoodsInDate'}>
                    <DatePicker
                        format={router.locale === 'fr' ? 'DD/MM/YYYY' : 'MM/DD/YYYY'}
                        locale={router.locale === 'fr' ? fr_FR : en_US}
                    />
                </Form.Item>
                <Form.Item label={t('d:comment')} name="comment">
                    <TextArea />
                </Form.Item>
                <Form.Item
                    label={t('d:type')}
                    name="type"
                    rules={[{ required: true, message: errorMessageEmptyInput }]}
                >
                    <Select
                        allowClear
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:type')
                        })}`}
                    >
                        {filteredConfigs?.map((type: any) => (
                            <Option key={type.id} value={parseInt(type.code)}>
                                {type.text}
                            </Option>
                        ))}
                    </Select>
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
                <Form.Item label={t('d:contactLanguage')} name="contactLanguage">
                    <Input maxLength={15} />
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
                <Form.Item label={t('d:contactName')} name="contactName">
                    <Input maxLength={100} />
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
                    <Input maxLength={50} />
                </Form.Item>

                <Form.Item label={t('d:contactLastName')} name="contactLastName">
                    <Input maxLength={50} />
                </Form.Item>

                <Form.Item label={t('d:contactPhone')} name="contactPhone">
                    <Input maxLength={50} />
                </Form.Item>

                <Form.Item label={t('d:contactMobile')} name="contactMobile">
                    <Input maxLength={50} />
                </Form.Item>

                <Form.Item
                    label={t('d:contactEmail')}
                    name="contactEmail"
                    normalize={(value) => (value ? value : undefined)}
                >
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
