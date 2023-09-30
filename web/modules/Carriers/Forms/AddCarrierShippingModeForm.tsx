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
import { Button, Col, Input, Row, Form, Select, Checkbox, InputNumber, Modal, Space } from 'antd';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import {
    useListParametersForAScopeQuery,
    useCreateCarrierShippingModeMutation,
    CreateCarrierShippingModeMutation,
    CreateCarrierShippingModeMutationVariables,
    useListConfigsForAScopeQuery
} from 'generated/graphql';
import { showError, showSuccess, showInfo, getRulesWithNoSpacesValidator } from '@helpers';

import { CheckboxChangeEvent } from 'antd/lib/checkbox';
import { FormOptionType } from 'models/Models';

const { Option } = Select;

export interface ISingleItemProps {
    carrierId: string | any;
    carrierName: string | any;
}

export const AddCarrierShippingModeForm = (props: ISingleItemProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes

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
    const [shippingMode, setShippingMode] = useState<Array<FormOptionType>>();
    const [carrierManagementMode, setCarrierManagementMode] = useState<Array<FormOptionType>>();
    const [handlingUnitType, setHandlingUnitType] = useState<Array<FormOptionType>>();
    const [labelType, setLabelType] = useState<Array<FormOptionType>>();

    // Get all shipping modes
    const shippingModeList = useListParametersForAScopeQuery(graphqlRequestClient, {
        language: router.locale,
        scope: 'shipping_mode'
    });
    useEffect(() => {
        if (shippingModeList) {
            const newShippingMode: Array<FormOptionType> = [];

            const cData = shippingModeList?.data?.listParametersForAScope;
            if (cData) {
                cData.forEach((item) => {
                    newShippingMode.push({ key: item.code, text: item.text });
                });
                setShippingMode(newShippingMode);
            }
        }
    }, [shippingModeList.data]);

    // Get all carrier management modes
    const carrierManagementModeList = useListConfigsForAScopeQuery(graphqlRequestClient, {
        language: router.locale,
        scope: 'carrier_management_mode'
    });
    useEffect(() => {
        if (carrierManagementModeList) {
            const newCarrierManagementMode: Array<FormOptionType> = [];

            const cData = carrierManagementModeList?.data?.listConfigsForAScope;
            if (cData) {
                cData.forEach((item) => {
                    newCarrierManagementMode.push({ key: parseInt(item.code), text: item.text });
                });
                setCarrierManagementMode(newCarrierManagementMode);
            }
        }
    }, [carrierManagementModeList.data]);

    // Get all handling unit types
    const handlingUnitTypeList = useListParametersForAScopeQuery(graphqlRequestClient, {
        language: router.locale,
        scope: 'handling_unit_type'
    });
    useEffect(() => {
        if (handlingUnitTypeList) {
            const newHandlingUnitType: Array<FormOptionType> = [];

            const cData = handlingUnitTypeList?.data?.listParametersForAScope;
            if (cData) {
                cData.forEach((item) => {
                    newHandlingUnitType.push({ key: parseInt(item.code), text: item.text });
                });
                setHandlingUnitType(newHandlingUnitType);
            }
        }
    }, [handlingUnitTypeList.data]);

    // Get all label types
    const labelTypeList = useListParametersForAScopeQuery(graphqlRequestClient, {
        language: router.locale,
        scope: 'label_type'
    });
    useEffect(() => {
        if (labelTypeList) {
            const newLabelType: Array<FormOptionType> = [];

            const cData = labelTypeList?.data?.listParametersForAScope;
            if (cData) {
                cData.forEach((item) => {
                    newLabelType.push({ key: parseInt(item.code), text: item.text });
                });
                setLabelType(newLabelType);
            }
        }
    }, [labelTypeList.data]);

    //manage call back on change checkbox
    const onAvailableChange = (e: CheckboxChangeEvent) => {
        form.setFieldsValue({ available: e.target.checked });
    };
    const onToBePalletizedChange = (e: CheckboxChangeEvent) => {
        form.setFieldsValue({ toBePalletized: e.target.checked });
    };
    const onMonoroundgroupChange = (e: CheckboxChangeEvent) => {
        form.setFieldsValue({ monoroundgroup: e.target.checked });
    };
    const onEdiTransmissionChange = (e: CheckboxChangeEvent) => {
        form.setFieldsValue({ ediTransmission: e.target.checked });
    };

    // CREATION //
    const { mutate, isLoading: createLoading } = useCreateCarrierShippingModeMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: CreateCarrierShippingModeMutation,
                _variables: CreateCarrierShippingModeMutationVariables,
                _context: any
            ) => {
                router.push(`/carriers/shipping-mode/${data.createCarrierShippingMode.id}`);
                showSuccess(t('messages:success-created'));
            },
            onError: (err) => {
                showError(t('messages:error-creating-data'));
            }
        }
    );

    const createCarrierShippingMode = ({ input }: CreateCarrierShippingModeMutationVariables) => {
        mutate({ input });
    };

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                // Here make api call of something else
                const formData = form.getFieldsValue(true);
                delete formData.carrierName;
                createCarrierShippingMode({ input: formData });
            })
            .catch((err) => {
                showError(t('messages:error-creating-data'));
            });
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
            carrierName: props.carrierName,
            carrierId: props.carrierId
        };
        form.setFieldsValue(tmp_details);
        if (createLoading) {
            showInfo(t('messages:info-create-wip'));
        }
    }, [createLoading]);

    return (
        <WrapperForm>
            <Form form={form} layout="vertical" scrollToFirstError>
                <Form.Item label={t('d:carrier')} name="carrierName">
                    <Input disabled />
                </Form.Item>

                <Form.Item
                    label={t('d:shippingMode')}
                    name="shippingMode"
                    rules={[{ required: true, message: errorMessageEmptyInput }]}
                >
                    <Select
                        allowClear
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:shippingMode')
                        })}`}
                    >
                        {shippingMode?.map((sm: any) => (
                            <Option key={sm.key} value={sm.key}>
                                {sm.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    label={t('d:shippingModeDescription')}
                    name="shippingModeDescription"
                    rules={getRulesWithNoSpacesValidator(
                        [{ required: true, message: errorMessageEmptyInput }],
                        t('messages:error-space')
                    )}
                >
                    <Input />
                </Form.Item>

                <Form.Item name="available">
                    <Checkbox onChange={onAvailableChange}>{t('d:available')}</Checkbox>
                </Form.Item>

                <Form.Item name="toBePalletized">
                    <Checkbox onChange={onToBePalletizedChange}>{t('d:toBePalletized')}</Checkbox>
                </Form.Item>

                <Form.Item name="monoroundgroup">
                    <Checkbox onChange={onMonoroundgroupChange}>{t('d:monoroundgroup')}</Checkbox>
                </Form.Item>

                <Form.Item label={t('d:accountNumber')} name="accountNumber">
                    <Input />
                </Form.Item>

                <Form.Item name="ediTransmission">
                    <Checkbox onChange={onEdiTransmissionChange}>{t('d:ediTransmission')}</Checkbox>
                </Form.Item>

                <Form.Item label={t('d:managementMode')} name="managementMode">
                    <Select allowClear>
                        {carrierManagementMode?.map((sm: any) => (
                            <Option key={sm.key} value={sm.key}>
                                {sm.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item label={t('d:sender')} name="sender">
                    <Input />
                </Form.Item>

                <Form.Item label={t('d:serviceTag')} name="serviceTag">
                    <Input />
                </Form.Item>

                <Form.Item label={t('d:handlingUnitType')} name="handlingUnitType">
                    <Select allowClear>
                        {handlingUnitType?.map((sm: any) => (
                            <Option key={sm.key} value={sm.key}>
                                {sm.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item label={t('d:labelType')} name="labelType">
                    <Select allowClear>
                        {labelType?.map((sm: any) => (
                            <Option key={sm.key} value={sm.key}>
                                {sm.text}
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
