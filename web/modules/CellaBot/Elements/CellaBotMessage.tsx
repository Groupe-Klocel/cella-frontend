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
import {
    DownloadOutlined,
    ExclamationCircleOutlined,
    ThunderboltOutlined
} from '@ant-design/icons';
import { showError, useTranslationWithFallback as useTranslation } from '@helpers';
import { Button, Collapse, Space, Spin, Tag } from 'antd';
import { AiChatMessage } from 'context/CellaBotContext';
import Markdown from 'markdown-to-jsx';
import styled from 'styled-components';
import { executableProposalOperations } from '../cellaBotApi';
import { CELLA_ON_YELLOW, CELLA_YELLOW } from '../cellaBotColors';
import CellaBotChart from './CellaBotChart';
import CellaBotEntityLink from './CellaBotEntityLink';

// Untrusted assistant Markdown may contain `![alt](url)`; render the alt text instead of an <img>
// so the model can't trigger an external image request (tracking/privacy) from the chat.
const BlockedImage = ({ alt }: { alt?: string }) => <>{alt ?? ''}</>;

const Row = styled.div<{ $role: 'user' | 'assistant' }>`
    display: flex;
    flex-direction: column;
    align-items: ${(p) => (p.$role === 'user' ? 'flex-end' : 'flex-start')};
    margin-bottom: 12px;
`;

const Bubble = styled.div<{ $role: 'user' | 'assistant'; $error?: boolean }>`
    background: ${(p) => (p.$role === 'user' ? CELLA_YELLOW : p.$error ? '#fff1f0' : '#f5f5f5')};
    color: ${(p) =>
        p.$role === 'user' ? CELLA_ON_YELLOW : p.$error ? '#cf1322' : 'rgba(0, 0, 0, 0.88)'};
    border: ${(p) => (p.$error ? '1px solid #ffccc7' : 'none')};
    border-radius: 10px;
    padding: 8px 12px;
    max-width: 90%;
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.5;
`;

// Renders the assistant's Markdown inside the bubble. Overrides the bubble's pre-wrap with normal
// whitespace (Markdown owns the structure) and gives sensible spacing/code/list/table styling.
const MarkdownContent = styled.div`
    white-space: normal;

    > *:first-child {
        margin-top: 0;
    }
    > *:last-child {
        margin-bottom: 0;
    }
    p {
        margin: 0 0 8px;
    }
    ul,
    ol {
        margin: 0 0 8px;
        padding-left: 20px;
    }
    li {
        margin: 2px 0;
    }
    h1,
    h2,
    h3,
    h4 {
        margin: 10px 0 4px;
        font-size: 1em;
        font-weight: 600;
    }
    code {
        background: rgba(0, 0, 0, 0.06);
        padding: 1px 4px;
        border-radius: 4px;
        font-size: 0.9em;
    }
    pre {
        background: rgba(0, 0, 0, 0.06);
        padding: 8px 10px;
        border-radius: 6px;
        overflow-x: auto;
    }
    pre code {
        background: none;
        padding: 0;
    }
    a {
        color: inherit;
        text-decoration: underline;
    }
    table {
        border-collapse: collapse;
        margin: 0 0 8px;
    }
    th,
    td {
        border: 1px solid rgba(0, 0, 0, 0.15);
        padding: 4px 8px;
    }
    blockquote {
        margin: 0 0 8px;
        padding-left: 10px;
        border-left: 3px solid rgba(0, 0, 0, 0.15);
        color: rgba(0, 0, 0, 0.65);
    }
`;

const Extras = styled.div`
    margin-top: 6px;
    max-width: 90%;
    width: 100%;
`;

const ProposalCard = styled.div`
    border: 1px solid #ffe58f;
    background: #fffbe6;
    border-radius: 8px;
    padding: 10px 12px;

    pre {
        margin: 4px 0 0;
        white-space: pre-wrap;
        word-break: break-word;
        font-size: 11px;
        opacity: 0.75;
    }
`;

// Decode a base64 payload to a Blob and trigger a browser download
// (same approach as components/common/DocumentAttachedListComponent.tsx).
const downloadBase64 = (base64Data: string, fileName: string, onError: () => void) => {
    try {
        const byteCharacters = window.atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error downloading document:', error);
        onError();
    }
};

const CellaBotMessage = ({
    message,
    onProposalDecision
}: {
    message: AiChatMessage;
    onProposalDecision?: (confirmed: boolean) => void;
}) => {
    const { t } = useTranslation();
    const tt = (key: string, def: string) => {
        const v = t(key);
        return v && v !== key ? v : def;
    };

    const toolCalls = (message.toolCalls ?? []).filter(Boolean);
    const documents = (message.documents ?? []).filter(Boolean);
    const proposal = message.proposedActions;
    const charts = (message.charts ?? []).filter(Boolean);
    // Count/list ONLY the operations that will actually run on confirm (same filter as the confirm
    // path), so the card never advertises more operations than get executed.
    const executableOps = executableProposalOperations(proposal);

    return (
        <Row $role={message.role}>
            <Bubble $role={message.role} $error={message.error}>
                {message.pending ? (
                    <Space size="small">
                        <Spin size="small" />
                        {/* Streamed step progress lands in `content` (e.g. "Querying data…"). */}
                        {message.content || tt('common:cellabot-thinking', 'Thinking…')}
                    </Space>
                ) : message.role === 'assistant' && !message.error ? (
                    // Assistant replies are Markdown; user input + error text stay plain.
                    // `a` is overridden: cella://<entity>/<id> links navigate in-app (permission
                    // gated), other links open in a new tab (see CellaBotEntityLink).
                    <MarkdownContent>
                        <Markdown
                            options={{
                                // Assistant content is untrusted: render any embedded raw HTML as
                                // text (no iframes/forms/img injection). Our `a` override still applies.
                                disableParsingRawHTML: true,
                                overrides: {
                                    a: { component: CellaBotEntityLink },
                                    // Markdown `![alt](url)` still renders an <img> even with raw
                                    // HTML disabled; that would fire an external request from
                                    // untrusted assistant content (tracking/privacy). Render the
                                    // alt text instead of loading the image.
                                    img: { component: BlockedImage }
                                }
                            }}
                        >
                            {message.content}
                        </Markdown>
                    </MarkdownContent>
                ) : (
                    message.content
                )}
            </Bubble>

            {charts.length > 0 && (
                <Extras>
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        {charts.map((chart, idx) => (
                            <CellaBotChart key={`chart-${idx}`} spec={chart} />
                        ))}
                    </Space>
                </Extras>
            )}

            {proposal && (
                <Extras>
                    <ProposalCard>
                        <Space size={6}>
                            <ExclamationCircleOutlined style={{ color: '#d48806' }} />
                            <strong>{proposal.summary}</strong>
                        </Space>
                        <div style={{ fontSize: 12, margin: '4px 0' }}>
                            {tt('common:cellabot-proposal-count', 'Operations to apply')}:{' '}
                            {executableOps.length}
                        </div>
                        <Collapse
                            ghost
                            size="small"
                            items={[
                                {
                                    key: 'ops',
                                    label: tt('common:cellabot-proposal-details', 'Details'),
                                    children: (
                                        <pre>
                                            {executableOps
                                                .map(
                                                    (op: any) =>
                                                        `${op.document}\n${JSON.stringify(
                                                            op.variables ?? {}
                                                        )}`
                                                )
                                                .join('\n\n')}
                                        </pre>
                                    )
                                }
                            ]}
                        />
                        {message.proposalResolution === 'confirmed' ? (
                            <Tag color="green">
                                {tt('common:cellabot-proposal-confirmed', 'Confirmed')}
                            </Tag>
                        ) : message.proposalResolution === 'cancelled' ? (
                            <Tag>{tt('common:cellabot-proposal-cancelled', 'Cancelled')}</Tag>
                        ) : (
                            <Space>
                                <Button
                                    size="small"
                                    type="primary"
                                    onClick={() => onProposalDecision?.(true)}
                                >
                                    {tt('actions:confirm', 'Confirm')}
                                </Button>
                                <Button size="small" onClick={() => onProposalDecision?.(false)}>
                                    {tt('actions:cancel', 'Cancel')}
                                </Button>
                            </Space>
                        )}
                    </ProposalCard>
                </Extras>
            )}

            {documents.length > 0 && (
                <Extras>
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        {documents.map((doc, idx) => {
                            const name = doc?.filename || tt('common:document', 'Document');
                            if (doc?.base64) {
                                return (
                                    <Button
                                        key={`doc-${idx}`}
                                        size="small"
                                        icon={<DownloadOutlined />}
                                        onClick={() =>
                                            downloadBase64(doc.base64 as string, name, () =>
                                                showError(
                                                    tt(
                                                        'messages:error-downloading-document',
                                                        'Error downloading document'
                                                    )
                                                )
                                            )
                                        }
                                    >
                                        {name}
                                    </Button>
                                );
                            }
                            if (doc?.url) {
                                return (
                                    <Button
                                        key={`doc-${idx}`}
                                        size="small"
                                        icon={<DownloadOutlined />}
                                        href={doc.url}
                                        target="_blank"
                                    >
                                        {name}
                                    </Button>
                                );
                            }
                            return null;
                        })}
                    </Space>
                </Extras>
            )}

            {toolCalls.length > 0 && (
                <Extras>
                    <Collapse
                        ghost
                        size="small"
                        items={[
                            {
                                key: 'tools',
                                label: (
                                    <Space size={4}>
                                        <ThunderboltOutlined />
                                        {tt('common:cellabot-actions', 'Actions')} (
                                        {toolCalls.length})
                                    </Space>
                                ),
                                children: (
                                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                        {toolCalls.map((call, idx) => (
                                            <div key={`tool-${idx}`} style={{ fontSize: 12 }}>
                                                <strong>{call?.tool}</strong>
                                                {call?.arguments ? (
                                                    <pre
                                                        style={{
                                                            margin: '2px 0 0',
                                                            whiteSpace: 'pre-wrap',
                                                            wordBreak: 'break-word',
                                                            opacity: 0.65
                                                        }}
                                                    >
                                                        {typeof call.arguments === 'string'
                                                            ? call.arguments
                                                            : JSON.stringify(
                                                                  call.arguments,
                                                                  null,
                                                                  2
                                                              )}
                                                    </pre>
                                                ) : null}
                                            </div>
                                        ))}
                                    </Space>
                                )
                            }
                        ]}
                    />
                </Extras>
            )}
        </Row>
    );
};

export default CellaBotMessage;
