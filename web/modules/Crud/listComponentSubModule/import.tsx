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

import { useEffect, useState } from 'react';
import { showSuccess, useTranslationWithFallback as useTranslation } from '@helpers';
import { showError } from '@helpers';
import { ExportFormat } from 'generated/graphql';
import { useAuth } from 'context/AuthContext';
import { Button, Form, Modal, Upload } from 'antd';
import { UploadProps } from 'antd/lib';
import { gql } from 'graphql-request';
import { StyledForm, WrapperForm } from '@components';
import { UploadOutlined } from '@ant-design/icons';

interface UseImportDataProps {
    functionName: string;
    titleLabel?: any;
    onCancel: () => void;
    onSuccess: () => void;
}

export const useImportData = ({
    functionName,
    titleLabel,
    onCancel,
    onSuccess
}: UseImportDataProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const [form] = Form.useForm();
    const [resetForm, setResetForm] = useState<boolean>(false);

    let base64String: string | undefined = undefined;
    let loadedFile: any = undefined;

    useEffect(() => {
        if (resetForm) {
            form.resetFields();
            setResetForm(false);
        }
    }, [resetForm]);

    const props: UploadProps = {
        onChange({ file }) {
            if (file.status === 'done') {
                loadedFile = file;
            }
        },
        onRemove() {
            loadedFile = undefined;
        },
        defaultFileList: [],
        name: 'file',
        accept: '.xlsx',
        maxCount: 1,
        showUploadList: true
    };

    const handleBeforeUpload = (file: File) => {
        const maxSize = 1024 * 1024;
        const isXlsx =
            file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        if (!isXlsx) {
            showError(`${t('messages:xlsx-file-format-error')}`);
            return;
        }
        if (file.size > maxSize) {
            showError(
                `${t('messages:xlsx-file-size-error', { size: Math.round(maxSize / 1000000) })}`
            );
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const BS64 = e.target?.result as string;
            const base64Splited = BS64.split(',');
            base64String = base64Splited[1];
        };
        reader.readAsDataURL(file);
        return;
    };

    const handleYes = async () => {
        await handleUpload();
        setResetForm(true);
        onSuccess();
    };

    const handleNo = async () => {
        setResetForm(true);
        onCancel();
    };

    const handleUpload = async () => {
        if (!functionName || !base64String || !loadedFile) {
            showError(t('messages:error-uploading-file'));
            setResetForm(true);
            onSuccess();
            return;
        }

        const query = gql`
            mutation executeFunction($functionName: String!, $event: JSON!) {
                executeFunction(functionName: $functionName, event: $event) {
                    status
                    output
                }
            }
        `;
        const variables = {
            functionName: functionName,
            event: {
                input: {
                    file: base64String,
                    format: ExportFormat.Xlsx
                }
            }
        };

        try {
            const result = await graphqlRequestClient.request(query, variables);
            if (result.executeFunction.status === 'ERROR') {
                showError(result.executeFunction.output);
            } else if (
                result.executeFunction.status === 'OK' &&
                result.executeFunction.output.status === 'KO'
            ) {
                showError(t(`errors:${result.executeFunction.output.output.code}`));
                console.log('Backend_message', result.executeFunction.output.output);
            } else {
                showSuccess(t('messages:success-imported'));
            }
        } catch (error) {
            showError(t('messages:error-executing-function'));
        } finally {
            setResetForm(true);
            onSuccess();
        }
    };

    const displayModal = () => {
        Modal.confirm({
            title: titleLabel ? titleLabel : t('common:excel-imports'),
            content: (
                <WrapperForm>
                    <StyledForm
                        layout="vertical"
                        autoComplete="off"
                        scrollToFirstError
                        size="small"
                        form={form}
                    >
                        <Form.Item>
                            <Upload {...props} beforeUpload={handleBeforeUpload}>
                                <Button
                                    icon={<UploadOutlined />}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    {t('common:select-file')}
                                </Button>
                            </Upload>
                        </Form.Item>
                    </StyledForm>
                </WrapperForm>
            ),
            onOk: handleYes,
            onCancel: handleNo,
            okText: t('common:bool-yes'),
            cancelText: t('common:bool-no')
        });
    };

    return {
        displayImportModal: () => displayModal()
    };
};
