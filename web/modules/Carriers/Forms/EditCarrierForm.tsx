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
import { Button, Input, Form, Space, Modal, AutoComplete, Checkbox, Select } from 'antd';
import useTranslation from 'next-translate/useTranslation';
import { FC, useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import { showError, showSuccess, showInfo, checkUndefinedValues } from '@helpers';
import {
    GetAllCarriersQuery,
    UpdateCarrierMutation,
    UpdateCarrierMutationVariables,
    useGetAllCarriersQuery,
    useUpdateCarrierMutation
} from 'generated/graphql';
import { gql } from 'graphql-request';

export type EditCarrierFormProps = {
    carrierId: string;
    details: any;
};

export const EditCarrierForm: FC<EditCarrierFormProps> = ({
    carrierId,
    details
}: EditCarrierFormProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    // TYPED SAFE ALL
    const [form] = Form.useForm();
    const { Option } = Select;

    form.setFieldsValue({
        parentCarrier: details?.parentCarrier?.name
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

    // Get all carriers
    const carrierParents = useGetAllCarriersQuery<Partial<GetAllCarriersQuery>, Error>(
        graphqlRequestClient,
        {
            orderBy: null,
            page: 1,
            itemsPerPage: 100
        }
    );
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

    const { mutate, isPending: updateLoading } = useUpdateCarrierMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: UpdateCarrierMutation,
                _variables: UpdateCarrierMutationVariables,
                _context: any
            ) => {
                router.push(`/carriers/${carrierId}`);
            },
            onError: () => {
                showError(t('messages:error-update-data'));
            }
        }
    );

    const updateCarrier = ({ id, input }: UpdateCarrierMutationVariables) => {
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
                delete formData['id'];
                delete formData['carrierShippingModes'];
                delete formData['parentCarrier'];
                delete formData['statusText'];
                updateCarrier({ id: carrierId, input: formData });
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
                <Form.Item label={t('d:code')} name="code">
                    <Input disabled />
                </Form.Item>
                <Form.Item
                    label={t('d:name')}
                    name="name"
                    rules={[{ required: true, message: t('messages:error-message-empty-input') }]}
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
                    <Checkbox checked={details.available} disabled>
                        {t('d:available')}
                    </Checkbox>
                </Form.Item>
                <Form.Item name="toBeLoaded">
                    <Checkbox checked={details.toBeLoaded} disabled>
                        {t('d:toBeLoaded')}
                    </Checkbox>
                </Form.Item>
                <Form.Item label={t('d:contactName')} name="contactName">
                    <Input maxLength={100} />
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
                    <Input maxLength={50} />
                </Form.Item>
                <Form.Item label={t('d:contactLanguage')} name="contactLanguage">
                    <Input maxLength={15} />
                </Form.Item>
                <Form.Item label={t('d:thirdParty_name')} name="entityName">
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
