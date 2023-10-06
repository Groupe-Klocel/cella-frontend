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
import { Button, Input, Form, Select, Modal, Space, InputNumber } from 'antd';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import { showError, showSuccess, showInfo } from '@helpers';
import {
    CreateWarehouseWorkerMutation,
    CreateWarehouseWorkerMutationVariables,
    useCreateWarehouseWorkerMutation
} from 'generated/graphql';
import { useAppState } from 'context/AppContext';

const { Option } = Select;

export const AddWarehouseWorkerForm = () => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const { user } = useAppState();
    const router = useRouter();
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes

    // TEXTS TRANSLATION ( REFACTORING POSSIBLE / EXPORT / DON'T KNOW YET )
    const username = t('d:username');
    const email = t('d:email');
    const tokenLifetime = t('d:tokenLifetime');
    const errorMessageEmptyInput = t('messages:error-message-empty-input');
    const password = t('common:password');
    const confirmPass = t('common:confirm-password');
    const errorMessageEmailInput = t('messages:error-message-email-input');
    const errorMessagePassword = t('messages:error-message-empty-input');
    const errorWrongPassword = t('messages:error-message-wrong-password');
    const errorWrongPasswordLength = t('messages:error-message-wrong-password-length');
    const submit = t('actions:submit');
    // END TEXTS TRANSLATION

    // TYPED SAFE ALL
    const [form] = Form.useForm();

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

    //CREATE user role
    const { mutate, isLoading: createLoading } = useCreateWarehouseWorkerMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: CreateWarehouseWorkerMutation,
                _variables: CreateWarehouseWorkerMutationVariables,
                _context: any
            ) => {
                router.push(`/warehouse-workers/${data?.createWarehouseWorker?.id}`);
                showSuccess(t('messages:success-created'));
            },
            onError: (err: any) => {
                showError(t('messages:error-creating-data'));
                console.log(err);
            }
        }
    );

    const createWarehouseWorker = ({ input }: CreateWarehouseWorkerMutationVariables) => {
        mutate({ input });
    };

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                // Here make api call of something else
                const formData = form.getFieldsValue(true);
                if (formData.password !== formData.password2) {
                    showError(errorWrongPassword);
                } else {
                    delete formData.password2;
                    formData['resetPassword'] = true;
                    createWarehouseWorker({ input: formData });
                    setUnsavedChanges(false);
                }
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
            warehouseId: user.warehouseId
        };
        form.setFieldsValue(tmp_details);
        if (createLoading) {
            showInfo(t('messages:info-create-wip'));
        }
    }, [createLoading]);

    return (
        <WrapperForm>
            <Form
                form={form}
                layout="vertical"
                scrollToFirstError
                onValuesChange={() => setUnsavedChanges(true)}
            >
                <Form.Item
                    name="username"
                    label={username}
                    rules={[
                        {
                            required: true,
                            message: errorMessageEmptyInput
                        }
                    ]}
                >
                    <Input />
                </Form.Item>
                <Form.Item name="email" label={email}>
                    <Input />
                </Form.Item>

                <Form.Item
                    name="password"
                    label={password}
                    rules={[
                        {
                            required: true,
                            message: errorMessagePassword
                        },
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                if (value.length >= 6) {
                                    return Promise.resolve();
                                }
                                return Promise.reject(new Error(errorWrongPasswordLength));
                            }
                        })
                    ]}
                    hasFeedback
                >
                    <Input.Password />
                </Form.Item>
                <Form.Item
                    name="password2"
                    label={confirmPass}
                    dependencies={['password']}
                    hasFeedback
                    rules={[
                        {
                            required: true,
                            message: errorMessagePassword
                        },
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                if (!value || getFieldValue('password') === value) {
                                    return Promise.resolve();
                                }
                                return Promise.reject(new Error(errorWrongPassword));
                            }
                        })
                    ]}
                >
                    <Input.Password />
                </Form.Item>
                <Form.Item name="tokenLifetime" label={tokenLifetime}>
                    <InputNumber min={-1} precision={0} />
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
