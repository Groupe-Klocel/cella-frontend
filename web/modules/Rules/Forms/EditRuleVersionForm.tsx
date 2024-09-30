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
import { Button, Input, Form, Space, Modal, InputNumber, Select } from 'antd';
import useTranslation from 'next-translate/useTranslation';
import { FC, useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import {
    useUpdateRuleVersionMutation,
    UpdateRuleVersionMutation,
    UpdateRuleVersionMutationVariables,
    useListConfigsForAScopeQuery
} from 'generated/graphql';
import { showError, showSuccess, showInfo, checkUndefinedValues } from '@helpers';

export type EditRuleVersionFormProps = {
    ruleVersionId: string;
    details: any;
};

//FIXME: regarder pourquoi pas de delete de baseRotationUNit
export const EditRuleVersionForm: FC<EditRuleVersionFormProps> = ({
    ruleVersionId,
    details
}: EditRuleVersionFormProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();

    // TYPED SAFE ALL
    const [form] = Form.useForm();
    const [rule, setRuleName] = useState(details.rule.name);
    const [version, setVersion] = useState(details.version);
    const [order, setOrder] = useState<any>();
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes
    const { Option } = Select;
    const [statusTexts, setStatusTexts] = useState<any>();

    useEffect(() => {
        if (details) {
            setRuleName(details?.rule.name);
            setVersion(details?.version);
        }
    }, [details]);

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

    const { mutate, isPending: updateLoading } = useUpdateRuleVersionMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: UpdateRuleVersionMutation,
                _variables: UpdateRuleVersionMutationVariables,
                _context: any
            ) => {
                router.push(`/rules/version/${data.updateRuleVersion?.id}`);
                showSuccess(t('messages:success-updated'));
            },
            onError: () => {
                showError(t('messages:error-update-data'));
            }
        }
    );

    const updateRuleVersion = ({ id, input }: UpdateRuleVersionMutationVariables) => {
        mutate({ id, input });
    };

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                checkUndefinedValues(form);
                // Here make api call of something else
                const formData = form.getFieldsValue(true);

                delete formData.ruleId;
                delete formData.id;
                delete formData.extras;
                delete formData.rule;
                delete formData.version;

                updateRuleVersion({ id: ruleVersionId, input: formData });
                setUnsavedChanges(false);
            })
            .catch((err) => {
                showError(t('messages:error-update-data'));
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
            ...details,
            rule: details.rule.name,
            version: details.version
        };
        form.setFieldsValue(tmp_details);
        if (updateLoading) {
            showInfo(t('messages:info-create-wip'));
        }
    }, [updateLoading]);

    const statusTextList = useListConfigsForAScopeQuery(graphqlRequestClient, {
        scope: 'rule_version_status'
    });

    useEffect(() => {
        if (statusTextList) {
            setStatusTexts(statusTextList?.data?.listConfigsForAScope);
        }
    }, [statusTextList]);

    return (
        <WrapperForm>
            <Form
                form={form}
                layout="vertical"
                scrollToFirstError
                onValuesChange={() => setUnsavedChanges(true)}
            >
                <Form.Item
                    label={t('d:rule_name')}
                    name="rule"
                    rules={[
                        {
                            required: true
                        }
                    ]}
                >
                    <Input disabled={true} />
                </Form.Item>
                <Form.Item
                    label={t('d:version')}
                    name="version"
                    rules={[
                        {
                            required: true
                        }
                    ]}
                >
                    <Input disabled={true} />
                </Form.Item>
                <Form.Item name="status" label={t('d:status')}>
                    <Select defaultValue="">
                        <Option value="">{t('common:none')}</Option>
                        {statusTexts?.map((status: any) => (
                            <Option key={status.code} value={parseInt(status.code)}>
                                {status.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item name="description" label={t('d:description')}>
                    <Input />
                </Form.Item>
            </Form>
            <div style={{ textAlign: 'center' }}>
                <Space>
                    <Button type="primary" loading={updateLoading} onClick={onFinish}>
                        {t('actions:submit')}
                    </Button>
                    <Button onClick={onCancel}>{t('actions:cancel')}</Button>
                </Space>
            </div>
        </WrapperForm>
    );
};
