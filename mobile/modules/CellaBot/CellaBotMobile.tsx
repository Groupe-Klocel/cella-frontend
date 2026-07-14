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
import { RobotOutlined, SendOutlined } from '@ant-design/icons';
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
import styled from 'styled-components';

// Read-only Q&A assistant for RF operators: same aiChat mutation as the web CellaBot but with
// readOnly: true (mutating tools are hard-disabled backend-side) and a small step budget. Big
// touch targets, Markdown-rendered answers. Voice input deliberately deferred.

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
    error?: boolean;
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

const Bubble = styled.div<{ $role: 'user' | 'assistant'; $error?: boolean }>`
    background: ${(p) => (p.$role === 'user' ? '#f9c834' : p.$error ? '#fff1f0' : '#f5f5f5')};
    color: ${(p) => (p.$error ? '#cf1322' : 'rgba(0, 0, 0, 0.88)')};
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

const CellaBotMobile = () => {
    const { t } = useTranslation();
    const tt = (key: string, def: string) => {
        const v = t(key);
        return v && v !== key ? v : def;
    };
    const router = useRouter();
    const { isAuthenticated, graphqlRequestClient } = useAuth();
    const { permissions } = useAppState();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Array<MobileChatMessage>>([]);
    // Thread the server conversation across turns: without it, every aiChat call mints a NEW
    // conversation server-side (the backend creates one whenever conversationId is absent), so the
    // assistant loses continuity and the audit shows one conversation per message.
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [text, setText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

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

    const handleSend = async () => {
        const prompt = text.trim();
        if (!prompt || isSending) return;
        const history = messages
            .filter((m) => !m.pending && !m.error)
            .map((m) => ({ role: m.role, content: m.content }));
        setMessages((prev) => [
            ...prev,
            { role: 'user', content: prompt },
            { role: 'assistant', content: '', pending: true }
        ]);
        setText('');
        setIsSending(true);
        try {
            const response = await graphqlRequestClient.request(AI_CHAT_MUTATION, {
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
            });
            // Keep the same conversation for the next turn (the server returns the id it used/created).
            if (response?.aiChat?.conversationId) {
                setConversationId(response.aiChat.conversationId);
            }
            setMessages((prev) => [
                ...prev.filter((m) => !m.pending),
                { role: 'assistant', content: response?.aiChat?.message ?? '' }
            ]);
        } catch (error) {
            console.error('CellaBot mobile error:', error);
            setMessages((prev) => [
                ...prev.filter((m) => !m.pending),
                {
                    role: 'assistant',
                    content: tt('common:cellabot-error', 'Sorry, something went wrong.'),
                    error: true
                }
            ]);
            showError(tt('common:cellabot-error', 'Sorry, something went wrong.'));
        } finally {
            setIsSending(false);
        }
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
                            <Bubble key={idx} $role={message.role} $error={message.error}>
                                {message.pending ? (
                                    <Spin size="small" />
                                ) : message.role === 'assistant' && !message.error ? (
                                    // The LLM answers in Markdown; render it (user text stays literal).
                                    // Raw HTML is disabled and links go through a scheme allowlist.
                                    <Markdown
                                        options={{
                                            disableParsingRawHTML: true,
                                            overrides: {
                                                a: { component: SafeMarkdownLink },
                                                img: { component: BlockedImage }
                                            }
                                        }}
                                    >
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
                        <Button
                            type="primary"
                            size="large"
                            icon={<SendOutlined />}
                            loading={isSending}
                            onClick={handleSend}
                            // Pin the brand color explicitly: the Drawer renders in a portal where the
                            // nested ConfigProvider theme can lag on first paint, briefly showing antd blue.
                            style={{ backgroundColor: CELLA_YELLOW, color: CELLA_ON_YELLOW }}
                        />
                    </Composer>
                </Body>
            </Drawer>
        </ConfigProvider>
    );
};

export default CellaBotMobile;
