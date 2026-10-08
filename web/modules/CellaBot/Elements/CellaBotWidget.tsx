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
import {
    AiChatMessage,
    chatHistory,
    useAiContextStore,
    useCellaBotChat
} from 'context/CellaBotContext';
import { ModeEnum } from 'generated/graphql';
import styled from 'styled-components';
import { useEffect, useRef, useState } from 'react';
import {
    aiChatErrorKind,
    AiChatResult,
    AiChatStreamEvent,
    AiChatVariables,
    AiConversationSummary,
    aiErrorMessage,
    CELLABOT_CAPABILITIES,
    CONVERSATION_TITLE_MAX_LENGTH,
    deleteConversation,
    executableProposalOperations,
    fetchConversationMessages,
    fetchConversations,
    fetchLastConversation,
    interpolate,
    renameConversation,
    streamAiChat,
    useAiAvailability,
    useAiChat
} from '../cellaBotApi';
import { CELLA_ON_YELLOW, CELLA_YELLOW } from '../cellaBotColors';
import CellaBotComposer, { CellaBotComposerPayload } from './CellaBotComposer';
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
    // The identity CellaBotContext keys the chat on.
    const userKey = user?.username ?? user?.id ?? null;
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
    // The running chat turn, if any: aborting it closes the stream (the backend then stops the agent
    // loop). Every callback of a turn checks it is still the current one, so a stopped or superseded
    // turn (new conversation, another conversation loaded, user switch) never writes into the chat.
    const turnRef = useRef<AbortController | null>(null);
    // Mirrors `turnRef` for rendering: the composer offers Stop only while a turn can be stopped.
    const [canStop, setCanStop] = useState(false);
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
    // Conversations whose rename is in flight: one rename at a time per conversation, so two writes
    // can never commit out of order (the ref is the synchronous guard, the state drives the UI).
    const renamingRef = useRef<Set<string>>(new Set());
    const [renamingIds, setRenamingIds] = useState<Array<string>>([]);
    // A saved conversation being loaded: sending waits for it, otherwise the new turn would target
    // the previous conversation and its answer would land in the loaded one. The counter discards a
    // load superseded by another one, a new conversation or a user change.
    const loadRequestRef = useRef(0);
    const [loadingConversation, setLoadingConversation] = useState(false);
    // Where the chat stands, read after an await (a deletion must act on the conversation open when
    // it completes, not the one open when it started): the open conversation and the one loading.
    // The widget updates `conversationIdRef` synchronously wherever it changes the conversation (a
    // later await in the same batch must already see it); the effect follows the changes made by the
    // provider (user switch, restored conversation).
    const conversationIdRef = useRef<string | null>(conversationId);
    const loadingIdRef = useRef<string | null>(null);
    useEffect(() => {
        conversationIdRef.current = conversationId;
    }, [conversationId]);

    // Point the chat at a conversation (null = a fresh one on the next turn), ref included.
    const setOpenConversation = (id: string | null) => {
        conversationIdRef.current = id;
        setConversationId(id);
    };

    // Empty the chat and start a fresh conversation on the next turn.
    const resetChat = () => {
        conversationIdRef.current = null;
        clearMessages();
    };
    // Ordering of conversation-list refreshes and renames: a list read before a rename was saved
    // must not bring the old title back. `listSeqRef` stamps both; `titleOverridesRef` keeps each
    // rename's title with the stamp of its completion (Infinity while pending) until a list read
    // after that completion confirms it.
    const listSeqRef = useRef(0);
    const latestRefreshRef = useRef(0);
    const titleOverridesRef = useRef<Record<string, { title: string; settled: number }>>({});
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

    // Abort the running chat turn, if any, and settle its pending bubble: replaced by
    // `pendingReplacement` (Stop), else dropped — so no spinner outlives its turn, whatever the
    // caller does next. Without a chat turn this is a no-op: the busy state may then belong to a
    // proposal whose mutations are still running, and only that loop may release it.
    const abortTurn = (pendingReplacement?: (m: AiChatMessage) => AiChatMessage) => {
        const turn = turnRef.current;
        if (!turn) return;
        turnRef.current = null;
        setCanStop(false);
        turn.abort();
        setIsSending(false);
        setMessages((prev) =>
            pendingReplacement
                ? prev.map((m) => (m.pending ? pendingReplacement(m) : m))
                : prev.filter((m) => !m.pending)
        );
    };

    // A turn must never outlive its user (the provider purges the chat on a user switch) nor the
    // widget itself.
    useEffect(
        () => () => {
            abortTurn();
            cancelConversationLoad();
            // Drop any list refresh still in flight, with the renames it would reconcile.
            latestRefreshRef.current = listSeqRef.current += 1;
            titleOverridesRef.current = {};
            setHistoryLoading(false);
            setConversations([]);
        },
        [userKey]
    );

    // Human label for a streamed progress event, shown in the pending bubble.
    const progressLabel = (event: AiChatStreamEvent): string => {
        if (event.type === 'documents') {
            const documents = event.documents ?? [];
            return documents.length === 1 && documents[0]?.filename
                ? interpolate(tt('common:cellabot-step-reading-one', 'Reading {{name}}…'), {
                      name: documents[0].filename
                  })
                : interpolate(
                      tt('common:cellabot-step-reading-many', 'Reading {{count}} documents…'),
                      { count: documents.length }
                  );
        }
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
                case 'analyze_document':
                    return tt('common:cellabot-step-analyze-document', 'Reading a document…');
                case 'render_chart':
                    return tt('common:cellabot-step-chart', 'Building a chart…');
                case 'propose_actions':
                    return tt('common:cellabot-step-proposal', 'Preparing the changes to confirm…');
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

    const applyResult = (result?: AiChatResult | null) => {
        turnRef.current = null;
        setCanStop(false);
        setIsSending(false);
        if (result?.conversationId) {
            setOpenConversation(result.conversationId);
        }
        setMessages((prev) => [
            ...prev.filter((m) => !m.pending),
            {
                role: 'assistant',
                content: result?.message ?? '',
                toolCalls: result?.toolCalls ?? [],
                documents: result?.documents ?? [],
                proposedActions: result?.proposedActions ?? null,
                charts: result?.charts ?? [],
                usage: result?.usage ?? null
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
        const startedAt = (listSeqRef.current += 1);
        latestRefreshRef.current = startedAt;
        setHistoryLoading(true);
        try {
            const rows = await fetchConversations(graphqlRequestClient, username);
            if (latestRefreshRef.current !== startedAt) return;
            setConversations(
                rows.map((row) => {
                    const override = titleOverridesRef.current[row.id];
                    if (!override) return row;
                    // Read before this rename was saved: keep the renamed title.
                    if (override.settled > startedAt) return { ...row, title: override.title };
                    delete titleOverridesRef.current[row.id];
                    return row;
                })
            );
        } catch (error) {
            if (latestRefreshRef.current !== startedAt) return;
            setConversations([]);
            showError(tt('common:cellabot-history-error', 'Could not load your conversations.'));
        } finally {
            if (latestRefreshRef.current === startedAt) setHistoryLoading(false);
        }
    };

    const openHistory = () => {
        setShowHistory(true);
        refreshConversations();
    };

    // Forget a saved conversation still loading: its result will be discarded.
    const cancelConversationLoad = () => {
        loadRequestRef.current += 1;
        loadingIdRef.current = null;
        setLoadingConversation(false);
    };

    // "New conversation": drop the current chat/conversationId so the next turn starts a fresh
    // persisted one, and leave the history view.
    const startNewConversation = () => {
        abortTurn();
        cancelConversationLoad();
        setShowHistory(false);
        resetChat();
    };

    // Continue a saved conversation: load its messages into the chat and target it for the next turn.
    const loadConversation = async (id: string) => {
        abortTurn();
        setShowHistory(false);
        const request = (loadRequestRef.current += 1);
        loadingIdRef.current = id;
        setLoadingConversation(true);
        try {
            const rows = await fetchConversationMessages(graphqlRequestClient, id);
            if (request !== loadRequestRef.current) return;
            setMessages(
                rows.map((m: any) => ({
                    role: m.role === 'user' ? 'user' : 'assistant',
                    content: m.content ?? '',
                    toolCalls: m.toolCalls ?? [],
                    documents: m.documents ?? []
                }))
            );
            setOpenConversation(id);
        } catch (error) {
            if (request !== loadRequestRef.current) return;
            showError(tt('common:cellabot-history-error', 'Could not load your conversations.'));
        } finally {
            if (request === loadRequestRef.current) {
                loadingIdRef.current = null;
                setLoadingConversation(false);
            }
        }
    };

    // Optimistic rename: the list shows the new title at once and reverts if the API refuses it. A
    // conversation's rename button stays disabled until its request settles.
    const handleRenameConversation = async (id: string, title: string) => {
        const nextTitle = title.trim().slice(0, CONVERSATION_TITLE_MAX_LENGTH);
        const previousTitle = conversations.find((c) => c.id === id)?.title ?? null;
        if (!nextTitle || nextTitle === previousTitle || renamingRef.current.has(id)) return;
        renamingRef.current.add(id);
        setRenamingIds(Array.from(renamingRef.current));
        const setTitle = (value: string | null) =>
            setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title: value } : c)));
        setTitle(nextTitle);
        titleOverridesRef.current[id] = { title: nextTitle, settled: Number.POSITIVE_INFINITY };
        try {
            await renameConversation(graphqlRequestClient, id, nextTitle);
            const override = titleOverridesRef.current[id];
            if (override) override.settled = listSeqRef.current += 1;
        } catch (error) {
            delete titleOverridesRef.current[id];
            setTitle(previousTitle);
            showError(tt('common:cellabot-rename-error', 'Could not rename the conversation.'));
        } finally {
            renamingRef.current.delete(id);
            setRenamingIds(Array.from(renamingRef.current));
        }
    };

    const handleDeleteConversation = async (id: string) => {
        try {
            await deleteConversation(graphqlRequestClient, id);
            setConversations((prev) => prev.filter((c) => c.id !== id));
            delete titleOverridesRef.current[id];
            // Reset the chat only if it still shows (or is opening) the deleted conversation: the
            // user may have opened another one while the deletion ran.
            if (loadingIdRef.current === id) {
                cancelConversationLoad();
                resetChat();
            } else if (conversationIdRef.current === id) {
                // Cleared even while another conversation loads: that load is left running and
                // installs its conversation if it succeeds, but if it fails the chat must not stay
                // on the deleted one (the next turn would target it).
                abortTurn();
                resetChat();
            }
        } catch (error) {
            showError(tt('common:cellabot-delete-error', 'Could not delete the conversation.'));
        }
    };

    const applyError = (error?: any) => {
        turnRef.current = null;
        setCanStop(false);
        setIsSending(false);
        const message = aiErrorMessage(error, tt);
        setMessages((prev) =>
            prev.map((m) => (m.pending ? { role: 'assistant', content: message, error: true } : m))
        );
        showError(message);
    };

    // Stop button: close the stream and keep what was already written, marked as interrupted. The
    // backend notices the disconnect at the agent's next event: nothing further starts (a tool already
    // running still completes) and a turn stopped before its end is not saved, so the bubble is a
    // local notice (not sent back as history).
    const handleStop = () => {
        const stopped = `*${tt('common:cellabot-stopped', 'Answer stopped.')}*`;
        abortTurn((m) => ({
            role: 'assistant',
            content: m.streaming && m.content ? `${m.content}\n\n${stopped}` : stopped,
            notice: true
        }));
    };

    const handleSend = ({ text, attachments, kind }: CellaBotComposerPayload) => {
        // Every entry point (composer, suggestion chips) honors the busy state, proposals included.
        if (turnRef.current || loadingConversation || isSending || chat.isPending) return;
        // A file-only turn still needs a prompt: send (and show) the default analysis request.
        const prompt =
            text ||
            (attachments.length > 0
                ? tt(
                      'common:cellabot-attachment-default-prompt',
                      'Analyze the attached document(s) and summarize their content.'
                  )
                : '');
        if (!prompt) return;

        // History = the completed conversation so far ({ role, content } only).
        const history = chatHistory(messages);
        const userMessage: AiChatMessage = {
            role: 'user',
            content: prompt,
            ...(attachments.length > 0 && {
                attachments: attachments.map(({ filename, size, mediaType }) => ({
                    filename,
                    size,
                    mediaType
                }))
            })
        };
        const pendingMessage: AiChatMessage = {
            role: 'assistant',
            content:
                attachments.length > 0
                    ? tt('common:cellabot-step-documents', 'Reading the documents…')
                    : '',
            pending: true
        };
        setMessages((prev) => [...prev, userMessage, pendingMessage]);
        setIsSending(true);

        const turn = new AbortController();
        turnRef.current = turn;
        setCanStop(true);
        const isCurrent = () => turnRef.current === turn;

        const variables: AiChatVariables = {
            prompt,
            history,
            context: aiContext,
            conversationId,
            capabilities: CELLABOT_CAPABILITIES,
            ...(attachments.length > 0 && {
                documents: attachments.map(({ filename, base64 }) => ({ filename, base64 })),
                ...(kind && { kind })
            })
        };
        // Streamed by default (live progress + the answer as it is written); the mutation stays as
        // fallback — but ONLY when the stream never started: past the first event the agent may
        // already have run tools (including mutations), and re-sending could re-execute them.
        let streamStarted = false;
        streamAiChat(
            variables,
            {
                onStarted: () => {
                    streamStarted = true;
                },
                // A new step or tool replaces any text streamed so far: text written before a tool
                // call is the model thinking aloud, the final answer comes in the last step.
                onProgress: (event) => {
                    if (!isCurrent()) return;
                    const label = progressLabel(event);
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.pending ? { ...m, content: label, streaming: false } : m
                        )
                    );
                },
                onDelta: (delta) => {
                    if (!isCurrent()) return;
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.pending
                                ? {
                                      ...m,
                                      content: (m.streaming ? m.content : '') + delta,
                                      streaming: true
                                  }
                                : m
                        )
                    );
                }
            },
            turn.signal
        )
            .then((result) => {
                if (isCurrent()) applyResult(result);
            })
            .catch((error) => {
                if (!isCurrent() || aiChatErrorKind(error) === 'aborted') return;
                if (aiChatErrorKind(error) === 'notStarted' && !streamStarted) {
                    // The mutation cannot be cancelled (the backend would run the turn to its end
                    // anyway): no Stop button while it runs, sending stays blocked.
                    setCanStop(false);
                    chat.mutate(variables, {
                        onSuccess: (data) => {
                            if (isCurrent()) applyResult(data?.aiChat);
                        },
                        onError: (mutationError) => {
                            if (isCurrent()) applyError(mutationError);
                        }
                    });
                    return;
                }
                applyError(error);
            });
    };

    // Show only when ALL gates pass: env kill switch on, authenticated, the user holds the
    // wm_cellabot READ right, and AI is enabled for the warehouse.
    if (!IS_CELLABOT_ENABLED) return null;
    if (!isAuthenticated) return null;
    if (!hasCellabotRead) return null;
    if (availability.data?.aiAvailability?.enabled !== true) return null;

    const documentAnalysis = availability.data?.aiAvailability?.documentAnalysis ?? null;

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
                            onRename={handleRenameConversation}
                            renamingIds={renamingIds}
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
                                    documentAnalysis={documentAnalysis}
                                    onPick={(prompt) =>
                                        handleSend({ text: prompt, attachments: [], kind: null })
                                    }
                                />
                            )}
                            <CellaBotComposer
                                // Keyed by the user (as the chat in CellaBotContext): a user change
                                // discards the draft and the staged files of the previous one.
                                key={userKey ?? 'anonymous'}
                                onSend={handleSend}
                                onStop={canStop ? handleStop : undefined}
                                loading={isSending || chat.isPending || loadingConversation}
                                documentAnalysis={documentAnalysis}
                            />
                        </>
                    )}
                </Body>
            </Drawer>
        </ConfigProvider>
    );
};

export default CellaBotWidget;
