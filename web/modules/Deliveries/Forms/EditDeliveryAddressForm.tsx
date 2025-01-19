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
import { Button, Input, Form, Space, AutoComplete, Modal } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import { showError, showSuccess, showInfo, checkUndefinedValues } from '@helpers';
import {
    UpdateDeliveryAddressMutation,
    UpdateDeliveryAddressMutationVariables,
    useUpdateDeliveryAddressMutation
} from 'generated/graphql';
import { gql } from 'graphql-request';

export type EditDeliveryAddressFormProps = {
    deliveryId: string;
    details: any;
};

export const EditDeliveryAddressForm: FC<EditDeliveryAddressFormProps> = ({
    deliveryId,
    details
}: EditDeliveryAddressFormProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes
    // TYPED SAFE ALL
    const [form] = Form.useForm();

    form.setFieldsValue({
        delivery_Name: details?.delivery?.name,
        categoryText: details.categoryText
    });

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
    const tmp_civilities = civilities.map((item: any) => ({ value: item.text }));

    if (
        tmp_civilities.find((civility) => civility.value === details.contactCivility) === undefined
    ) {
        tmp_civilities.push({ value: details.contactCivility });
    }

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
    const onSelect = (value: string) => {
        form.setFieldsValue({ contactCivility: value });
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

    const { mutate, isPending: updateLoading } = useUpdateDeliveryAddressMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: UpdateDeliveryAddressMutation,
                _variables: UpdateDeliveryAddressMutationVariables,
                _context: any
            ) => {
                router.push(`/deliveries/address/${deliveryId}`);
            },
            onError: () => {
                showError(t('messages:error-update-data'));
            }
        }
    );

    const updateDeliveryAddress = ({ id, input }: UpdateDeliveryAddressMutationVariables) => {
        mutate({ id, input });
    };

    // // Call api to create new group
    const onFinish = () => {
        form.validateFields()
            .then(() => {
                checkUndefinedValues(form);
                // Here make api call of something else
                const formData = form.getFieldsValue(true);
                //end part to update priorities on foreigners
                delete formData['delivery'];
                delete formData['delivery_Name'];
                delete formData['categoryText'];

                updateDeliveryAddress({ id: deliveryId, input: formData });
                setUnsavedChanges(false);
            })
            .catch((err) => {
                showError(t('error-update-data'));
            });
    };
    useEffect(() => {
        const tmp_details = {
            ...details,
            contactCivility: details.contactCivility
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
    }, [updateLoading, details]);

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

    return (
        <WrapperForm>
            <Form form={form} layout="vertical" scrollToFirstError>
                <Form.Item label={t('d:deliveryName')} name="delivery_Name">
                    <Input disabled />
                </Form.Item>
                <Form.Item label={t('d:categoryText')} name="categoryText">
                    <Input disabled />
                </Form.Item>
                <Form.Item label={t('d:contactName')} name="contactName">
                    <Input />
                </Form.Item>
                <Form.Item label={t('d:contactCivility')} name={'contactCivility'}>
                    <AutoComplete
                        options={civilityOptions}
                        onSelect={onSelect}
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
                <Form.Item
                    label={t('d:contactEmail')}
                    name="contactEmail"
                    normalize={(value) => (value ? value : undefined)}
                >
                    <Input />
                </Form.Item>
                <Form.Item label={t('d:contactLanguage')} name="contactLanguage">
                    <Input />
                </Form.Item>
                <Form.Item label={t('d:entityName')} name="entityName">
                    <Input maxLength={50} />
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
                <Space>
                    <Button type="primary" loading={updateLoading} onClick={onFinish}>
                        {t('actions:update')}
                    </Button>
                    <Button onClick={onCancel}>{t('actions:cancel')}</Button>
                </Space>
            </div>
        </WrapperForm>
    );
};
