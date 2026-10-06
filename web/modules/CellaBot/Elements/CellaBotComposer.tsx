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
import { PaperClipOutlined, SendOutlined, StopOutlined } from '@ant-design/icons';
import { showError, useTranslationWithFallback as useTranslation } from '@helpers';
import { Button, Input, Select, Tooltip } from 'antd';
import { ClipboardEvent, DragEvent, KeyboardEvent, useRef, useState } from 'react';
import styled from 'styled-components';
import { AiDocumentAnalysisAvailability } from '../cellaBotApi';
import { AiStagedAttachment, attachmentAccept, prepareAttachments } from '../cellaBotAttachments';
import { CELLA_YELLOW } from '../cellaBotColors';
import CellaBotAttachmentChip from './CellaBotAttachmentChip';

const Wrapper = styled.div<{ $dragOver?: boolean }>`
    padding: 12px;
    border-top: 1px solid #f0f0f0;
    outline: ${(p) => (p.$dragOver ? `2px dashed ${CELLA_YELLOW}` : 'none')};
    outline-offset: -4px;
`;

const Row = styled.div`
    display: flex;
    align-items: flex-end;
    gap: 8px;
`;

const Staged = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    margin-bottom: 8px;
`;

// English defaults of the extraction recipes the backend ships (ai/extraction.py); a recipe added
// later falls back to its prettified slug until its `common:cellabot-kind-<slug>` row exists.
const KIND_DEFAULT_LABELS: Record<string, string> = {
    generic: 'Generic document',
    supplier_delivery_note: 'Supplier delivery note',
    supplier_invoice: 'Supplier invoice',
    customer_order: 'Customer order',
    outbound_delivery_note: 'Outbound delivery note',
    damage_photo: 'Damage photo',
    barcode_photo: 'Barcode photo'
};

const prettifySlug = (slug: string): string => {
    const words = slug.replace(/[_-]+/g, ' ').trim();
    return words.charAt(0).toUpperCase() + words.slice(1);
};

export interface CellaBotComposerPayload {
    text: string;
    attachments: Array<AiStagedAttachment>;
    // Extraction recipe for the attached files; null = the warehouse default (auto).
    kind: string | null;
}

interface ICellaBotComposerProps {
    onSend: (payload: CellaBotComposerPayload) => void;
    // Stops the running turn; the send button turns into a stop button while `loading`.
    onStop?: () => void;
    loading?: boolean;
    disabled?: boolean;
    // Present and enabled when the warehouse lets the chat read documents (the paperclip).
    documentAnalysis?: AiDocumentAnalysisAvailability | null;
}

const CellaBotComposer = ({
    onSend,
    onStop,
    loading,
    disabled,
    documentAnalysis
}: ICellaBotComposerProps) => {
    const { t } = useTranslation();
    const tt = (key: string, def: string) => {
        const v = t(key);
        return v && v !== key ? v : def;
    };
    const [value, setValue] = useState('');
    const [staged, setStaged] = useState<Array<AiStagedAttachment>>([]);
    const [kind, setKind] = useState<string | null>(null);
    // Encoding the picked files (images may be re-encoded): sending waits for it.
    const [preparing, setPreparing] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const canAttach = documentAnalysis?.enabled === true;
    const kinds = documentAnalysis?.kinds ?? [];

    const addFiles = async (files: Array<File>) => {
        if (!canAttach || preparing || files.length === 0) return;
        setPreparing(true);
        try {
            const { added, errors } = await prepareAttachments(files, staged, documentAnalysis, tt);
            if (added.length > 0) setStaged((prev) => [...prev, ...added]);
            errors.slice(0, 3).forEach((error) => showError(error));
        } finally {
            setPreparing(false);
        }
    };

    const removeAttachment = (index: number) => {
        setStaged((prev) => {
            const next = prev.filter((_, i) => i !== index);
            if (next.length === 0) setKind(null);
            return next;
        });
    };

    const submit = () => {
        const text = value.trim();
        if ((!text && staged.length === 0) || loading || disabled || preparing) return;
        onSend({ text, attachments: staged, kind });
        setValue('');
        setStaged([]);
        setKind(null);
    };

    const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
        }
    };

    // Pasting a file (e.g. a screenshot) attaches it; pasting text keeps the default behavior.
    const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
        const files = Array.from(e.clipboardData?.files ?? []);
        if (!canAttach || files.length === 0) return;
        e.preventDefault();
        addFiles(files);
    };

    const isFileDrag = (e: DragEvent) =>
        canAttach && Array.from(e.dataTransfer?.types ?? []).includes('Files');

    const kindLabel = (slug: string) =>
        tt(`common:cellabot-kind-${slug}`, KIND_DEFAULT_LABELS[slug] ?? prettifySlug(slug));

    const sendLabel = tt('common:cellabot-send', 'Send');
    const stopLabel = tt('common:cellabot-stop', 'Stop');
    const attachLabel = tt('common:cellabot-attach', 'Attach a file');

    return (
        <Wrapper
            $dragOver={dragOver}
            onDragOver={(e) => {
                if (!isFileDrag(e)) return;
                e.preventDefault();
                setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
                setDragOver(false);
                if (!isFileDrag(e)) return;
                e.preventDefault();
                addFiles(Array.from(e.dataTransfer.files ?? []));
            }}
        >
            {staged.length > 0 && (
                <Staged>
                    {staged.map((attachment, index) => (
                        <CellaBotAttachmentChip
                            key={`${attachment.filename}-${index}`}
                            filename={attachment.filename}
                            size={attachment.size}
                            mediaType={attachment.mediaType}
                            onRemove={() => removeAttachment(index)}
                        />
                    ))}
                    {kinds.length > 0 && (
                        <Select
                            size="small"
                            value={kind ?? ''}
                            onChange={(next: string) => setKind(next || null)}
                            popupMatchSelectWidth={false}
                            // Render the list inside the drawer so it stacks above it.
                            getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
                            aria-label={tt('common:cellabot-kind', 'Document type')}
                            style={{ minWidth: 170, marginBottom: 4 }}
                            options={[
                                {
                                    value: '',
                                    label: tt('common:cellabot-kind-auto', 'Automatic detection')
                                },
                                ...kinds.map((k) => ({
                                    value: k.slug,
                                    label: kindLabel(k.slug),
                                    title: k.description ?? undefined
                                }))
                            ]}
                        />
                    )}
                </Staged>
            )}
            <Row>
                {canAttach && (
                    <>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept={attachmentAccept(documentAnalysis)}
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                addFiles(Array.from(e.target.files ?? []));
                                // Reset so picking the same file again fires onChange.
                                e.target.value = '';
                            }}
                        />
                        <Tooltip title={attachLabel}>
                            <Button
                                type="text"
                                aria-label={attachLabel}
                                icon={<PaperClipOutlined />}
                                loading={preparing}
                                disabled={disabled}
                                onClick={() => fileInputRef.current?.click()}
                            />
                        </Tooltip>
                    </>
                )}
                <Input.TextArea
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={onKeyDown}
                    onPaste={onPaste}
                    placeholder={
                        staged.length > 0
                            ? tt(
                                  'common:cellabot-attach-placeholder',
                                  'What should I do with these documents?'
                              )
                            : tt('common:cellabot-placeholder', 'Ask CellaBot…')
                    }
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    disabled={disabled}
                />
                {loading && onStop ? (
                    <Tooltip title={stopLabel}>
                        <Button aria-label={stopLabel} icon={<StopOutlined />} onClick={onStop} />
                    </Tooltip>
                ) : (
                    <Button
                        type="primary"
                        aria-label={sendLabel}
                        icon={<SendOutlined />}
                        onClick={submit}
                        loading={loading}
                        disabled={disabled || preparing || (!value.trim() && staged.length === 0)}
                    />
                )}
            </Row>
        </Wrapper>
    );
};

export default CellaBotComposer;
