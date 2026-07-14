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
    CommentOutlined,
    FormOutlined,
    RobotOutlined,
    UnorderedListOutlined
} from '@ant-design/icons';
import {
    getModesFromPermissions,
    IS_CELLABOT_ENABLED,
    showError,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { Button, ConfigProvider, Drawer, FloatButton, Space, Tooltip } from 'antd';
import { useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import { AiChatMessage, useAiContextStore, useCellaBotChat } from 'context/CellaBotContext';
import { ModeEnum } from 'generated/graphql';
import styled from 'styled-components';
import { useEffect, useRef, useState } from 'react';
import {
    AiChatHistoryEntry,
    AiChatResult,
    AiChatStreamEvent,
    AiConversationSummary,
    CELLABOT_CAPABILITIES,
    deleteConversation,
    executableProposalOperations,
    fetchConversationMessages,
    fetchConversations,
    fetchLastConversation,
    streamAiChat,
    useAiAvailability,
    useAiChat
} from '../cellaBotApi';
import { CELLA_ON_YELLOW, CELLA_YELLOW } from '../cellaBotColors';
import CellaBotComposer from './CellaBotComposer';
import CellaBotConversationList from './CellaBotConversationList';
import CellaBotMessageList from './CellaBotMessageList';
import CellaBotSuggestions from './CellaBotSuggestions';

// The drawer must float above page content and the left menu drawer, but stay below
// transient antd message/notification (default 1010 → we sit at 1050 for the drawer,
// 1040 for the button, both above the page; notifications use a separate stacking layer).
const DRAWER_Z_INDEX = 1050;
const FAB_Z_INDEX = 1040;

// The per-user right gating CellaBot (created admin-side, like the other wm_ permissions).
const CELLABOT_PERMISSION_TABLE = 'wm_cellabot';

const Body = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
`;

const CellaBotWidget = () => {
    const { t } = useTranslation();
    const tt = (key: string, def: string) => {
        const v = t(key);
        return v && v !== key ? v : def;
    };
    const { isAuthenticated, graphqlRequestClient, user } = useAuth();
    const { permissions } = useAppState();
    const { aiContext } = useAiContextStore();
    const {
        isOpen,
        open,
        close,
        messages,
        setMessages,
        clearMessages,
        conversationId,
        setConversationId
    } = useCellaBotChat();

    // Third gate: the user must hold the wm_cellabot permission in READ mode.
    const hasCellabotRead = getModesFromPermissions(
        permissions,
        CELLABOT_PERMISSION_TABLE
    ).includes(ModeEnum.Read);

    // Conversation management (list / continue / delete) is offered only to a user who holds FULL
    // CRUD on BOTH the conversation and message objects — matching the backend, which enforces
    // per-user ownership on those tables (a worker only ever manages their own).
    const convModes = getModesFromPermissions(permissions, 'AI_CONVERSATION');
    const msgModes = getModesFromPermissions(permissions, 'AI_MESSAGE');
    const canManageConversations = [
        ModeEnum.Read,
        ModeEnum.Create,
        ModeEnum.Update,
        ModeEnum.Delete
    ].every((mode) => convModes.includes(mode) && msgModes.includes(mode));

    // Only query availability when authenticated, the env kill switch is on, AND the user is allowed.
    const availability = useAiAvailability(
        graphqlRequestClient,
        isAuthenticated && IS_CELLABOT_ENABLED && hasCellabotRead
    );
    const chat = useAiChat(graphqlRequestClient);

    const [isSending, setIsSending] = useState(false);
    // Conversation-history panel (list of the user's saved conversations, shown in place of the chat).
    const [showHistory, setShowHistory] = useState(false);
    const [conversations, setConversations] = useState<Array<AiConversationSummary>>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Always return to the chat view when the drawer closes, so reopening never lands on a stale list.
    useEffect(() => {
        if (!isOpen) setShowHistory(false);
    }, [isOpen]);

    // Cross-device history: when the drawer opens on an empty chat, fetch the user's most recent
    // persisted conversation (best-effort — silently skipped without READ rights on the tables).
    // One attempt per user (sessionStorage already covers same-tab reloads).
    const hydratedForUser = useRef<string | null>(null);
    // Synchronous per-proposal lock: React state (isSending / proposalResolution) does not update
    // between two rapid click events, so a double-click could execute the mutations twice. This ref
    // flips immediately (before any await); a resolved proposal is terminal, so it is never released.
    const proposalLocksRef = useRef<Set<number>>(new Set());
    useEffect(() => {
        const username = user?.username;
        if (!isOpen || !username || messages.length > 0 || conversationId) return;
        if (hydratedForUser.current === username) return;
        hydratedForUser.current = username;
        // Cancellation guard: if the user switches accounts (or the widget unmounts) while the
        // fetch is in flight, the stale result must not leak into the new session.
        let cancelled = false;
        fetchLastConversation(graphqlRequestClient, username).then((last) => {
            if (cancelled || !last || last.messages.length === 0) return;
            setMessages((prev) => {
                // Only hydrate an EMPTY chat. If the user already started a turn while this fetch was
                // in flight, keep their messages — and hydrate conversationId ONLY in that same
                // empty branch, so the old id can't attach the new turns to the wrong persisted
                // conversation (tying both setters to prev.length === 0 keeps them atomic).
                if (prev.length > 0) return prev;
                setConversationId((prevId) => prevId ?? last.conversationId);
                return last.messages.map((m: any) => ({
                    role: m.role === 'user' ? 'user' : 'assistant',
                    content: m.content ?? '',
                    toolCalls: m.toolCalls ?? [],
                    documents: m.documents ?? []
                }));
            });
        });
        return () => {
            cancelled = true;
        };
    }, [isOpen, user?.username, messages.length, conversationId]);

    // Release all proposal locks when the chat is cleared (new conversation): message indices are
    // reused from 0, so a stale lock would otherwise wrongly block a future proposal at that index.
    useEffect(() => {
        if (messages.length === 0) proposalLocksRef.current.clear();
    }, [messages.length]);

    // Human label for a streamed progress event, shown in the pending bubble.
    const progressLabel = (event: AiChatStreamEvent): string => {
        if (event.type === 'tool') {
            switch (event.tool) {
                case 'run_query':
                case 'export_data':
                    return tt('common:cellabot-step-query', 'Querying data…');
                case 'run_mutation':
                case 'import_data':
                    return tt('common:cellabot-step-mutation', 'Applying changes…');
                case 'generate_document':
                    return tt('common:cellabot-step-document', 'Generating a document…');
                case 'execute_function':
                    return tt('common:cellabot-step-function', 'Running a function…');
                default:
                    return tt('common:cellabot-step-analyze', 'Analyzing…');
            }
        }
        const thinking = tt('common:cellabot-thinking', 'Thinking…');
        return event.step && event.step > 1 ? `${thinking} (${event.step})` : thinking;
    };

    const applyResult = (result?: AiChatResult | null) => {
        setIsSending(false);
        if (result?.conversationId) {
            setConversationId(result.conversationId);
        }
        setMessages((prev) => [
            ...prev.filter((m) => !m.pending),
            {
                role: 'assistant',
                content: result?.message ?? '',
                toolCalls: result?.toolCalls ?? [],
                documents: result?.documents ?? [],
                proposedActions: result?.proposedActions ?? null,
                charts: result?.charts ?? []
            }
        ]);
    };

    // Confirm/Cancel of a proposed-actions card. On confirm, the mutations run with the USER'S own
    // GraphQL client — their rights apply and record_history attributes the writes to them.
    const handleProposalDecision = async (index: number, confirmed: boolean) => {
        // No-op on repeat taps so the mutations can't run more than once. The ref check is the
        // real double-click guard (it flips synchronously, before any await); isSending /
        // proposalResolution are secondary React-state guards.
        if (proposalLocksRef.current.has(index) || isSending || messages[index]?.proposalResolution)
            return;
        proposalLocksRef.current.add(index);
        const proposal = messages[index]?.proposedActions;
        // The operations that actually run — the same executable-mutation filter the proposal card
        // uses for its count/details, so what's shown and what runs never diverge (a malformed or
        // unsafe op can't fire a bogus request or make graphqlRequestClient.request() throw).
        const operations = executableProposalOperations(proposal);
        // Reflect the real outcome on the card: only mark "confirmed" when there is actually
        // something to run. A cancel — or a confirm where every operation was filtered out as
        // non-executable (non-mutation document / invalid variables) — resolves as "cancelled",
        // so a green "Confirmed" tag never appears when nothing ran.
        const willRun = confirmed && operations.length > 0;
        setMessages((prev) =>
            prev.map((m, i) =>
                i === index ? { ...m, proposalResolution: willRun ? 'confirmed' : 'cancelled' } : m
            )
        );
        // Cancel: nothing to run.
        if (!confirmed) return;
        // Confirmed, but nothing executable: tell the user nothing was applicable (the card already
        // shows "Cancelled" above) so it can never look like actions ran when none did.
        if (operations.length === 0) {
            const noneMsg = tt('common:cellabot-actions-none', 'No applicable actions to apply.');
            showError(noneMsg);
            setMessages((prev) => [...prev, { role: 'assistant', content: noneMsg, error: true }]);
            return;
        }
        setIsSending(true);
        let applied = 0;
        const failures: string[] = [];
        for (const operation of operations) {
            try {
                await graphqlRequestClient.request(operation.document, operation.variables ?? {});
                applied += 1;
            } catch (error: any) {
                failures.push(
                    String(error?.response?.errors?.[0]?.message ?? error?.message ?? error)
                );
            }
        }
        setIsSending(false);
        const label = tt('common:cellabot-actions-applied', 'Actions applied');
        const failed = failures.length
            ? `\n${tt('common:cellabot-actions-failed', 'Failures')}: ${failures.slice(0, 3).join(' | ')}`
            : '';
        setMessages((prev) => [
            ...prev,
            {
                role: 'assistant',
                content: `${label}: ${applied}/${operations.length}${failed}`,
                error: failures.length > 0
            }
        ]);
    };

    // --- Conversation management (gated by canManageConversations) --------------------------------
    const refreshConversations = async () => {
        const username = user?.username;
        if (!username) return;
        setHistoryLoading(true);
        try {
            setConversations(await fetchConversations(graphqlRequestClient, username));
        } catch (error) {
            setConversations([]);
            showError(tt('common:cellabot-history-error', 'Could not load your conversations.'));
        } finally {
            setHistoryLoading(false);
        }
    };

    const openHistory = () => {
        setShowHistory(true);
        refreshConversations();
    };

    // "New conversation": drop the current chat/conversationId so the next turn starts a fresh
    // persisted one, and leave the history view.
    const startNewConversation = () => {
        setShowHistory(false);
        clearMessages();
    };

    // Continue a saved conversation: load its messages into the chat and target it for the next turn.
    const loadConversation = async (id: string) => {
        setShowHistory(false);
        try {
            const rows = await fetchConversationMessages(graphqlRequestClient, id);
            setMessages(
                rows.map((m: any) => ({
                    role: m.role === 'user' ? 'user' : 'assistant',
                    content: m.content ?? '',
                    toolCalls: m.toolCalls ?? [],
                    documents: m.documents ?? []
                }))
            );
            setConversationId(id);
        } catch (error) {
            showError(tt('common:cellabot-history-error', 'Could not load your conversations.'));
        }
    };

    const handleDeleteConversation = async (id: string) => {
        try {
            await deleteConversation(graphqlRequestClient, id);
            setConversations((prev) => prev.filter((c) => c.id !== id));
            // If the open chat was this conversation, reset to a fresh one.
            if (id === conversationId) clearMessages();
        } catch (error) {
            showError(tt('common:cellabot-delete-error', 'Could not delete the conversation.'));
        }
    };

    const applyError = () => {
        setIsSending(false);
        setMessages((prev) =>
            prev.map((m) =>
                m.pending
                    ? {
                          role: 'assistant',
                          content: tt(
                              'common:cellabot-error',
                              'Sorry, something went wrong. Please try again.'
                          ),
                          error: true
                      }
                    : m
            )
        );
        showError(tt('common:cellabot-error', 'Sorry, something went wrong.'));
    };

    const handleSend = (text: string) => {
        // History = the completed conversation so far ({ role, content } only).
        const history: Array<AiChatHistoryEntry> = messages
            .filter((m) => !m.pending && !m.error)
            .map((m) => ({ role: m.role, content: m.content }));

        const userMessage: AiChatMessage = { role: 'user', content: text };
        const pendingMessage: AiChatMessage = { role: 'assistant', content: '', pending: true };
        setMessages((prev) => [...prev, userMessage, pendingMessage]);
        setIsSending(true);

        const variables = {
            prompt: text,
            history,
            context: aiContext,
            conversationId,
            capabilities: CELLABOT_CAPABILITIES
        };
        // Streamed by default (live step progress); the mutation stays as fallback — but ONLY when
        // the stream never started: past the first event the agent may already have run tools
        // (including mutations), and re-sending could re-execute them.
        let streamStarted = false;
        streamAiChat(
            variables,
            (event) => {
                const label = progressLabel(event);
                setMessages((prev) => prev.map((m) => (m.pending ? { ...m, content: label } : m)));
            },
            () => {
                streamStarted = true;
            }
        )
            .then(applyResult)
            .catch(() => {
                if (streamStarted) {
                    applyError();
                    return;
                }
                chat.mutate(variables, {
                    onSuccess: (data) => applyResult(data?.aiChat),
                    onError: applyError
                });
            });
    };

    // Show only when ALL gates pass: env kill switch on, authenticated, the user holds the
    // wm_cellabot READ right, and AI is enabled for the warehouse.
    if (!IS_CELLABOT_ENABLED) return null;
    if (!isAuthenticated) return null;
    if (!hasCellabotRead) return null;
    if (availability.data?.aiAvailability?.enabled !== true) return null;

    return (
        // Recolor antd primaries (FAB, send button, spinners) to the Cella brand: yellow surface.
        // colorTextLightSolid (the on-primary text/icon color) is scoped to Button/FloatButton only
        // — NOT global — so Tooltips keep their default light text on their dark bubble (a global
        // override made tooltip text dark-on-dark and invisible).
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
                    tooltip={tt('common:cellabot', 'CellaBot')}
                    onClick={open}
                    style={{ right: 24, bottom: 24, zIndex: FAB_Z_INDEX }}
                />
            )}
            <Drawer
                title={
                    <Space>
                        <CommentOutlined style={{ color: CELLA_YELLOW }} />
                        {tt('common:cellabot', 'CellaBot')}
                    </Space>
                }
                placement="right"
                open={isOpen}
                onClose={close}
                mask={false}
                width={420}
                rootStyle={{ zIndex: DRAWER_Z_INDEX }}
                styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column' } }}
                extra={
                    <Space>
                        {canManageConversations && (
                            <Tooltip
                                title={
                                    showHistory
                                        ? tt('common:cellabot-back-to-chat', 'Back to chat')
                                        : tt('common:cellabot-history', 'Conversations')
                                }
                            >
                                <Button
                                    type="text"
                                    aria-label={
                                        showHistory
                                            ? tt('common:cellabot-back-to-chat', 'Back to chat')
                                            : tt('common:cellabot-history', 'Conversations')
                                    }
                                    icon={
                                        showHistory ? (
                                            <CommentOutlined />
                                        ) : (
                                            <UnorderedListOutlined />
                                        )
                                    }
                                    onClick={() =>
                                        showHistory ? setShowHistory(false) : openHistory()
                                    }
                                />
                            </Tooltip>
                        )}
                        <Tooltip title={tt('common:cellabot-new', 'New conversation')}>
                            <Button
                                type="text"
                                aria-label={tt('common:cellabot-new', 'New conversation')}
                                icon={<FormOutlined />}
                                onClick={startNewConversation}
                                disabled={messages.length === 0 && !showHistory}
                            />
                        </Tooltip>
                    </Space>
                }
            >
                <Body>
                    {showHistory ? (
                        <CellaBotConversationList
                            conversations={conversations}
                            loading={historyLoading}
                            activeId={conversationId}
                            onContinue={loadConversation}
                            onDelete={handleDeleteConversation}
                        />
                    ) : (
                        <>
                            <CellaBotMessageList
                                messages={messages}
                                onProposalDecision={handleProposalDecision}
                            />
                            {messages.length === 0 && (
                                <CellaBotSuggestions
                                    context={aiContext}
                                    exposedDocuments={
                                        availability.data?.aiAvailability?.exposedDocuments ?? []
                                    }
                                    onPick={handleSend}
                                />
                            )}
                            <CellaBotComposer
                                onSend={handleSend}
                                loading={isSending || chat.isPending}
                            />
                        </>
                    )}
                </Body>
            </Drawer>
        </ConfigProvider>
    );
};

export default CellaBotWidget;
