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
import { Button, Form, Select, Modal, Space, Upload, UploadProps, message } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import { showError, showSuccess, showInfo } from '@helpers';
import configs from '../../../../common/configs.json';
import parameters from '../../../../common/parameters.json';
import { InboxOutlined } from '@ant-design/icons';
import { gql } from 'graphql-request';

const { Option } = Select;
const { Dragger } = Upload;

export interface ISingleItemProps {
    thirdPartyId: string | any;
    thirdPartyName: string | any;
}

export const AddDocumentsForm = (props: ISingleItemProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes
    const [filesList, setFilesList] = useState<any[]>([]);

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

    const errorMessageEmptyInput = t('messages:error-message-empty-input');
    const submit = t('actions:submit');
    // END TEXTS TRANSLATION

    // TYPED SAFE ALL
    const [form] = Form.useForm();

    // BULK CREATION //
    const createDocuments = async (inputs: any) => {
        const createDocumentsMutation = gql`
            mutation createCustomObjects($inputs: [CreateCustomObjectInput!]!) {
                createCustomObjects(inputs: $inputs)
            }
        `;

        const documentVariables = {
            inputs
        };

        const documentResult = await graphqlRequestClient.request(
            createDocumentsMutation,
            documentVariables
        );
        if (documentResult) {
            if (documentResult.createCustomObjects) {
                router.push(`/third-parties/${props.thirdPartyId}`);
                showSuccess(t('messages:success-created'));
            } else {
                showError(t('messages:error-creating-data'));
            }
        }
    };

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                const tmp_filesList = filesList.map(({ uid, ...rest }) => rest);
                createDocuments(tmp_filesList);
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
            setFilesList((prevFilesList) => [
                ...prevFilesList,
                {
                    name: props.thirdPartyName + '_' + name,
                    documentAttached: base64String,
                    thirdPartyId: props.thirdPartyId,
                    category: parameters.CUSTOM_OBJECT_CATEGORY_THIRD_PARTY_DOCUMENT
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
            height: '200px',
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
        <WrapperForm>
            <Form form={form} layout="vertical" scrollToFirstError>
                <Form.Item
                    label={t('d:documents')}
                    name="documents"
                    rules={[{ required: true, message: errorMessageEmptyInput }]}
                >
                    <Dragger {...uploadProps} beforeUpload={handleBeforeUpload}>
                        <p className="ant-upload-drag-icon">
                            <InboxOutlined />
                        </p>
                        <p className="ant-upload-text">{t('messages:file-drag')}</p>
                    </Dragger>
                </Form.Item>
            </Form>
            <div style={{ textAlign: 'center' }}>
                <Space>
                    <Button type="primary" loading={false} onClick={onFinish}>
                        {submit}
                    </Button>
                    <Button onClick={onCancel}>{t('actions:cancel')}</Button>
                </Space>
            </div>
        </WrapperForm>
    );
};
