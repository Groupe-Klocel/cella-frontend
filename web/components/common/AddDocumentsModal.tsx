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
import { Button, Form, Modal, Space, Upload, UploadProps, message, Input, Select } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { showError, showSuccess } from '@helpers';
import { InboxOutlined } from '@ant-design/icons';
import { gql } from 'graphql-request';
import { useAppState } from 'context/AppContext';

const { Dragger } = Upload;
const { Option } = Select;

export interface IAddDocumentsModalProps {
    showModal: {
        showAddDocumentModal: boolean;
        setShowAddDocumentModal: (value: boolean) => void;
    };
    objectType: 'Load' | 'Delivery';
    objectData: any;
    refetch: () => void;
}

export const AddDocumentsModal = (props: IAddDocumentsModalProps) => {
    const { t } = useTranslation();
    const { parameters } = useAppState();
    const { graphqlRequestClient } = useAuth();
    const [filesList, setFilesList] = useState<any[]>([]);
    const [form] = Form.useForm();

    const configsParamsCodes = useMemo(() => {
        const findValuesByScope = (items: any[], scope: string) => {
            return items.filter((item: any) => item.scope === scope).map((item: any) => item.value);
        };

        const FilesCategory = findValuesByScope(parameters, 'file_category');

        return { FilesCategory };
    }, [parameters]);

    // BULK CREATION //
    const createDocuments = async (inputs: any) => {
        const createDocumentsMutation = gql`
            mutation createDocumentAttachments($inputs: [CreateDocumentAttachmentInput!]!) {
                createDocumentAttachments(inputs: $inputs)
            }
        `;

        const documentVariables = {
            inputs
        };

        try {
            const documentResult = await graphqlRequestClient.request(
                createDocumentsMutation,
                documentVariables
            );
            if (documentResult && documentResult.createDocumentAttachments) {
                props.showModal.setShowAddDocumentModal(false);
                showSuccess(t('messages:success-created'));
                props.refetch();
                form.resetFields();
                setFilesList([]);
            } else {
                showError(t('messages:error-creating-data'));
            }
        } catch (error) {
            console.error('Error creating documents:', error);
            showError(t('messages:error-creating-data'));
        }
    };

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                const tmp_filesList = filesList.map(({ uid, ...rest }) => {
                    if (rest.description === '') {
                        rest.description = form.getFieldValue('description');
                    }
                    if (rest.fileCategory === '') {
                        rest.fileCategory = form.getFieldValue('fileCategory');
                    }
                    return rest;
                });
                createDocuments(tmp_filesList);
            })
            .catch((err) => {
                showError(t('messages:error-creating-data'));
            });
    };

    const onCancel = () => {
        props.showModal.setShowAddDocumentModal(false);
        form.resetFields();
        setFilesList([]);
    };

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
            const base64String: string = e.target?.result as string;
            const name = file.name;
            const fileExtention = name.split('.').pop();
            setFilesList((prevFilesList) => [
                ...prevFilesList,
                {
                    name: props.objectData.name + '_' + name,
                    filename: name,
                    fileType: fileExtention,
                    fileCategory: '',
                    objectName: props.objectType,
                    objectId: props.objectData.id,
                    fileContent: base64String.split(',')[1],
                    description: '',
                    extras: {
                        fullFileType: file.type
                    }
                }
            ]);
        };
        reader.readAsDataURL(file);
        //Warning : return must be to false to avoid auto upload
        return false;
    };

    useEffect(() => {
        if (filesList.length > 0) {
            const tmp_inputs = { inputs: filesList };
            form.setFieldsValue({ documents: tmp_inputs });
        } else {
            form.resetFields();
        }
    }, [filesList]);

    const uploadProps: UploadProps = {
        name: 'file',
        accept: '*/*',
        multiple: true,
        style: {
            width: '100%',
            maxHeight: '300px',
            overflowY: 'auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        fileList: filesList,
        onChange(info) {
            if (info.fileList.length === 0) {
                form.resetFields();
            }
        },
        onRemove(fileToRemove) {
            setFilesList(filesList.filter((file) => file.name !== fileToRemove.name));
        }
    };

    return (
        <Modal
            title={t('actions:add-documents')}
            open={props.showModal.showAddDocumentModal}
            onCancel={onCancel}
            width={800}
            style={{ maxHeight: '90vh' }}
            styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
            footer={[
                <Button key="cancel" onClick={onCancel}>
                    {t('actions:cancel')}
                </Button>,
                <Button key="submit" type="primary" onClick={onFinish}>
                    {t('actions:submit')}
                </Button>
            ]}
        >
            <WrapperForm>
                <Form form={form} layout="vertical" scrollToFirstError>
                    <Form.Item
                        label={t('d:documents')}
                        name="documents"
                        rules={[
                            { required: true, message: t('messages:error-message-empty-input') }
                        ]}
                    >
                        <Dragger {...uploadProps} beforeUpload={handleBeforeUpload}>
                            <p className="ant-upload-drag-icon">
                                <InboxOutlined />
                            </p>
                            <p className="ant-upload-text">{t('messages:file-drag')}</p>
                        </Dragger>
                    </Form.Item>
                    <Form.Item
                        label={t('d:file-category')}
                        name="fileCategory"
                        rules={[
                            { required: true, message: t('messages:error-message-empty-input') }
                        ]}
                    >
                        <Select
                            placeholder={t('messages:please-select-a', {
                                name: t('d:file-category')
                            })}
                        >
                            {configsParamsCodes.FilesCategory?.map((category: string) => (
                                <Option key={category} value={category}>
                                    {category}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item label={t('d:description')} name="description">
                        <Input.TextArea rows={4} />
                    </Form.Item>
                </Form>
            </WrapperForm>
        </Modal>
    );
};
