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

// Preview of a document of the document history, decoded by helpers/utils/documentFiles.ts:
//  - PDF (rbo_pdf, rml, pdf …): the browser's own PDF viewer (zoom, print, download);
//  - ZPL: the labels rendered as a PDF by Labelary, one page per label, with a switch to the
//    ZPL code, shown by itself when the rendering fails (Labelary unreachable, quota …);
//  - images, with antd's zoomable preview; text (function logs …) in a monospace block;
//  - any other format (xlsx …): a message pointing to the download.
// The iframe has no sandbox: Chrome's PDF viewer does not run in a sandboxed frame, and the
// content is the stored document itself (same choice as the appointments and custom objects
// previews).

import { DownloadOutlined } from '@ant-design/icons';
import {
    DocumentFileSource,
    decodeDocumentText,
    downloadDocumentFile,
    readDocumentFile,
    renderZplToPdf,
    showError,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { Alert, Button, Empty, Image, Modal, Segmented, Space, Spin, theme } from 'antd';
import { FC, ReactNode, useEffect, useMemo, useState } from 'react';

const DEFAULT_HEIGHT = '70vh';
// open parameters of the browser's PDF viewer: the whole page at once and no thumbnail pane
// (Chrome and Edge read view / navpanes, Firefox reads zoom / pagemode, each ignores the others)
const PDF_VIEWER_PARAMETERS = '#view=Fit&navpanes=0&pagemode=none&zoom=page-fit';

/**
 * Downloads a document with the screen's error message; `downloadingKey` tells which button
 * (a row id, …) is busy while a ZPL label is rendered.
 */
export const useDocumentHistoryDownload = () => {
    const { t } = useTranslation();
    const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

    const download = async (record: DocumentFileSource, key = 'download') => {
        setDownloadingKey(key);
        try {
            await downloadDocumentFile(record);
        } catch (error) {
            console.error(error);
            showError(t('messages:error-downloading-document'));
        } finally {
            setDownloadingKey(null);
        }
    };

    return { download, downloadingKey };
};

// object URL of a Blob, revoked when the Blob changes or the component unmounts
const useObjectUrl = (blob?: Blob): string | undefined => {
    const [url, setUrl] = useState<string>();
    useEffect(() => {
        if (!blob) {
            setUrl(undefined);
            return;
        }
        const objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [blob]);
    return url;
};

type ViewerProps = { title: string; height: string };

const PdfFrame: FC<ViewerProps & { blob: Blob }> = ({ blob, title, height }) => {
    const url = useObjectUrl(blob);
    if (!url) return null;
    return (
        <iframe
            src={`${url}${PDF_VIEWER_PARAMETERS}`}
            title={title}
            style={{ display: 'block', width: '100%', height, border: 'none' }}
        />
    );
};

const ImageView: FC<ViewerProps & { blob: Blob }> = ({ blob, title, height }) => {
    const url = useObjectUrl(blob);
    if (!url) return null;
    return (
        <div style={{ textAlign: 'center' }}>
            <Image
                src={url}
                alt={title}
                style={{ maxWidth: '100%', maxHeight: height, objectFit: 'contain' }}
            />
        </div>
    );
};

const TextBlock: FC<{ text: string; height: string }> = ({ text, height }) => {
    const { token } = theme.useToken();
    return (
        <pre
            style={{
                maxHeight: height,
                overflow: 'auto',
                margin: 0,
                padding: token.paddingSM,
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
                fontFamily: token.fontFamilyCode,
                fontSize: token.fontSizeSM,
                color: token.colorText,
                background: token.colorFillAlter,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: token.borderRadius
            }}
        >
            {text}
        </pre>
    );
};

const Centered: FC<{ height: string; children: ReactNode }> = ({ height, children }) => (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
    </div>
);

type ZplView = 'label' | 'code';

const ZplPreview: FC<ViewerProps & { bytes: Uint8Array }> = ({ bytes, title, height }) => {
    const { t } = useTranslation();
    const [view, setView] = useState<ZplView>('label');
    const [rendering, setRendering] = useState<{ pdf?: Blob; failed?: boolean }>({});
    const code = useMemo(() => decodeDocumentText(bytes), [bytes]);

    useEffect(() => {
        let current = true;
        setRendering({});
        renderZplToPdf(bytes)
            .then((pdf) => {
                if (current) setRendering({ pdf });
            })
            .catch((error) => {
                console.error(error);
                if (!current) return;
                setRendering({ failed: true });
                // nothing to draw: the code is the next best thing to show
                setView('code');
            });
        return () => {
            current = false;
        };
    }, [bytes]);

    return (
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Segmented
                value={view}
                onChange={(value) => setView(value as ZplView)}
                options={[
                    { label: t('common:zpl-label'), value: 'label' },
                    { label: t('common:zpl-code'), value: 'code' }
                ]}
            />
            {rendering.failed ? (
                <Alert type="warning" showIcon message={t('messages:error-rendering-label')} />
            ) : null}
            {view === 'code' ? (
                <TextBlock text={code} height={height} />
            ) : rendering.pdf ? (
                <PdfFrame blob={rendering.pdf} title={title} height={height} />
            ) : rendering.failed ? null : (
                <Centered height={height}>
                    <Spin />
                </Centered>
            )}
        </Space>
    );
};

export interface IDocumentHistoryPreviewProps {
    /** documentHistory record (list row or detail): binaryDocument, documentName, documentType */
    record: DocumentFileSource;
    /** height of the viewer (CSS length) */
    height?: string;
}

const DocumentHistoryPreview: FC<IDocumentHistoryPreviewProps> = ({
    record,
    height = DEFAULT_HEIGHT
}) => {
    const { t } = useTranslation();
    const { binaryDocument, documentName, documentType } = record;

    const file = useMemo(
        () => readDocumentFile({ binaryDocument, documentName, documentType }),
        [binaryDocument, documentName, documentType]
    );
    // what the PDF and image viewers display
    const blob = useMemo(
        () =>
            file && (file.kind === 'pdf' || file.kind === 'image')
                ? new Blob([file.bytes], { type: file.mimeType })
                : undefined,
        [file]
    );
    const text = useMemo(
        () => (file?.kind === 'text' ? decodeDocumentText(file.bytes) : ''),
        [file]
    );

    if (!file) {
        return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('messages:no-data')} />;
    }
    switch (file.kind) {
        case 'pdf':
            return <PdfFrame blob={blob!} title={file.fileName} height={height} />;
        case 'zpl':
            return <ZplPreview bytes={file.bytes} title={file.fileName} height={height} />;
        case 'image':
            return <ImageView blob={blob!} title={file.fileName} height={height} />;
        case 'text':
            return <TextBlock text={text} height={height} />;
        default:
            return (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={t('messages:document-preview-unavailable')}
                />
            );
    }
};

DocumentHistoryPreview.displayName = 'DocumentHistoryPreview';

export interface IDocumentHistoryPreviewModalProps {
    /** the document to show: the modal is open while it is set */
    record?: DocumentFileSource | null;
    onClose: () => void;
}

const DocumentHistoryPreviewModal: FC<IDocumentHistoryPreviewModalProps> = ({
    record,
    onClose
}) => {
    const { t } = useTranslation();
    const { download, downloadingKey } = useDocumentHistoryDownload();

    return (
        <Modal
            open={!!record}
            title={record?.documentName}
            onCancel={onClose}
            width={960}
            centered
            destroyOnClose
            footer={[
                <Button
                    key="download"
                    icon={<DownloadOutlined />}
                    disabled={!record?.binaryDocument}
                    loading={downloadingKey !== null}
                    onClick={() => record && download(record)}
                >
                    {t('actions:download')}
                </Button>,
                <Button key="close" type="primary" onClick={onClose}>
                    {t('actions:close')}
                </Button>
            ]}
        >
            {record ? <DocumentHistoryPreview record={record} /> : null}
        </Modal>
    );
};

DocumentHistoryPreviewModal.displayName = 'DocumentHistoryPreviewModal';

export { DocumentHistoryPreview, DocumentHistoryPreviewModal };
