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
import { getRulesWithNoSpacesValidator, showError, showInfo, showSuccess } from '@helpers';
import { Button, Form, Input, Modal, Space, Switch } from 'antd';
import { useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import {
    UpdateRoleMutation,
    UpdateRoleMutationVariables,
    useUpdateRoleMutation
} from 'generated/graphql';
import useTranslation from 'next-translate/useTranslation';
import { useRouter } from 'next/router';
import { FC, useEffect, useState } from 'react';

export type EditRoleFormProps = {
    id: string | any;
    name: string | any;
    warehouseId: string | any;
};

export const EditRoleForm: FC<EditRoleFormProps> = ({
    id,
    name,
    warehouseId
}: EditRoleFormProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const [form] = Form.useForm();
    const { user } = useAppState();
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes

    // TEXTS TRANSLATION ( REFACTORING POSSIBLE / EXPORT / DON'T KNOW YET )
    const nameText = t('d:name');
    const warehouseOnlyText = t('d:warehouseOnly');
    const errorMessageEmptyInput = t('messages:error-message-empty-input');
    const errorMessageUpdateData = t('messages:error-update-data');
    const successMessageUpdateData = t('messages:success-updated');
    const infoMessageUpdateData = t('messages:info-update-wip');
    const submit = t('actions:submit');
    // END TEXTS TRANSLATION

    let warehouseOnly;
    if (warehouseId) {
        warehouseOnly = true;
    } else {
        warehouseOnly = false;
        warehouseId = null;
    }
    const [switchInput, setSwitchInput] = useState(warehouseOnly);

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
        mutate,
        isLoading: updateLoading,
        data
    } = useUpdateRoleMutation<Error>(graphqlRequestClient, {
        onSuccess: (
            data: UpdateRoleMutation,
            _variables: UpdateRoleMutationVariables,
            _context: any
        ) => {
            router.push(`/roles/${data.updateRole?.id}`);
            showSuccess(successMessageUpdateData);
        },
        onError: () => {
            showError(errorMessageUpdateData);
        }
    });

    const updateRole = ({ id, input }: UpdateRoleMutationVariables) => {
        mutate({ id, input });
    };

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                const formData = form.getFieldsValue(true);
                if (formData.warehouseOnly == undefined) {
                    formData.warehouseId = warehouseId;
                } else {
                    if (formData.warehouseOnly) {
                        formData.warehouseId = user.warehouseId;
                    } else {
                        formData.warehouseId = null;
                    }
                    delete formData.warehouseOnly;
                }
                updateRole({ input: formData, id: id });
                setUnsavedChanges(false);
            })
            .catch((err) => showError(errorMessageUpdateData));
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
            name: name
        };
        form.setFieldsValue(tmp_details);
        if (updateLoading) {
            showInfo(infoMessageUpdateData);
        }
    }, [updateLoading]);

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
                    label={nameText}
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
                <Form.Item name="warehouseOnly" label={warehouseOnlyText}>
                    <Switch
                        defaultChecked={warehouseOnly}
                        checked={switchInput}
                        onChange={() => {
                            setSwitchInput(!switchInput);
                        }}
                    />
                </Form.Item>
            </Form>
            <div style={{ textAlign: 'center' }}>
                <Space>
                    <Button type="primary" loading={updateLoading} onClick={onFinish}>
                        {submit}
                    </Button>
                    <Button onClick={onCancel}>{t('actions:cancel')}</Button>
                </Space>
            </div>
        </WrapperForm>
    );
};
