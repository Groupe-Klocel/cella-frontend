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
import { Form, Button, Space, Modal, Select, Card, Divider, Collapse } from 'antd';
import { WrapperForm, StepsPanel, WrapperStepContent } from '@components';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useRouter } from 'next/router';

import { showError, showSuccess, showInfo, useCreate } from '@helpers';
import { FilterFieldType, FormOptionType, ModelType } from 'models/ModelsV2';
import {
    GetThirdPartiesQuery,
    GetThirdPartyAddressContactsQuery,
    GetThirdPartyAddressesQuery,
    SimpleGetThirdPartiesQuery,
    useGetThirdPartiesQuery,
    useGetThirdPartyAddressContactsQuery,
    useGetThirdPartyAddressesQuery,
    useSimpleGetThirdPartiesQuery
} from 'generated/graphql';
import { useAuth } from 'context/AuthContext';
import configs from '../../../../common/configs.json';
import { FormGroup } from 'modules/Crud/submodules/FormGroup';

const { Option } = Select;
const { Panel } = Collapse;

export interface IAddStockOwnerFormProps {
    dataModel: ModelType;
    addSteps: Array<Array<FilterFieldType>>;
    routeAfterSuccess: string;
    extraData: any;
    routeOnCancel?: string;
    setFormInfos: (formInfos: any) => void;
    dependentFields: Array<any>;
}

export const AddStockOwnerForm: FC<IAddStockOwnerFormProps> = (props: IAddStockOwnerFormProps) => {
    const { t } = useTranslation();
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes
    const [thirdParties, setThirdParties] = useState<Array<FormOptionType>>();
    const [thirdPartyAddresses, setThirdPartyAddresses] = useState<Array<FormOptionType>>();
    const [thirdPartyAddressHeadOfficeContacts, setThirdPartyAddressHeadOfficeContacts] =
        useState<Array<FormOptionType>>();
    const [thirdPartyAddressSenderContacts, setThirdPartyAddressSenderContacts] =
        useState<Array<FormOptionType>>();

    const [current, setCurrent] = useState(0);
    const [form] = Form.useForm();

    // #region extract data from modelV2
    const detailFields = Object.keys(props.dataModel.fieldsInfo).filter(
        (key) => props.dataModel.fieldsInfo[key].isDetailRequested
    );
    // #endregion

    //ThirdParties
    const stockOwnerThirdPartiesList = useSimpleGetThirdPartiesQuery<
        Partial<SimpleGetThirdPartiesQuery>,
        Error
    >(graphqlRequestClient, {
        filters: {
            category: [configs.THIRD_PARTY_CATEGORY_STOCK_OWNER],
            status: [configs.THIRD_PARTY_STATUS_ENABLED]
        },
        orderBy: null,
        page: 1,
        itemsPerPage: 30000
    });

    useEffect(() => {
        if (stockOwnerThirdPartiesList) {
            const newTypeTexts: Array<any> = [];
            const cData = stockOwnerThirdPartiesList?.data?.thirdParties?.results;
            if (cData) {
                cData.forEach((item) => {
                    newTypeTexts.push({ key: item.id, text: item.name });
                });
                newTypeTexts.sort((a, b) => a.text.localeCompare(b.text));
                setThirdParties(newTypeTexts);
            }
        }
    }, [stockOwnerThirdPartiesList.data]);

    const [chosenThirdParty, setChosenThirdParty] = useState<string | undefined>();
    // handle call back on thirdparty change
    const handleThirdPartyChange = (value: any) => {
        setChosenThirdParty(value);
    };

    //handle dynamic filters update for third party addresses
    const defaultFilters: any = { status: configs.THIRD_PARTY_ADDRESS_STATUS_ENABLED };
    const addressFilters = {
        ...defaultFilters,
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
                    newTypeTexts.push({
                        key: item.id,
                        text: item.entityName,
                        category: item.category
                    });
                });
                newTypeTexts.sort((a, b) => a.text.localeCompare(b.text));
                setThirdPartyAddresses(newTypeTexts);
            }
        }
    }, [addressesList.data]);

    //manage call back on addresses changes
    const [chosenHeadOfficeAddress, setChosenHeadOfficeAddress] = useState<string | undefined>();
    const handleHeadOfficeAddressChange = (key: any, value: any) => {
        // if we clear the select, we clear the form
        if (value === null || value === undefined) {
            setChosenHeadOfficeAddress(undefined);
            form.setFieldsValue({
                name: null,
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
                    setChosenHeadOfficeAddress(value?.key);
                    form.setFieldsValue({
                        name: address.entityName,
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

    const [chosenSenderAddress, setChosenSenderAddress] = useState<string | undefined>();
    const handleSenderAddressChange = (key: any, value: any) => {
        // if we clear the select, we clear the form
        if (value === null || value === undefined) {
            setChosenSenderAddress(undefined);
            form.setFieldsValue({
                senderName: null,
                senderAddress1: null,
                senderAddress2: null,
                senderAddress3: null,
                senderPostCode: null,
                senderCity: null,
                senderCountry: null,
                senderCountryCode: null
            });
        }

        // if we select a new value, we fill the form
        if (addressesList.data) {
            addressesList.data.thirdPartyAddresses?.results.forEach((address: any) => {
                if (address.id == key) {
                    setChosenSenderAddress(value?.key);
                    form.setFieldsValue({
                        senderName: address.entityName,
                        senderAddress1: address.entityAddress1,
                        senderAddress2: address.entityAddress2,
                        senderAddress3: address.entityAddress3,
                        senderPostCode: address.entityPostCode,
                        senderCity: address.entityCity,
                        senderCountry: address.entityCountry,
                        senderCountryCode: address.entityCountryCode
                    });
                }
            });
        }
    };

    //handle dynamic filters update for third party address contacts
    const defaultContactFilters: any = {
        status: configs.THIRD_PARTY_ADDRESS_CONTACT_STATUS_ENABLED
    };
    const headOfficeContactFilters = {
        ...defaultContactFilters,
        ...(chosenHeadOfficeAddress ? { thirdPartyAddressId: `${chosenHeadOfficeAddress}` } : {})
    };

    const senderContactFilters = {
        ...defaultContactFilters,
        ...(chosenSenderAddress ? { thirdPartyAddressId: `${chosenSenderAddress}` } : {})
    };

    //ThirdPartyAddressContacts
    const headOfficeContactsList = useGetThirdPartyAddressContactsQuery<
        Partial<GetThirdPartyAddressContactsQuery>,
        Error
    >(graphqlRequestClient, {
        filters: headOfficeContactFilters,
        orderBy: null,
        page: 1,
        itemsPerPage: 100
    });

    //ThirdPartyAddressContacts
    const senderContactsList = useGetThirdPartyAddressContactsQuery<
        Partial<GetThirdPartyAddressContactsQuery>,
        Error
    >(graphqlRequestClient, {
        filters: senderContactFilters,
        orderBy: null,
        page: 1,
        itemsPerPage: 100
    });

    useEffect(() => {
        if (headOfficeContactsList) {
            const newTypeTexts: Array<any> = [];
            const cData = headOfficeContactsList?.data?.thirdPartyAddressContacts?.results;
            if (cData) {
                cData.forEach((item) => {
                    newTypeTexts.push({ key: item.id, text: item.contactName });
                });
                newTypeTexts.sort((a, b) => a.text.localeCompare(b.text));
                setThirdPartyAddressHeadOfficeContacts(newTypeTexts);
            }
        }
    }, [headOfficeContactsList.data]);

    useEffect(() => {
        if (senderContactsList) {
            const newTypeTexts: Array<any> = [];
            const cData = senderContactsList?.data?.thirdPartyAddressContacts?.results;
            if (cData) {
                cData.forEach((item) => {
                    newTypeTexts.push({ key: item.id, text: item.contactName });
                });
                newTypeTexts.sort((a, b) => a.text.localeCompare(b.text));
                setThirdPartyAddressSenderContacts(newTypeTexts);
            }
        }
    }, [senderContactsList.data]);

    const handleHeadOfficeContactChange = (key: any, value: any) => {
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
        if (headOfficeContactsList.data) {
            headOfficeContactsList.data.thirdPartyAddressContacts?.results.forEach(
                (contact: any) => {
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
                }
            );
        }
    };

    const handleSenderContactChange = (key: any, value: any) => {
        // if we clear the select, we clear the form
        if (value === null || value === undefined) {
            form.setFieldsValue({
                senderContact: null,
                senderPhone: null,
                senderMobile: null,
                senderEmail: null
            });
        }

        // if we select a new value, we fill the form
        if (senderContactsList.data) {
            senderContactsList.data.thirdPartyAddressContacts?.results.forEach((contact: any) => {
                if (contact.id == key) {
                    form.setFieldsValue({
                        senderContact: contact.contactName,
                        senderPhone: contact.contactPhone,
                        senderMobile: contact.contactMobile,
                        senderEmail: contact.contactEmail
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

    const {
        isLoading: createLoading,
        result: createResult,
        mutate
    } = useCreate(props.dataModel.resolverName, props.dataModel.endpoints.create, detailFields);

    useEffect(() => {
        if (!(createResult && createResult.data)) return;

        if (createResult.success) {
            setUnsavedChanges(false);
            router.push(
                props.routeAfterSuccess.replace(
                    ':id',
                    createResult.data[props.dataModel.endpoints.create]?.id
                )
            );
            showSuccess(t('messages:success-created'));
        } else {
            showError(t('messages:error-creating-data'));
        }
    }, [createResult]);

    // function to reset data in case of fields dependencies
    const [changedFormValues, setChangedFormValues] = useState<any>({});
    useEffect(() => {
        if (
            form.getFieldsValue(true) &&
            props.dependentFields &&
            props.dependentFields.length > 0
        ) {
            props.dependentFields.forEach((obj: any) => {
                if (changedFormValues[obj.triggerField]) {
                    delete form.getFieldsValue(true)[obj.changingField];
                }
            });
        }
    }, [props.dependentFields, changedFormValues]);

    const onFinish = () => {
        Modal.confirm({
            title: t('messages:create-confirm'),
            onOk: () => {
                form.validateFields()
                    .then(() => {
                        const formData = form.getFieldsValue(true);
                        delete formData.thirdPartyAddressSenderId;
                        delete formData.thirdPartyAddressSenderContactId;
                        mutate({
                            input: { ...form.getFieldsValue(true), ...props.extraData }
                        });
                        setUnsavedChanges(false);
                    })
                    .catch((err) => {
                        showError(t('errors:DB-000111'));
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

    const steps = props.addSteps.map((element, index) => {
        return {
            title: `${t('common:step')} ` + (index + 1).toString(),
            key: index
        };
    });

    useEffect(() => {
        if (createLoading) {
            showInfo(t('messages:info-create-wip'));
        }
    }, [createLoading]);

    return (
        <WrapperForm>
            {steps.length > 1 && <StepsPanel currentStep={current} steps={steps} />}
            <WrapperStepContent>
                <Form
                    form={form}
                    layout="vertical"
                    scrollToFirstError
                    onValuesChange={(changedValues, values) => {
                        setChangedFormValues(changedValues);
                        props.setFormInfos(values);
                        setUnsavedChanges(true);
                    }}
                >
                    <Collapse style={{ marginBottom: 10 }}>
                        <Panel header={t('actions:open-prepopulate-section')} key="1">
                            <Form.Item label={t('d:stockOwner')} name="thirdPartyId">
                                <Select
                                    allowClear
                                    placeholder={`${t('messages:please-select-a', {
                                        name: t('d:stockOwner')
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
                                label={t('d:third-party-address-head-office-model')}
                                name="thirdPartyAddressId"
                            >
                                <Select
                                    allowClear
                                    placeholder={`${t('messages:please-select-a', {
                                        name: t('d:third-party-address-head-office-model')
                                    })}`}
                                    onChange={handleHeadOfficeAddressChange}
                                >
                                    {thirdPartyAddresses
                                        ?.filter(
                                            (item: any) =>
                                                item.category ==
                                                configs.THIRD_PARTY_ADDRESS_CATEGORY_HEAD_OFFICE
                                        )
                                        .map((item: any) => (
                                            <>
                                                <Option key={item.key} value={item.key}>
                                                    {item.text}
                                                </Option>
                                            </>
                                        ))}
                                </Select>
                            </Form.Item>
                            <Form.Item
                                label={t('d:third-party-address-head-office-contact-model')}
                                name="thirdPartyAddressContactId"
                            >
                                <Select
                                    allowClear
                                    placeholder={`${t('messages:please-select-a', {
                                        name: t('d:third-party-address-head-office-contact-model')
                                    })}`}
                                    onChange={handleHeadOfficeContactChange}
                                >
                                    {thirdPartyAddressHeadOfficeContacts?.map((item: any) => (
                                        <Option key={item.key} value={item.key}>
                                            {item.text}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                            <Form.Item
                                label={t('d:third-party-address-sender-model')}
                                name="thirdPartyAddressSenderId"
                            >
                                <Select
                                    allowClear
                                    placeholder={`${t('messages:please-select-a', {
                                        name: t('d:third-party-address-sender-model')
                                    })}`}
                                    onChange={handleSenderAddressChange}
                                >
                                    {thirdPartyAddresses
                                        ?.filter(
                                            (item: any) =>
                                                item.category ==
                                                configs.THIRD_PARTY_ADDRESS_CATEGORY_SENDER
                                        )
                                        .map((item: any) => (
                                            <>
                                                <Option key={item.key} value={item.key}>
                                                    {item.text}
                                                </Option>
                                            </>
                                        ))}
                                </Select>
                            </Form.Item>
                            <Form.Item
                                label={t('d:third-party-address-sender-contact-model')}
                                name="thirdPartyAddressSenderContactId"
                            >
                                <Select
                                    allowClear
                                    placeholder={`${t('messages:please-select-a', {
                                        name: t('d:third-party-address-sender-contact-model')
                                    })}`}
                                    onChange={handleSenderContactChange}
                                >
                                    {thirdPartyAddressSenderContacts?.map((item: any) => (
                                        <Option key={item.key} value={item.key}>
                                            {item.text}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Panel>
                    </Collapse>
                    <FormGroup inputs={props.addSteps[current]} setValues={form.setFieldsValue} />
                </Form>
            </WrapperStepContent>
            <div style={{ textAlign: 'center' }}>
                <Space>
                    <Button type="primary" loading={createLoading} onClick={onFinish}>
                        {t('actions:submit')}
                    </Button>
                    <Button onClick={onCancel}>{t('actions:cancel')}</Button>
                </Space>
            </div>
        </WrapperForm>
    );
};
