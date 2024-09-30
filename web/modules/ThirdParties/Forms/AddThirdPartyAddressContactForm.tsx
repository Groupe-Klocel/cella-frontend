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
import { Button, Input, Form, Select, Modal, Space } from 'antd';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import {
    useCreateThirdPartyAddressContactMutation,
    CreateThirdPartyAddressContactMutation,
    CreateThirdPartyAddressContactMutationVariables,
    useListConfigsForAScopeQuery
} from 'generated/graphql';
import { showError, showSuccess, showInfo } from '@helpers';
import { FormOptionType } from 'models/Models';
import configs from '../../../../common/configs.json';

const { Option } = Select;

export interface ISingleItemProps {
    thirdPartyName: string | any;
    thirdPartyAddressId: string | any;
    thirdPartyAddressName: string | any;
}

export const AddThirdPartyAddressContactForm = (props: ISingleItemProps) => {
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

    // CREATION //
    const { mutate, isPending: createLoading } = useCreateThirdPartyAddressContactMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: CreateThirdPartyAddressContactMutation,
                _variables: CreateThirdPartyAddressContactMutationVariables,
                _context: any
            ) => {
                router.push(
                    `/third-parties/address/contact/${data.createThirdPartyAddressContact.id}`
                );
                showSuccess(t('messages:success-created'));
            },
            onError: (err) => {
                showError(t('messages:error-creating-data'));
            }
        }
    );

    const createThirdPartyAddressContact = ({
        input
    }: CreateThirdPartyAddressContactMutationVariables) => {
        mutate({ input });
    };

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                // Here make api call of something else
                const formData = form.getFieldsValue(true);
                formData.status = configs.THIRD_PARTY_ADDRESS_CONTACT_STATUS_ENABLED;
                delete formData.thirdPartyName;
                delete formData.thirdPartyAddressName;
                createThirdPartyAddressContact({ input: formData });
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

    const [lastName, setLastName] = useState();
    const [firstName, setFirstName] = useState();
    const handleLastNameFill = (e: any) => {
        setLastName(e.target.value);
    };

    const handleFirstNameFill = (e: any) => {
        setFirstName(e.target.value);
    };
    useEffect(() => {
        form.setFieldsValue({
            contactName: `${lastName ? lastName : ''} ${firstName ? firstName : ''}`
        });
    }, [lastName, firstName]);

    useEffect(() => {
        const tmp_details = {
            thirdPartyAddressName: props.thirdPartyAddressName,
            thirdPartyAddressId: props.thirdPartyAddressId,
            thirdPartyName: props.thirdPartyName
        };
        form.setFieldsValue(tmp_details);
        if (createLoading) {
            showInfo(t('messages:info-create-wip'));
        }
    }, [createLoading]);

    return (
        <WrapperForm>
            <Form form={form} layout="vertical" scrollToFirstError>
                <Form.Item label={t('d:thirdParty')} name="thirdPartyName">
                    <Input disabled />
                </Form.Item>

                <Form.Item label={t('d:thirdPartyAddress_entityName')} name="thirdPartyAddressName">
                    <Input disabled />
                </Form.Item>

                <Form.Item label={t('d:category')} name="category">
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

                <Form.Item label={t('d:contactCivility')} name="contactCivility">
                    <Input maxLength={20} />
                </Form.Item>

                <Form.Item label={t('d:contactFirstName')} name="contactFirstName">
                    <Input maxLength={50} onChange={handleFirstNameFill} />
                </Form.Item>

                <Form.Item label={t('d:contactLastName')} name="contactLastName">
                    <Input maxLength={50} onChange={handleLastNameFill} />
                </Form.Item>

                <Form.Item
                    label={t('d:contactName')}
                    name="contactName"
                    rules={[{ required: true, message: errorMessageEmptyInput }]}
                >
                    <Input maxLength={100} />
                </Form.Item>

                <Form.Item label={t('d:contactPhone')} name="contactPhone">
                    <Input maxLength={50} />
                </Form.Item>

                <Form.Item label={t('d:contactMobile')} name="contactMobile">
                    <Input maxLength={50} />
                </Form.Item>

                <Form.Item label={t('d:contactEmail')} name="contactEmail">
                    <Input />
                </Form.Item>

                <Form.Item label={t('d:contactLanguage')} name="contactLanguage">
                    <Input maxLength={15} />
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
