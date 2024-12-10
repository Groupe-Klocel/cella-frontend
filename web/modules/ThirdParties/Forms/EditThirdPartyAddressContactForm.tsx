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
import { Button, Input, Form, Select, Space, Modal, AutoComplete } from 'antd';
import useTranslation from 'next-translate/useTranslation';
import { FC, useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import { showError, showSuccess, showInfo, checkUndefinedValues } from '@helpers';
import {
    UpdateThirdPartyAddressContactMutation,
    UpdateThirdPartyAddressContactMutationVariables,
    useListConfigsForAScopeQuery,
    useUpdateThirdPartyAddressContactMutation
} from 'generated/graphql';
import { FormOptionType } from 'models/ModelsV2';
import { gql } from 'graphql-request';

export type EditThirdPartyAddressContactFormProps = {
    thirdPartyAdressContactId: string;
    details: any;
};

export const EditThirdPartyAddressContactForm: FC<EditThirdPartyAddressContactFormProps> = ({
    thirdPartyAdressContactId,
    details
}: EditThirdPartyAddressContactFormProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes
    const { Option } = Select;

    // TYPED SAFE ALL
    const [form] = Form.useForm();

    form.setFieldsValue({
        thirdPartyName: details?.thirdPartyAddress?.entityName
    });

    const [thirdPartyAddressContactCategories, setThirdPartyAddressContactCategories] =
        useState<Array<FormOptionType>>();
    // Get all third party categories
    const thirdPartyAddressContactCategoryList = useListConfigsForAScopeQuery(
        graphqlRequestClient,
        {
            language: router.locale,
            scope: 'third_party_address_contact_category'
        }
    );
    useEffect(() => {
        if (thirdPartyAddressContactCategoryList) {
            const newThirdPartyAddressContactCategory: Array<FormOptionType> = [];

            const cData = thirdPartyAddressContactCategoryList?.data?.listConfigsForAScope;
            if (cData) {
                cData.forEach((item) => {
                    newThirdPartyAddressContactCategory.push({
                        key: parseInt(item.code),
                        text: item.text
                    });
                });
                setThirdPartyAddressContactCategories(newThirdPartyAddressContactCategory);
            }
        }
    }, [thirdPartyAddressContactCategoryList.data]);

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

    const [options, setOptions] = useState<{ value: string }[]>(civilityList);

    const handleSearch = (value: string) => {
        setOptions(
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

    const { mutate, isPending: updateLoading } = useUpdateThirdPartyAddressContactMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: UpdateThirdPartyAddressContactMutation,
                _variables: UpdateThirdPartyAddressContactMutationVariables,
                _context: any
            ) => {
                router.push(`/third-parties/address/contact/${thirdPartyAdressContactId}`);
            },
            onError: () => {
                showError(t('messages:error-update-data'));
            }
        }
    );

    const updateThirdPartyAddressContact = ({
        id,
        input
    }: UpdateThirdPartyAddressContactMutationVariables) => {
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
                delete formData['categoryText'];
                delete formData['thirdPartyName'];
                delete formData['thirdParty'];
                delete formData['thirdPartyAddress'];

                updateThirdPartyAddressContact({ id: thirdPartyAdressContactId, input: formData });
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
                <Form.Item label={t('d:thirdPartyAddress_entityName')} name="thirdPartyName">
                    <Input disabled />
                </Form.Item>

                <Form.Item label={t('d:category')} name="categoryText">
                    <Select
                        allowClear
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:category')
                        })}`}
                    >
                        {thirdPartyAddressContactCategories?.map((item: any) => (
                            <Option key={item.key} value={item.key}>
                                {item.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item
                    label={t('d:contactName')}
                    name="contactName"
                    rules={[{ required: true }]}
                >
                    <Input maxLength={100} />
                </Form.Item>
                <Form.Item label={t('d:contactCivility')} name={'contactCivility'}>
                    <AutoComplete
                        allowClear
                        options={options}
                        onSelect={onSelect}
                        onSearch={handleSearch}
                        onFocus={() => setOptions(civilityList)}
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

                <Form.Item label={t('d:contactLanguage')} name="contactLanguage">
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
