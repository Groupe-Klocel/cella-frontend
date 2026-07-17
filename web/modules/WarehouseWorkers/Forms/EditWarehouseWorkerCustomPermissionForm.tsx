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
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { WrapperForm } from '@components';
import { Button, Input, Form, Modal, Space } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import { showError, showSuccess, showInfo, useDetail, useUpdate } from '@helpers';
import { WarehouseWorkerCustomPermissionModelV2 } from '@helpers';
import { gql } from 'graphql-request';
import { detectArgumentKeys } from './AddWarehouseWorkerCustomPermissionForm';

export interface ISingleItemProps {
    id: string | any;
    setData?: any;
}

export const EditWarehouseWorkerCustomPermissionForm = (props: ISingleItemProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes
    const [warehouseWorkerId, setWarehouseWorkerId] = useState<string | undefined>();
    // router.query values can be undefined (first render) or arrays: normalize once
    const assignmentId = Array.isArray(props.id) ? props.id[0] : props.id;

    const errorMessageEmptyInput = t('messages:error-message-empty-input');

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

    // load the assignment: worker and custom permission are fixed, only arguments are editable
    // (assigning another permission = delete + re-add, keeps the unicity constraint simple)
    const { detail, reload: reloadDetail } = useDetail(
        assignmentId,
        WarehouseWorkerCustomPermissionModelV2.endpoints.detail,
        [
            'id',
            'warehouseWorkerId',
            'customPermissionId',
            'extras',
            'warehouseWorker{username}',
            'customPermission{name}'
        ]
    );

    useEffect(() => {
        if (!assignmentId) return;
        reloadDetail();
    }, [assignmentId]);

    useEffect(() => {
        if (detail.error) {
            showError(t('messages:error-getting-data'));
            router.back();
            return;
        }
        const record =
            detail?.data?.[WarehouseWorkerCustomPermissionModelV2.endpoints.detail] ?? undefined;
        if (!record) return;

        setWarehouseWorkerId(record.warehouseWorkerId);
        if (props.setData) props.setData(record);
        const args = Object.keys(record.extras ?? {}).map((key) => ({
            argKey: key,
            argValue: record.extras[key]
        }));
        form.setFieldsValue({
            warehouseWorkerName: record.warehouseWorker?.username,
            customPermissionName: record.customPermission?.name,
            args
        });

        // suggest the [KEY] placeholders used by the permission lines that are not filled yet
        const query = gql`
            query getCustomPermissionLines($filters: CustomPermissionLineSearchFilters) {
                customPermissionLines(filters: $filters, itemsPerPage: 1000) {
                    results {
                        permission
                    }
                }
            }
        `;
        graphqlRequestClient
            .request(query, { filters: { customPermissionId: record.customPermissionId } })
            .then((result: any) => {
                const detectedKeys = detectArgumentKeys(
                    result.customPermissionLines?.results ?? []
                );
                const currentArgs = form.getFieldValue('args') ?? [];
                const missingArgs = detectedKeys
                    .filter(
                        (key) =>
                            !currentArgs.some(
                                (arg: any) => arg && (arg.argKey ?? '').trim() === key
                            )
                    )
                    .map((key) => ({ argKey: key, argValue: '' }));
                if (missingArgs.length > 0) {
                    form.setFieldsValue({ args: [...currentArgs, ...missingArgs] });
                }
            })
            .catch((error: any) => {
                showError(t('messages:error-getting-data'));
                console.log(error);
            });
    }, [detail]);

    //UPDATE warehouse worker custom permission
    const {
        isLoading: updateLoading,
        result: updateResult,
        mutate: updateAssignment
    } = useUpdate(
        WarehouseWorkerCustomPermissionModelV2.resolverName,
        WarehouseWorkerCustomPermissionModelV2.endpoints.update,
        ['id']
    );

    useEffect(() => {
        if (!(updateResult && updateResult.data)) return;

        if (updateResult.success) {
            showSuccess(t('messages:success-updated'));
            router.push(`/warehouse-workers/${warehouseWorkerId}`);
        }
    }, [updateResult]);

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                const formData = form.getFieldsValue(true);
                const args = (formData.args ?? []).filter(
                    (arg: any) => arg && arg.argKey && arg.argKey.trim() !== ''
                );
                const extras = args.reduce((acc: any, arg: any) => {
                    acc[arg.argKey.trim()] = arg.argValue ?? '';
                    return acc;
                }, {});
                if (!assignmentId) {
                    showError(t('messages:error-update-data'));
                    return;
                }
                updateAssignment({
                    id: assignmentId,
                    input: { extras: args.length > 0 ? extras : null }
                });
                setUnsavedChanges(false);
            })
            .catch((err) => {
                showError(t('messages:error-update-data'));
            });
    };

    const onCancel = () => {
        if (!unsavedChanges) {
            router.back();
            return;
        }
        // the guard is lifted while the modal is open so onOk's router.back() does not
        // trigger a second confirmation; it is re-armed if the user chooses to stay
        setUnsavedChanges(false);
        Modal.confirm({
            title: t('messages:confirm-leaving-page'),
            onOk: () => {
                router.back();
            },
            onCancel: () => {
                setUnsavedChanges(true);
            },
            okText: t('common:bool-yes'),
            cancelText: t('common:bool-no')
        });
    };

    useEffect(() => {
        if (updateLoading) {
            showInfo(t('messages:info-update-wip'));
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
                <Form.Item name="warehouseWorkerName" label={t('d:warehouseWorker')}>
                    <Input disabled />
                </Form.Item>
                <Form.Item name="customPermissionName" label={t('common:custom-permission')}>
                    <Input disabled />
                </Form.Item>
                <Form.Item label={t('common:arguments')}>
                    <Form.List name="args">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (
                                    <Space
                                        key={key}
                                        style={{ display: 'flex', marginBottom: 8 }}
                                        align="baseline"
                                    >
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'argKey']}
                                            rules={[
                                                {
                                                    required: true,
                                                    message: errorMessageEmptyInput
                                                },
                                                ({ getFieldValue }) => ({
                                                    validator(_, value) {
                                                        const args = getFieldValue('args') ?? [];
                                                        // compare trimmed keys: submit trims them too
                                                        const trimmedValue = (value ?? '').trim();
                                                        const occurrences = args.filter(
                                                            (arg: any) =>
                                                                arg &&
                                                                (arg.argKey ?? '').trim() ===
                                                                    trimmedValue
                                                        );
                                                        if (
                                                            trimmedValue &&
                                                            occurrences.length > 1
                                                        ) {
                                                            return Promise.reject(
                                                                new Error(
                                                                    t(
                                                                        'messages:error-duplicate-argument-key'
                                                                    )
                                                                )
                                                            );
                                                        }
                                                        return Promise.resolve();
                                                    }
                                                })
                                            ]}
                                        >
                                            <Input placeholder={t('d:argument-key')} />
                                        </Form.Item>
                                        <Form.Item {...restField} name={[name, 'argValue']}>
                                            <Input placeholder={t('d:argument-value')} />
                                        </Form.Item>
                                        <MinusCircleOutlined onClick={() => remove(name)} />
                                    </Space>
                                ))}
                                <Form.Item>
                                    <Button
                                        type="dashed"
                                        onClick={() => add({ argKey: '', argValue: '' })}
                                        block
                                        icon={<PlusOutlined />}
                                    >
                                        {t('actions:add2', { name: t('d:argument') })}
                                    </Button>
                                </Form.Item>
                            </>
                        )}
                    </Form.List>
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
