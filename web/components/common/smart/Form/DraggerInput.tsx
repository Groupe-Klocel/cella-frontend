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
import { DeleteOutlined, EyeOutlined, InboxOutlined } from '@ant-design/icons';
import { Button, Upload, UploadProps, message } from 'antd';
import useTranslation from 'next-translate/useTranslation';
import { FC, useEffect, useState } from 'react';

export interface IDraggerInputProps {
    setValues: any;
    editValue?: string;
}

const DraggerInput: FC<IDraggerInputProps> = (props) => {
    const [previewSrc, setPreviewSrc] = useState<string | undefined>(undefined);
    const { Dragger } = Upload;
    const { t } = useTranslation();

    useEffect(() => {
        if (props.editValue) {
            setPreviewSrc(props.editValue!);
        }
    }, [props.editValue]);

    const uploadProps: UploadProps = {
        name: 'file',
        accept: 'image/*',
        action: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT,
        headers: {
            authorization: 'authorization-text'
        },
        maxCount: 1,
        showUploadList: false,
        style: {
            width: '100%',
            height: '200px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        }
    };

    const handleDelete = (e: any) => {
        e.stopPropagation();
        setPreviewSrc(undefined);
    };

    const handleView = () => {
        if (previewSrc) {
            const newWindow = window.open('', '_blank');
            const img = new Image();
            img.src = previewSrc;
            newWindow?.document.body.appendChild(img);
        }
    };

    const handleBeforeUpload = (file: File) => {
        const maxSize = 1024 * 1024;

        const isJpgOrPng =
            file.type === 'image/ico' ||
            file.type === 'image/jpg' ||
            file.type === 'image/jpeg' ||
            file.type === 'image/png';
        if (!isJpgOrPng) {
            message.error(`${t('messages:file-format-error')}`);
            return false;
        }
        if (file.size > maxSize) {
            message.error(
                `${t('messages:file-size-error', { size: Math.round(maxSize / 1000000) })}`
            );
            return false;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64String: string = e.target?.result as string;
            setPreviewSrc(base64String);
            props.setValues({ logo: base64String });
        };
        reader.readAsDataURL(file);
        return false;
    };

    return (
        <Dragger {...uploadProps} beforeUpload={handleBeforeUpload}>
            {previewSrc ? (
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-evenly',
                        alignItems: 'center'
                    }}
                >
                    <img
                        src={previewSrc}
                        alt="uploaded"
                        style={{ maxWidth: '3%', height: 'auto' }}
                    />
                    <div
                        className="image-buttons"
                        style={{
                            display: 'flex',
                            gap: '10px',
                            zIndex: 1000
                        }}
                    >
                        <Button
                            icon={<EyeOutlined />}
                            onClick={handleView}
                            style={{ marginRight: 10 }}
                        />
                        <Button icon={<DeleteOutlined />} onClick={handleDelete} />
                    </div>
                </div>
            ) : (
                <>
                    <p className="ant-upload-drag-icon">
                        <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">{t('messages:file-drag-image')}</p>
                </>
            )}
        </Dragger>
    );
};

DraggerInput.displayName = 'DraggerInput';

export { DraggerInput };
