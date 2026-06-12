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
import { Col, Input, Row, Typography } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC } from 'react';
import styled from 'styled-components';

const { TextArea } = Input;
const { Text } = Typography;

// description is stored as raw base64 (no data-url header): the backend mail
// functions decode the column content directly. Both helpers are UTF-8 safe.
export const decodeMailTemplateContent = (base64Data: string): string => {
    try {
        const actualBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
        const bytes = Uint8Array.from(window.atob(actualBase64), (c) => c.charCodeAt(0));
        return new TextDecoder('utf-8').decode(bytes);
    } catch (error) {
        console.log(error);
        return base64Data;
    }
};

export const encodeMailTemplateContent = (content: string): string => {
    const bytes = new TextEncoder().encode(content);
    let binary = '';
    // String.fromCharCode is applied by chunks to avoid blowing the call stack
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + chunkSize)));
    }
    return window.btoa(binary);
};

const PreviewFrame = styled.iframe<{ height: number }>`
    width: 100%;
    height: ${(props) => props.height}px;
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    background: #fff;
`;

export interface IMailTemplatePreviewProps {
    content: string;
    height?: number;
}

const MailTemplatePreview: FC<IMailTemplatePreviewProps> = ({
    content,
    height = 500
}: IMailTemplatePreviewProps) => {
    // sandbox with no flags: the template is rendered but scripts are never executed
    return <PreviewFrame sandbox="" srcDoc={content} height={height} />;
};

export interface IMailTemplateContentEditorProps {
    value: string;
    onChange: (value: string) => void;
    height?: number;
}

const MailTemplateContentEditor: FC<IMailTemplateContentEditorProps> = ({
    value,
    onChange,
    height = 500
}: IMailTemplateContentEditorProps) => {
    const { t } = useTranslation();

    return (
        <Row gutter={16}>
            <Col xs={24} lg={12}>
                <Text type="secondary">{t('d:content')}</Text>
                <TextArea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    style={{
                        height: height,
                        resize: 'none',
                        fontFamily: 'monospace',
                        fontSize: '12px'
                    }}
                />
            </Col>
            <Col xs={24} lg={12}>
                <Text type="secondary">{t('d:preview')}</Text>
                <MailTemplatePreview content={value} height={height} />
            </Col>
        </Row>
    );
};

export { MailTemplatePreview, MailTemplateContentEditor };
