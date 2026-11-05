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
import { RobotOutlined, SendOutlined, StopOutlined } from '@ant-design/icons';
import {
    getModesFromPermissions,
    IS_CELLABOT_ENABLED,
    showError,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { useQuery } from '@tanstack/react-query';
import { Button, ConfigProvider, Drawer, FloatButton, Input, Spin } from 'antd';
import { useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { ModeEnum } from 'generated/graphql';
import Markdown from 'markdown-to-jsx';
import { useRouter } from 'next/router';
import { ReactNode, useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import {
    chatErrorKind,
    chatErrorMessage,
    MobileChatResult,
    MobileChatStreamEvent,
    MobileChatVariables,
    streamMobileChat
} from './cellaBotStream';

// Read-only Q&A assistant for RF operators: same chat as the web CellaBot (streamed through
// /ai/chat/stream, the aiChat mutation as fallback) but with readOnly: true (mutating tools are
// hard-disabled backend-side) and no capabilities (no charts, proposals or links). Big touch
// targets, the answer shown as it is written, Markdown-rendered. Voice input deliberately deferred.

// Cella brand palette (mirrors web/styles/theme.ts): yellow surface, dark on-yellow content. Used to
// recolor antd primaries (the FAB, the send button, spinners) away from the default antd blue.
const CELLA_YELLOW = '#F9C834';
const CELLA_ON_YELLOW = '#262630';

const AI_AVAILABILITY_QUERY = gql`
    query AiAvailability {
        aiAvailability {
            enabled
        }
    }
`;

const AI_CHAT_MUTATION = gql`
    mutation AiChat(
        $prompt: String!
        $history: [JSON!]
        $context: JSON
        $readOnly: Boolean
        $conversationId: String
    ) {
        aiChat(
            prompt: $prompt
            history: $history
            context: $context
            readOnly: $readOnly
            conversationId: $conversationId
        ) {
            message
            conversationId
        }
    }
`;

const CELLABOT_PERMISSION_TABLE = 'wm_cellabot';

interface MobileChatMessage {
    role: 'user' | 'assistant';
    content: string;
    pending?: boolean;
    // On a pending bubble: `content` holds the answer being streamed (else: a progress label).
    streaming?: boolean;
    error?: boolean;
    // A local information line (e.g. "answer stopped"): shown, but never sent back as history.
    notice?: boolean;
}

const Body = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
`;

const Scroller = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 10px 8px;
`;

const blink = keyframes`
    to {
        visibility: hidden;
    }
`;

// The answer while it is being streamed, with a blinking caret after its last block. markdown-to-jsx
// wraps several blocks in a <div>: the caret then goes after that wrapper's last block.
const StreamingText = styled.div`
    > :not(div):last-child::after,
    > div:last-child > :last-child::after {
        content: '';
        display: inline-block;
        width: 7px;
        height: 1em;
        margin-left: 2px;
        vertical-align: text-bottom;
        background: ${CELLA_YELLOW};
        animation: ${blink} 1s steps(2, start) infinite;
    }
`;

const Bubble = styled.div<{ $role: 'user' | 'assistant'; $error?: boolean; $notice?: boolean }>`
    background: ${(p) =>
        p.$role === 'user'
            ? '#f9c834'
            : p.$error
              ? '#fff1f0'
              : p.$notice
                ? 'transparent'
                : '#f5f5f5'};
    color: ${(p) =>
        p.$error ? '#cf1322' : p.$notice ? 'rgba(0, 0, 0, 0.55)' : 'rgba(0, 0, 0, 0.88)'};
    border: ${(p) => (p.$notice ? '1px dashed rgba(0, 0, 0, 0.15)' : 'none')};
    border-radius: 10px;
    padding: 10px 12px;
    margin: 0 0 10px ${(p) => (p.$role === 'user' ? 'auto' : '0')};
    max-width: 92%;
    width: fit-content;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 15px;
    line-height: 1.45;

    /* Tighten Markdown block elements so an answer reads as a compact chat bubble. */
    & p {
        margin: 0;
    }
    & p + p {
        margin-top: 0.5em;
    }
    & ul,
    & ol {
        margin: 0.25em 0;
        padding-left: 1.2em;
    }
    & pre {
        white-space: pre-wrap;
        word-break: break-word;
    }
    & code {
        background: rgba(0, 0, 0, 0.06);
        padding: 0 4px;
        border-radius: 4px;
    }
`;

const Composer = styled.div`
    display: flex;
    gap: 8px;
    padding: 8px;
    border-top: 1px solid rgba(0, 0, 0, 0.1);

    textarea {
        font-size: 16px; /* prevents mobile zoom-on-focus */
    }
`;

// LLM-authored Markdown links: only http(s)/mailto and single-leading-slash relative links are
// clickable (new tab, noopener). Every other scheme — javascript:, data:, protocol-relative
// //host, cella:// — renders as plain text so a hallucinated/malicious link can't become a live
// anchor. `disableParsingRawHTML` already blocks raw <a>; this covers Markdown `[x](scheme:…)`.
// Mirrors the web widget's CellaBotEntityLink allowlist (mobile has no in-app entity deep-links,
// so there is no cella:// resolution here — those render as text). href/target/rel are set
// after the {...rest} spread so LLM-provided props can't override them.
const SafeMarkdownLink = ({
    href,
    children,
    ...rest
}: {
    href?: string;
    children?: ReactNode;
    [key: string]: any;
}) => {
    if (typeof href !== 'string' || !/^(https?:\/\/|mailto:|\/(?!\/))/i.test(href)) {
        return <>{children}</>;
    }
    return (
        <a {...rest} href={href} target="_blank" rel="noopener noreferrer">
            {children}
        </a>
    );
};

// Untrusted assistant Markdown may contain `![alt](url)`; render the alt text instead of an <img>
// so the model can't trigger an external image request (tracking/privacy) from the chat.
const BlockedImage = ({ alt }: { alt?: string }) => <>{alt ?? ''}</>;

// The LLM answers in Markdown (user text stays literal): raw HTML is disabled and links go through
// a scheme allowlist.
const MARKDOWN_OPTIONS = {
    disableParsingRawHTML: true,
    overrides: {
        a: { component: SafeMarkdownLink },
        img: { component: BlockedImage }
    }
};

const CellaBotMobile = () => {
    const { t } = useTranslation();
    const tt = (key: string, def: string) => {
        const v = t(key);
        return v && v !== key ? v : def;
    };
    const router = useRouter();
    const { isAuthenticated, graphqlRequestClient, user } = useAuth();
    const { permissions } = useAppState();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Array<MobileChatMessage>>([]);
    // Thread the server conversation across turns: without it, every aiChat call mints a NEW
    // conversation server-side (the backend creates one whenever conversationId is absent), so the
    // assistant loses continuity and the audit shows one conversation per message.
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [text, setText] = useState('');
    const [isSending, setIsSending] = useState(false);
    // The running turn: aborting it closes the stream (the backend then stops the agent loop). Each
    // callback checks it is still the current turn, so a stopped turn never writes into the chat.
    const turnRef = useRef<AbortController | null>(null);
    // Stop is offered only while the turn streams: the mutation fallback cannot be cancelled.
    const [canStop, setCanStop] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // The assistant stays mounted across logout / login (it only renders nothing meanwhile): on any
    // change of session, abort the running turn (it carries the previous operator's token) and start
    // from a blank chat, so one operator's conversation never shows up in the next one's session.
    const sessionKey = isAuthenticated
        ? String(user?.username ?? user?.user_id ?? user?.id ?? '')
        : '';
    useEffect(() => {
        turnRef.current?.abort();
        turnRef.current = null;
        setCanStop(false);
        setIsSending(false);
        setMessages([]);
        setConversationId(null);
        setText('');
        setIsOpen(false);
    }, [sessionKey]);

    // Never leave a stream open behind an unmounted assistant.
    useEffect(
        () => () => {
            turnRef.current?.abort();
            turnRef.current = null;
        },
        []
    );

    const hasCellabotRead = getModesFromPermissions(
        permissions,
        CELLABOT_PERMISSION_TABLE
    ).includes(ModeEnum.Read);

    const availability = useQuery<any>({
        queryKey: ['aiAvailability'],
        queryFn: () => graphqlRequestClient.request(AI_AVAILABILITY_QUERY),
        enabled: Boolean(isAuthenticated && IS_CELLABOT_ENABLED && hasCellabotRead),
        staleTime: 5 * 60 * 1000,
        retry: false
    });

    if (!IS_CELLABOT_ENABLED || !isAuthenticated || !hasCellabotRead) return <></>;
    if (availability.data?.aiAvailability?.enabled !== true) return <></>;

    // Human label of a progress event, shown in the pending bubble until the answer streams in.
    const progressLabel = (event: MobileChatStreamEvent): string => {
        if (event.type === 'documents') {
            return tt('common:cellabot-step-documents', 'Reading the documents…');
        }
        if (event.type === 'tool') {
            switch (event.tool) {
                case 'run_query':
                case 'export_data':
                    return tt('common:cellabot-step-query', 'Querying data…');
                case 'analyze_document':
                    return tt('common:cellabot-step-analyze-document', 'Reading a document…');
                case 'describe_model':
                case 'list_configs':
                case 'list_operations':
                    return tt('common:cellabot-step-model', 'Exploring the data model…');
                case 'get_documentation':
                case 'list_documentation':
                    return tt('common:cellabot-step-documentation', 'Reading the documentation…');
                default:
                    return tt('common:cellabot-step-analyze', 'Analyzing…');
            }
        }
        const thinking = tt('common:cellabot-thinking', 'Thinking…');
        return event.step && event.step > 1 ? `${thinking} (${event.step})` : thinking;
    };

    const updatePending = (update: (m: MobileChatMessage) => MobileChatMessage) =>
        setMessages((prev) => prev.map((m) => (m.pending ? update(m) : m)));

    const finishTurn = () => {
        turnRef.current = null;
        setCanStop(false);
        setIsSending(false);
    };

    const applyResult = (result?: MobileChatResult | null) => {
        finishTurn();
        // Keep the same conversation for the next turn (the server returns the id it used/created).
        if (result?.conversationId) {
            setConversationId(result.conversationId);
        }
        setMessages((prev) => [
            ...prev.filter((m) => !m.pending),
            { role: 'assistant', content: result?.message ?? '' }
        ]);
    };

    const applyError = (error: any) => {
        finishTurn();
        console.error('CellaBot mobile error:', error);
        const message = chatErrorMessage(error, tt);
        updatePending(() => ({ role: 'assistant', content: message, error: true }));
        showError(message);
    };

    // Stop: close the stream and keep what was already written, marked as interrupted. The backend
    // notices the disconnect at the agent's next event (a tool already running still completes) and
    // does not save a turn stopped before its end, so the bubble is a local notice (not sent as
    // history).
    const handleStop = () => {
        const turn = turnRef.current;
        if (!turn) return;
        finishTurn();
        turn.abort();
        const stopped = `*${tt('common:cellabot-stopped', 'Answer stopped.')}*`;
        updatePending((m) => ({
            role: 'assistant',
            content: m.streaming && m.content ? `${m.content}\n\n${stopped}` : stopped,
            notice: true
        }));
    };

    const handleSend = () => {
        const prompt = text.trim();
        if (!prompt || turnRef.current) return;
        const history = messages
            .filter((m) => !m.pending && !m.error && !m.notice)
            .map((m) => ({ role: m.role, content: m.content }));
        setMessages((prev) => [
            ...prev,
            { role: 'user', content: prompt },
            { role: 'assistant', content: '', pending: true }
        ]);
        setText('');
        setIsSending(true);

        const turn = new AbortController();
        turnRef.current = turn;
        setCanStop(true);
        const isCurrent = () => turnRef.current === turn;
        const variables: MobileChatVariables = {
            prompt,
            history,
            context: {
                surface: 'mobile-rf',
                url: router.asPath,
                view: router.pathname.split('/').filter(Boolean)[0],
                locale: router.locale
            },
            readOnly: true,
            conversationId
        };
        // Streamed (progress + the answer as it is written); the mutation is only a fallback for a
        // stream that never started — past its first event the turn must not be sent twice.
        let streamStarted = false;
        streamMobileChat(
            variables,
            {
                onStarted: () => {
                    streamStarted = true;
                },
                // A new step or tool replaces the text streamed so far (text before a tool call is
                // the model thinking aloud; the answer comes in the last step).
                onProgress: (event) => {
                    if (!isCurrent()) return;
                    const label = progressLabel(event);
                    updatePending((m) => ({ ...m, content: label, streaming: false }));
                },
                onDelta: (delta) => {
                    if (!isCurrent()) return;
                    updatePending((m) => ({
                        ...m,
                        content: (m.streaming ? m.content : '') + delta,
                        streaming: true
                    }));
                }
            },
            turn.signal
        )
            .then((result) => {
                if (isCurrent()) applyResult(result);
            })
            .catch((error) => {
                if (!isCurrent() || chatErrorKind(error) === 'aborted') return;
                if (chatErrorKind(error) === 'notStarted' && !streamStarted) {
                    // Not cancellable: no Stop while it runs, sending stays blocked until it ends.
                    setCanStop(false);
                    graphqlRequestClient
                        .request(AI_CHAT_MUTATION, variables)
                        .then((response: any) => {
                            if (isCurrent()) applyResult(response?.aiChat);
                        })
                        .catch((mutationError: any) => {
                            if (isCurrent()) applyError(mutationError);
                        });
                    return;
                }
                applyError(error);
            });
    };

    return (
        // Recolor antd primaries (the FAB, the send button, spinners) to the Cella brand yellow
        // instead of the default antd blue. colorTextLightSolid = the dark on-yellow icon/text color,
        // scoped to Button/FloatButton so nothing else is affected.
        <ConfigProvider
            theme={{
                token: { colorPrimary: CELLA_YELLOW },
                components: {
                    Button: { colorTextLightSolid: CELLA_ON_YELLOW },
                    FloatButton: { colorTextLightSolid: CELLA_ON_YELLOW }
                }
            }}
        >
            {!isOpen && (
                <FloatButton
                    icon={<RobotOutlined style={{ color: CELLA_ON_YELLOW }} />}
                    type="primary"
                    onClick={() => setIsOpen(true)}
                    style={{ right: 16, bottom: 76 }}
                />
            )}
            <Drawer
                title={tt('common:cellabot', 'CellaBot')}
                placement="bottom"
                height="75%"
                open={isOpen}
                onClose={() => setIsOpen(false)}
                styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column' } }}
            >
                <Body>
                    <Scroller>
                        {messages.length === 0 && (
                            <Bubble $role="assistant">
                                {tt(
                                    'common:cellabot-mobile-empty',
                                    'Ask about stock, locations or your current task.'
                                )}
                            </Bubble>
                        )}
                        {messages.map((message, idx) => (
                            <Bubble
                                key={idx}
                                $role={message.role}
                                $error={message.error}
                                $notice={message.notice}
                            >
                                {message.pending && message.streaming ? (
                                    <StreamingText>
                                        <Markdown options={MARKDOWN_OPTIONS}>
                                            {message.content}
                                        </Markdown>
                                    </StreamingText>
                                ) : message.pending ? (
                                    <>
                                        <Spin size="small" />
                                        {message.content ? (
                                            <span style={{ marginLeft: 8 }}>{message.content}</span>
                                        ) : null}
                                    </>
                                ) : message.role === 'assistant' && !message.error ? (
                                    <Markdown options={MARKDOWN_OPTIONS}>
                                        {message.content || ''}
                                    </Markdown>
                                ) : (
                                    message.content
                                )}
                            </Bubble>
                        ))}
                        <div ref={bottomRef} />
                    </Scroller>
                    <Composer>
                        <Input.TextArea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onPressEnter={(e) => {
                                if (!e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            autoSize={{ minRows: 1, maxRows: 3 }}
                            placeholder={tt('common:cellabot-placeholder', 'Ask CellaBot…')}
                        />
                        {isSending && canStop ? (
                            <Button
                                size="large"
                                icon={<StopOutlined />}
                                aria-label={tt('common:cellabot-stop', 'Stop')}
                                onClick={handleStop}
                            />
                        ) : (
                            <Button
                                type="primary"
                                size="large"
                                icon={<SendOutlined />}
                                aria-label={tt('common:cellabot-send', 'Send')}
                                // Busy during the (non-cancellable) mutation fallback.
                                loading={isSending}
                                onClick={handleSend}
                                // Pin the brand color explicitly: the Drawer renders in a portal where
                                // the nested ConfigProvider theme can lag on first paint, briefly
                                // showing antd blue.
                                style={{ backgroundColor: CELLA_YELLOW, color: CELLA_ON_YELLOW }}
                            />
                        )}
                    </Composer>
                </Body>
            </Drawer>
        </ConfigProvider>
    );
};

export default CellaBotMobile;
