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
import { Button, Input, Form, Select, Modal, Space } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import { showError, showSuccess, showInfo, useCreate } from '@helpers';
import { WarehouseWorkerCustomPermissionModelV2 } from '@helpers';
import { FormOptionType } from 'models/Models';
import { gql } from 'graphql-request';

const { Option } = Select;

// keys handled by the backend itself: never asked as assignment arguments
const RESERVED_PLACEHOLDERS = ['WH', 'OBJECT'];

export const detectArgumentKeys = (lines: Array<{ permission: string }>): Array<string> => {
    const keys: Array<string> = [];
    lines.forEach((line) => {
        // fresh regex per line: a shared global regex carries lastIndex across strings
        const regex = /\[([A-Za-z0-9_]+)\]/g;
        let match;
        while ((match = regex.exec(line.permission ?? '')) !== null) {
            const key = match[1];
            if (!RESERVED_PLACEHOLDERS.includes(key) && !keys.includes(key)) {
                keys.push(key);
            }
        }
    });
    return keys;
};

export interface ISingleItemProps {
    id: string | any;
    username: string | any;
}

export const AddWarehouseWorkerCustomPermissionForm = (props: ISingleItemProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes
    // router.query values can be undefined (first render) or arrays: normalize once
    const workerId = Array.isArray(props.id) ? props.id[0] : props.id;
    const workerUsername = Array.isArray(props.username) ? props.username[0] : props.username;

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

    // custom permissions options; the ones already assigned to the worker are disabled
    const [customPermissionsOptions, setCustomPermissionsOptions] = useState<Array<FormOptionType>>(
        []
    );
    const [assignedCustomPermissionIds, setAssignedCustomPermissionIds] = useState<Array<string>>(
        []
    );

    useEffect(() => {
        if (!workerId) return;
        const query = gql`
            query getWorkerCustomPermissionsInfo(
                $assignmentsFilters: WarehouseWorkerCustomPermissionSearchFilters
            ) {
                customPermissions(itemsPerPage: 1000) {
                    results {
                        id
                        name
                    }
                }
                warehouseWorkerCustomPermissions(filters: $assignmentsFilters, itemsPerPage: 1000) {
                    results {
                        customPermissionId
                    }
                }
            }
        `;
        graphqlRequestClient
            .request(query, { assignmentsFilters: { warehouseWorkerId: workerId } })
            .then((result: any) => {
                const newIdOpts: Array<FormOptionType> = [];
                result.customPermissions?.results
                    .sort((a: any, b: any) => a.name.localeCompare(b.name))
                    .forEach(({ id, name }: any) => {
                        newIdOpts.push({ text: name, key: id });
                    });
                setCustomPermissionsOptions(newIdOpts);
                setAssignedCustomPermissionIds(
                    result.warehouseWorkerCustomPermissions?.results.map(
                        (item: any) => item.customPermissionId
                    ) ?? []
                );
            })
            .catch((error: any) => {
                showError(t('messages:error-getting-data'));
                console.log(error);
            });
    }, [workerId]);

    // when a custom permission is selected, detect the [KEY] placeholders used by its
    // lines and prefill the argument keys (values already typed by the user are kept)
    const onCustomPermissionChange = (value: string) => {
        if (!value) return;
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
            .request(query, { filters: { customPermissionId: value } })
            .then((result: any) => {
                const detectedKeys = detectArgumentKeys(
                    result.customPermissionLines?.results ?? []
                );
                // keys are compared trimmed everywhere (validation and submit trim them too)
                const currentArgs = (form.getFieldValue('args') ?? []).filter(
                    (arg: any) => arg && arg.argKey && arg.argKey.trim() !== ''
                );
                const valuesByKey: { [key: string]: any } = {};
                currentArgs.forEach((arg: any) => {
                    valuesByKey[arg.argKey.trim()] = arg.argValue;
                });
                const detectedArgs = detectedKeys.map((key) => ({
                    argKey: key,
                    argValue: valuesByKey[key] ?? ''
                }));
                // keep user-added keys (with a value) that are not part of the detected ones
                const customArgs = currentArgs.filter(
                    (arg: any) => arg.argValue && !detectedKeys.includes(arg.argKey.trim())
                );
                form.setFieldsValue({ args: [...detectedArgs, ...customArgs] });
            })
            .catch((error: any) => {
                showError(t('messages:error-getting-data'));
                console.log(error);
            });
    };

    //CREATE warehouse worker custom permission
    const {
        isLoading: createLoading,
        result: createResult,
        mutate: createAssignment
    } = useCreate(
        WarehouseWorkerCustomPermissionModelV2.resolverName,
        WarehouseWorkerCustomPermissionModelV2.endpoints.create,
        ['id']
    );

    useEffect(() => {
        if (!(createResult && createResult.data)) return;

        if (createResult.success) {
            showSuccess(t('messages:success-created'));
            router.push(`/warehouse-workers/${workerId}`);
        }
    }, [createResult]);

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
                if (!workerId) {
                    showError(t('messages:error-creating-data'));
                    return;
                }
                createAssignment({
                    input: {
                        warehouseWorkerId: workerId,
                        customPermissionId: formData.customPermissionId,
                        ...(args.length > 0 ? { extras } : {})
                    }
                });
                setUnsavedChanges(false);
            })
            .catch((err) => {
                showError(t('messages:error-creating-data'));
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
        form.setFieldsValue({ warehouseWorkerName: workerUsername });
    }, [workerUsername]);

    useEffect(() => {
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
                <Form.Item name="warehouseWorkerName" label={t('d:warehouseWorker')}>
                    <Input disabled />
                </Form.Item>
                <Form.Item
                    name="customPermissionId"
                    label={t('common:custom-permission')}
                    rules={[{ required: true, message: errorMessageEmptyInput }]}
                >
                    <Select
                        allowClear
                        showSearch
                        optionFilterProp="children"
                        placeholder={`${t('messages:please-select-a', {
                            name: t('common:custom-permission')
                        })}`}
                        onChange={onCustomPermissionChange}
                    >
                        {customPermissionsOptions?.map((customPermission: any) => (
                            <Option
                                key={customPermission.key}
                                value={customPermission.key}
                                disabled={assignedCustomPermissionIds.includes(
                                    customPermission.key
                                )}
                            >
                                {customPermission.text}
                            </Option>
                        ))}
                    </Select>
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
                    <Button type="primary" loading={createLoading} onClick={onFinish}>
                        {t('actions:submit')}
                    </Button>
                    <Button onClick={onCancel}>{t('actions:cancel')}</Button>
                </Space>
            </div>
        </WrapperForm>
    );
};
