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

import { useEffect, useRef, useState } from 'react';
import { showSuccess, useTranslationWithFallback as useTranslation } from '@helpers';
import { showError } from '@helpers';
import { ExportFormat } from 'generated/graphql';
import { useAuth } from 'context/AuthContext';
import { Button, Modal, Upload } from 'antd';
import { UploadProps } from 'antd/lib';
import { gql } from 'graphql-request';
import { UploadOutlined } from '@ant-design/icons';

// Default cap on the selected file. The SAP "open orders" export is a few MB, and
// the base64 payload sent to the API is ~1.33x the file size.
const DEFAULT_MAX_FILE_SIZE_MO = 20;

interface UseImportDataProps {
    functionName: string;
    titleLabel?: any;
    onCancel: () => void;
    onSuccess: () => void;
    // Max size of the selected file, in Mo (default: DEFAULT_MAX_FILE_SIZE_MO).
    maxFileSizeMo?: number;
    // Run the function in the background and return immediately. Mandatory for big
    // files: a synchronous executeFunction would hit the HTTP timeout.
    longRunningTask?: boolean;
    // Name of the CELLA notification raised when a long running task completes.
    notificationName?: string;
    // Extra keys merged into event.input (e.g. { dry_run: true }).
    extraInput?: Record<string, any>;
}

export const useImportData = ({
    functionName,
    titleLabel,
    onCancel,
    onSuccess,
    maxFileSizeMo = DEFAULT_MAX_FILE_SIZE_MO,
    longRunningTask = false,
    notificationName,
    extraInput
}: UseImportDataProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const [resetUpload, setResetUpload] = useState<boolean>(false);
    // Refs, not plain variables: the file is read asynchronously by the FileReader
    // and consumed later by the modal's onOk, i.e. across renders.
    // The base64 payload is held as a *promise* so that clicking OK right after
    // picking the file waits for the read instead of sending an empty payload.
    const base64PromiseRef = useRef<Promise<string | undefined> | undefined>(undefined);
    const loadedFileRef = useRef<any>(undefined);

    useEffect(() => {
        if (resetUpload) {
            base64PromiseRef.current = undefined;
            loadedFileRef.current = undefined;
            setResetUpload(false);
        }
    }, [resetUpload]);

    const props: UploadProps = {
        onChange({ file }) {
            if (file.status !== 'removed') {
                loadedFileRef.current = file;
            }
        },
        onRemove() {
            loadedFileRef.current = undefined;
            base64PromiseRef.current = undefined;
        },
        defaultFileList: [],
        name: 'file',
        accept: '.xlsx',
        maxCount: 1,
        showUploadList: true,
        // The file is never POSTed by antd: it is read locally and sent as base64
        // inside the executeFunction event.
        beforeUpload: () => false
    };

    const handleBeforeUpload = (file: File) => {
        const maxSize = maxFileSizeMo * 1024 * 1024;
        const isXlsx =
            file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        if (!isXlsx) {
            showError(`${t('messages:xlsx-file-format-error')}`);
            return Upload.LIST_IGNORE;
        }
        if (file.size > maxSize) {
            showError(`${t('messages:xlsx-file-size-error', { size: maxFileSizeMo })}`);
            return Upload.LIST_IGNORE;
        }

        base64PromiseRef.current = new Promise<string | undefined>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const BS64 = e.target?.result as string;
                resolve(BS64 ? BS64.split(',')[1] : undefined);
            };
            reader.onerror = () => resolve(undefined);
            reader.readAsDataURL(file);
        });

        loadedFileRef.current = file;
        return false;
    };

    const handleYes = async () => {
        // handleUpload throws when there is nothing to send: the rejection keeps
        // Modal.confirm open so the user does not lose their selection. onSuccess is
        // called here only, never inside handleUpload, to avoid a double reload.
        await handleUpload();
        setResetUpload(true);
        onSuccess();
    };

    const handleNo = async () => {
        setResetUpload(true);
        onCancel();
    };

    const handleUpload = async () => {
        if (!functionName || !loadedFileRef.current || !base64PromiseRef.current) {
            showError(t('messages:error-uploading-file'));
            throw new Error('useImportData: no file selected');
        }

        // Wait for the FileReader instead of racing it.
        const base64String = await base64PromiseRef.current;
        if (!base64String) {
            showError(t('messages:error-uploading-file'));
            throw new Error('useImportData: file could not be read');
        }

        const query = gql`
            mutation executeFunction(
                $functionName: String!
                $event: JSON!
                $longRunningTask: Boolean
                $notification: Boolean
                $notificationType: String
                $notificationName: String
            ) {
                executeFunction(
                    functionName: $functionName
                    event: $event
                    longRunningTask: $longRunningTask
                    notification: $notification
                    notificationType: $notificationType
                    notificationName: $notificationName
                ) {
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
                    format: ExportFormat.Xlsx,
                    ...extraInput
                }
            },
            longRunningTask,
            notification: longRunningTask,
            notificationType: longRunningTask ? 'NOTIF' : undefined,
            notificationName: longRunningTask ? (notificationName ?? functionName) : undefined
        };

        try {
            const result = await graphqlRequestClient.request(query, variables);
            if (result.executeFunction.status === 'ERROR') {
                showError(result.executeFunction.output);
            } else if (result.executeFunction.output?.status === 'KO') {
                // Checked BEFORE the longRunningTask branch: should the backend ever
                // answer synchronously with a KO payload, the error must surface
                // instead of being masked by an "import launched" success.
                const backendOutput = result.executeFunction.output.output;
                showError(
                    backendOutput?.code
                        ? t(`errors:${backendOutput.code}`)
                        : `${backendOutput?.message ?? t('messages:xlsx-file-import-error')}`
                );
                console.log('Backend_message', backendOutput);
            } else if (longRunningTask) {
                // Nothing to report yet: the function runs in the background and the
                // user is notified once it is over.
                showSuccess(t('messages:import-launched-in-background'));
            } else {
                showSuccess(t('messages:success-imported'));
                console.log('Backend_message', result.executeFunction.output?.output);
            }
        } catch (error) {
            showError(t('messages:error-executing-function'));
            console.log('executeFunctionError', error);
        }
    };

    const displayModal = () => {
        Modal.confirm({
            title: titleLabel ? titleLabel : t('common:excel-imports'),
            content: (
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
