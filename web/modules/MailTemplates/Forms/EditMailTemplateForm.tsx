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
import { Button, Form, Input, Modal, Space, Upload, UploadProps, message } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { showError, showSuccess, useUpdate, MailTemplateModelV2 as model } from '@helpers';
import { InboxOutlined } from '@ant-design/icons';
import {
    MailTemplateContentEditor,
    decodeMailTemplateContent,
    encodeMailTemplateContent
} from '../Elements/MailTemplateContent';

const { Dragger } = Upload;

export type EditMailTemplateFormProps = {
    mailTemplateId: string;
    details: any;
};

export const EditMailTemplateForm: FC<EditMailTemplateFormProps> = ({
    mailTemplateId,
    details
}: EditMailTemplateFormProps) => {
    const { t } = useTranslation();
    const router = useRouter();
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes
    const [fileList, setFileList] = useState<any[]>([]);
    const [content, setContent] = useState<string>('');

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

    const [form] = Form.useForm();

    useEffect(() => {
        form.setFieldsValue({ name: details?.name });
        if (details?.description) {
            setContent(decodeMailTemplateContent(details.description));
        }
    }, [details]);

    const {
        isLoading: updateLoading,
        result: updateResult,
        mutate
    } = useUpdate(model.resolverName, model.endpoints.update, ['id']);

    useEffect(() => {
        if (!(updateResult && updateResult.data)) return;
        if (updateResult.success) {
            setUnsavedChanges(false);
            showSuccess(t('messages:success-updated'));
            router.push(`/mail-templates/${mailTemplateId}`);
        } else {
            showError(t('messages:error-update-data'));
        }
    }, [updateResult]);

    const handleBeforeUpload = (file: File) => {
        const maxSize = 20000000;

        if (file.size > maxSize) {
            message.error(
                `${t('messages:file-size-error', { size: Math.round(maxSize / 1000000) })}`
            );
            return false;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            // the file is loaded as text so its content can be edited live below
            setContent((e.target?.result as string) ?? '');
            setFileList([file]);
            setUnsavedChanges(true);
        };
        reader.readAsText(file);
        //Warning : return must be to false to avoid auto upload
        return false;
    };

    const onContentChange = (value: string) => {
        setContent(value);
        setUnsavedChanges(true);
    };

    const uploadProps: UploadProps = {
        name: 'file',
        accept: '.html,.htm,.txt,.xml,.json,.csv',
        multiple: false,
        maxCount: 1,
        fileList: fileList,
        onRemove() {
            setFileList([]);
        }
    };

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                // category stays untouched: it is fixed for mail templates
                mutate({
                    id: mailTemplateId,
                    input: {
                        name: form.getFieldValue('name'),
                        // edited content is encoded to raw base64 (no data-url header):
                        // the backend mail functions decode the column content directly
                        description: encodeMailTemplateContent(content)
                    }
                });
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

    return (
        <WrapperForm>
            <Form form={form} layout="vertical" scrollToFirstError>
                <Form.Item
                    label={t('d:name')}
                    name="name"
                    rules={[{ required: true, message: t('messages:error-message-empty-input') }]}
                >
                    <Input onChange={() => setUnsavedChanges(true)} />
                </Form.Item>
                <Form.Item label={t('d:template')}>
                    <Dragger {...uploadProps} beforeUpload={handleBeforeUpload}>
                        <p className="ant-upload-drag-icon">
                            <InboxOutlined />
                        </p>
                        <p className="ant-upload-text">{t('messages:file-drag')}</p>
                    </Dragger>
                </Form.Item>
                <MailTemplateContentEditor value={content} onChange={onContentChange} />
            </Form>
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
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
