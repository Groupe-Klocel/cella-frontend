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
import { Button, Input, Form, Select, InputNumber, Modal, Space } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import { showError, showSuccess, showInfo, useGetRoles } from '@helpers';
import { FormOptionType } from 'models/Models';
import {
    CreateUserRoleMutation,
    CreateUserRoleMutationVariables,
    useCreateUserRoleMutation
} from 'generated/graphql';
import { log } from 'console';

const { Option } = Select;

export interface ISingleItemProps {
    id: string | any;
    username: string | any;
}

export const AddWarehouseWorkerUserRoleForm = (props: ISingleItemProps) => {
    const { t } = useTranslation('common');
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes

    // TEXTS TRANSLATION ( REFACTORING POSSIBLE / EXPORT / DON'T KNOW YET )
    const role = t('common:role');
    const warehouseWorker = t('d:warehouseWorker');
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

    const roleData = useGetRoles({}, 1, 100, null);
    const [rolesOptions, setRolesOptions] = useState<Array<FormOptionType>>([]);

    //To render Simple warehouseWorkers list
    useEffect(() => {
        if (roleData.data) {
            const newIdOpts: Array<FormOptionType> = [];
            roleData.data.roles?.results.forEach(({ id, name }) => {
                newIdOpts.push({ text: name!, key: id! });
            });
            setRolesOptions(newIdOpts);
        }
    }, [roleData.data]);

    //CREATE user role
    const { mutate, isPending: createLoading } = useCreateUserRoleMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: CreateUserRoleMutation,
                _variables: CreateUserRoleMutationVariables,
                _context: any
            ) => {
                router.push(`/warehouse-workers/${props.id}`);
                showSuccess(t('messages:success-created'));
            },
            onError: (err: any) => {
                showError(t('messages:error-creating-data'));
                console.log(err);
            }
        }
    );

    const createUserRole = ({ input }: CreateUserRoleMutationVariables) => {
        mutate({ input });
    };

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                // Here make api call of something else
                const formData = form.getFieldsValue(true);
                delete formData.warehouseWorkerName;
                createUserRole({ input: formData });
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
        const tmp_details = {
            warehouseWorkerName: props.username,
            warehouseWorkerId: props.id
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
                <Form.Item name="warehouseWorkerName" label={warehouseWorker}>
                    <Input disabled />
                </Form.Item>
                <Form.Item
                    name="roleId"
                    label={role}
                    rules={[{ required: true, message: errorMessageEmptyInput }]}
                >
                    <Select
                        allowClear
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:role')
                        })}`}
                    >
                        {rolesOptions?.map((role: any) => (
                            <Option key={role.key} value={role.key}>
                                {role.text}
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
