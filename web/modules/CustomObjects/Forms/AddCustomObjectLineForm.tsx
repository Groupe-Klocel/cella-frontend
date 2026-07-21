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
import { Button, Form, Input, InputNumber, Modal, Space, Upload, UploadProps, message } from 'antd';
import {
    showError,
    showSuccess,
    useCreate,
    useTranslationWithFallback as useTranslation,
    CustomObjectLineModelV2 as model
} from '@helpers';
import { InboxOutlined } from '@ant-design/icons';
import { FC, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { DocumentPreview } from '../Elements/DocumentPreview';

const { Dragger } = Upload;
const { TextArea } = Input;

export interface AddCustomObjectLineFormProps {
    customObjectId: string;
}

export const AddCustomObjectLineForm: FC<AddCustomObjectLineFormProps> = ({
    customObjectId
}: AddCustomObjectLineFormProps) => {
    const { t } = useTranslation();
    const router = useRouter();
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const [documentAttached, setDocumentAttached] = useState<string | undefined>();
    const [fileName, setFileName] = useState<string | undefined>();

    const [form] = Form.useForm();

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
        isLoading: createLoading,
        result: createResult,
        mutate
    } = useCreate(model.resolverName, model.endpoints.create, ['id']);

    useEffect(() => {
        if (!(createResult && createResult.data)) return;
        if (createResult.success) {
            setUnsavedChanges(false);
            showSuccess(t('messages:success-created'));
            router.push(`/custom-objects/${customObjectId}`);
        } else {
            showError(t('messages:error-creating-data'));
        }
    }, [createResult]);

    const handleBeforeUpload = (file: File) => {
        // drag-and-drop bypasses the input accept filter, so validate the type explicitly
        const isAllowed = file.type.startsWith('image/') || file.type === 'application/pdf';
        if (!isAllowed) {
            message.error(`${t('messages:file-format-error')}`);
            return false;
        }
        const maxSize = 20000000;
        if (file.size > maxSize) {
            message.error(
                `${t('messages:file-size-error', { size: Math.round(maxSize / 1000000) })}`
            );
            return false;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            setDocumentAttached((e.target?.result as string) ?? undefined);
            setFileName(file.name);
            setUnsavedChanges(true);
        };
        reader.readAsDataURL(file);
        return false;
    };

    const uploadProps: UploadProps = {
        name: 'file',
        accept: 'image/*,application/pdf',
        multiple: false,
        maxCount: 1,
        showUploadList: false,
        beforeUpload: handleBeforeUpload
    };

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                const input: any = {
                    customObjectId,
                    name: form.getFieldValue('name'),
                    lineNumber: form.getFieldValue('lineNumber')
                };
                const description = form.getFieldValue('description');
                if (description) input.description = description;
                if (documentAttached) input.documentAttached = documentAttached;
                mutate({ input });
            })
            .catch(() => {
                showError(t('messages:error-creating-data'));
            });
    };

    const onCancel = () => {
        Modal.confirm({
            title: t('messages:confirm-leaving-page'),
            onOk: () => {
                // only drop the unsaved-changes guard once the user actually confirms leaving
                setUnsavedChanges(false);
                router.back();
            },
            okText: t('common:bool-yes'),
            cancelText: t('common:bool-no')
        });
    };

    return (
        <WrapperForm>
            <Form form={form} layout="vertical" scrollToFirstError>
                <Form.Item
                    label={t('d:lineNumber')}
                    name="lineNumber"
                    rules={[{ required: true, message: t('messages:error-message-empty-input') }]}
                >
                    <InputNumber
                        min={1}
                        style={{ width: '100%' }}
                        onChange={() => setUnsavedChanges(true)}
                    />
                </Form.Item>
                <Form.Item
                    label={t('d:name')}
                    name="name"
                    rules={[{ required: true, message: t('messages:error-message-empty-input') }]}
                >
                    <Input onChange={() => setUnsavedChanges(true)} />
                </Form.Item>
                <Form.Item label={t('d:description')} name="description">
                    <TextArea rows={3} onChange={() => setUnsavedChanges(true)} />
                </Form.Item>
                <Form.Item label={t('d:documentAttached')}>
                    <Dragger {...uploadProps}>
                        <p className="ant-upload-drag-icon">
                            <InboxOutlined />
                        </p>
                        <p className="ant-upload-text">{t('messages:file-drag')}</p>
                    </Dragger>
                    {fileName ? <p style={{ marginTop: 8 }}>{fileName}</p> : null}
                    {documentAttached ? (
                        <div style={{ marginTop: 8 }}>
                            <Button
                                danger
                                size="small"
                                onClick={() => {
                                    setDocumentAttached(undefined);
                                    setFileName(undefined);
                                    setUnsavedChanges(true);
                                }}
                                style={{ marginBottom: 8 }}
                            >
                                {t('actions:delete')}
                            </Button>
                            <DocumentPreview src={documentAttached} height="40vh" />
                        </div>
                    ) : null}
                </Form.Item>
            </Form>
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
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
