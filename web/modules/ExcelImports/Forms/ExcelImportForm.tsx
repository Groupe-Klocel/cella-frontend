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
import { Button, message } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import { ExportFormat } from 'generated/graphql';
import { showError, showSuccess } from '@helpers';

import { ModelType } from 'models/ModelsV2';
import { UploadOutlined, EllipsisOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { Upload } from 'antd';
import { gql } from 'graphql-request';

export interface ISingleItemProps {
    dataModel: ModelType;
}

export const ExcelImportForm = () => {
    const { t } = useTranslation('common');
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const [importing, setUploading] = useState(false);
    const [base64String, setbase64String] = useState<string | undefined>(undefined);
    const [fileList, setFileList] = useState<any>([]);
    const [loadedFile, setLoadedfile] = useState<any>(undefined);

    const props: UploadProps = {
        onChange({ file, fileList }) {
            if (file.status !== 'uploading') {
                setFileList(fileList);
                setLoadedfile(file);
            }
        },
        onRemove() {
            setFileList([]);
            console.log('delete', fileList);
        },
        defaultFileList: [],
        name: 'file',
        accept: '.xlsx',
        maxCount: 1,
        showUploadList: true,
        style: {
            width: '100%',
            height: '200px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        }
    };
    const handleBeforeUpload = (file: File) => {
        const maxSize = 1024 * 1024;
        const isXlsx =
            file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        if (!isXlsx) {
            message.error(`${t('messages:xlsx-file-format-error')}`);
            return false;
        }
        if (file.size > maxSize) {
            message.error(
                `${t('messages:xlsx-file-size-error', { size: Math.round(maxSize / 1000000) })}`
            );
            return false;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const BS64 = e.target?.result as string;
            const base64Splited = BS64.split(',');
            setbase64String(base64Splited[1]);
        };
        reader.readAsDataURL(file);
        return false;
    };

    const handleUpload = async () => {
        setUploading(true);
        try {
            const functionName = 'importData';
            const query = gql`mutation ${functionName}($file: String!, $format: ExportFormat) {
                ${functionName}(file: $file, format: $format) 
              }`;
            const variables = {
                file: base64String,
                format: ExportFormat.Xlsx
            };
            const xlsxImportResult = await graphqlRequestClient.request(query, variables);
            if (!xlsxImportResult) {
                showError('messages:xlsx-file-import-error');
            } else {
                showSuccess(t('messages:xlsx-success-importing'));
            }
            setUploading(false);
        } catch (error: any) {
            if (error.response.errors[0].extensions.code === 'IMPORT-000110') {
                message.error(
                    `${t('messages:xlsx-file-import-error-output', {
                        output: error.response.errors[0].extensions.variables.output
                    })}`
                );
            } else {
                showError(t('messages:xlsx-file-import-error'));
            }
            console.log('xlsxImportDataError: ', error);
            setUploading(false);
        }
    };
    const selectFileLabel = t('common:select-file');
    return (
        <WrapperForm>
            <Upload {...props} beforeUpload={handleBeforeUpload}>
                <Button ghost icon={<EllipsisOutlined />}>
                    {selectFileLabel}
                </Button>
            </Upload>
            <Button
                type="primary"
                icon={<UploadOutlined />}
                onClick={handleUpload}
                disabled={fileList.length === 0}
                loading={importing}
                style={{ marginTop: 16 }}
            >
                {importing ? t('common:importing') : t('common:start-import')}
            </Button>
        </WrapperForm>
    );
};
