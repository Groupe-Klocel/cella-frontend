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
import { Button, Input, Form, Switch, Space, Modal } from 'antd';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import { showError, showSuccess, showInfo, getRulesWithNoSpacesValidator } from '@helpers';
import {
    CreateRoleMutation,
    CreateRoleMutationVariables,
    useCreateRoleMutation
} from 'generated/graphql';
import { useAppState } from 'context/AppContext';

export const AddRoleForm = () => {
    const { t } = useTranslation();
    const [whOnly, setWhOnly] = useState(true);
    const { graphqlRequestClient } = useAuth();
    const { user } = useAppState();
    const router = useRouter();
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes

    // TEXTS TRANSLATION ( REFACTORING POSSIBLE / EXPORT / DON'T KNOW YET )
    const name = t('d:name');
    const warehouseOnly = t('d:warehouseOnly');
    const allWarehouses = t('d:allWarehouses');
    const errorMessageEmptyInput = t('messages:error-message-empty-input');
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

    //CREATE role
    const { mutate, isLoading: createLoading } = useCreateRoleMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: CreateRoleMutation,
                _variables: CreateRoleMutationVariables,
                _context: any
            ) => {
                router.push(`/roles/${data?.createRole?.id}`);
                showSuccess(t('messages:success-created'));
            },
            onError: (err: any) => {
                showError(t('messages:error-creating-data'));
            }
        }
    );

    const createRole = ({ input }: CreateRoleMutationVariables) => {
        mutate({ input });
    };

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                const formData = form.getFieldsValue(true);
                if (formData.warehouseOnly === true) {
                    formData.warehouseId = user.warehouseId;
                }
                delete formData.warehouseOnly;
                createRole({ input: formData });
                setUnsavedChanges(false);
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
        if (createLoading) {
            showInfo(t('messages:info-create-wip'));
        }
        form.setFieldsValue({ warehouseOnly: true });
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
                    name="name"
                    label={name}
                    rules={getRulesWithNoSpacesValidator(
                        [
                            {
                                required: true,
                                message: errorMessageEmptyInput
                            }
                        ],
                        t('messages:error-space')
                    )}
                >
                    <Input />
                </Form.Item>
                <Form.Item name="warehouseOnly" label={warehouseOnly}>
                    <Switch
                        checked={whOnly}
                        onChange={() => {
                            setWhOnly(!whOnly);
                        }}
                    />
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
