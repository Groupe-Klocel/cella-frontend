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
import { useRouter } from 'next/router';
import { useAuth } from 'context/AuthContext';
import {
    createContext,
    Dispatch,
    ReactNode,
    SetStateAction,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState
} from 'react';

// The free-form UI context sent to the `aiChat` mutation so the assistant knows what the
// user is currently looking at. All fields optional (see the AI integration doc).
export interface AiUiContext {
    url?: string;
    view?: string;
    entityType?: string;
    entityId?: string;
    filters?: any;
    selection?: any[];
    pageText?: string;
    // The UI locale (router.locale, e.g. 'fr-FR'): lets the assistant answer in the user's
    // language and pass the right `language` argument to queries (statusText etc.).
    locale?: string;
}

// One chat bubble. `toolCalls`/`documents`/`pending`/`error` are UI-only extras and are
// stripped when the running history is sent back to the API (only { role, content } is sent).
export interface AiChatMessage {
    role: 'user' | 'assistant';
    content: string;
    toolCalls?: Array<{ tool?: string | null; arguments?: any }>;
    documents?: Array<{ filename?: string | null; base64?: string | null; url?: string | null }>;
    // Mutations the assistant proposes instead of executing ({summary, operations, count});
    // rendered as a Confirm/Cancel card, executed with the user's own client on confirmation.
    proposedActions?: { summary: string; operations: Array<any>; count: number } | null;
    proposalResolution?: 'confirmed' | 'cancelled';
    // Validated chart specs (render_chart tool) rendered inline as SVG.
    charts?: Array<any>;
    pending?: boolean;
    error?: boolean;
}

// The UI-context store is consumed by the deep, heavy CRUD components (to push context).
interface IAiContextStore {
    aiContext: AiUiContext;
    // Shallow-merge a partial into the current UI context.
    patchAiContext: (partial: Partial<AiUiContext>) => void;
    // Replace the whole UI context (used to reset a clean baseline on navigation).
    setAiContext: (ctx: AiUiContext) => void;
}

// The chat UI state is consumed only by the widget. It is kept in a SEPARATE context so that
// frequent message/open-state updates don't re-render the list/detail components that only
// subscribe to the UI-context store above.
interface ICellaBotChat {
    isOpen: boolean;
    open: () => void;
    close: () => void;
    toggle: () => void;
    messages: Array<AiChatMessage>;
    setMessages: Dispatch<SetStateAction<Array<AiChatMessage>>>;
    clearMessages: () => void;
    // Server-side conversation id (ai_conversation): lets aiChat append to the same persisted
    // conversation across turns/devices. Null = new conversation on the next turn.
    conversationId: string | null;
    setConversationId: Dispatch<SetStateAction<string | null>>;
}

const AiContextStore = createContext<IAiContextStore | undefined>(undefined);
const CellaBotChatContext = createContext<ICellaBotChat | undefined>(undefined);

const deriveView = (pathname: string): string | undefined => {
    return pathname.split('/').filter(Boolean)[0] || undefined;
};

// sessionStorage key prefix for the per-user chat persistence (per-tab, cleared on tab close).
const CHAT_STORAGE_PREFIX = 'cellabot-chat-';

export const CellaBotProvider = ({ children }: { children: ReactNode }) => {
    const router = useRouter();
    const { user } = useAuth();
    const [aiContext, setAiContextState] = useState<AiUiContext>({});
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Array<AiChatMessage>>([]);
    const [conversationId, setConversationId] = useState<string | null>(null);

    const setAiContext = useCallback((ctx: AiUiContext) => setAiContextState(ctx), []);

    // Stable + idempotent. Short-circuits when every key in `partial` already equals the
    // current value, so the deep CRUD enrichment effects can call this freely without
    // triggering a re-render loop (no setState => no re-render => no effect re-run).
    const patchAiContext = useCallback((partial: Partial<AiUiContext>) => {
        setAiContextState((prev) => {
            const unchanged = (Object.keys(partial) as Array<keyof AiUiContext>).every(
                (key) => prev[key] === partial[key]
            );
            return unchanged ? prev : { ...prev, ...partial };
        });
    }, []);

    // Reset a clean baseline at the *start* of every navigation. This runs before the
    // destination page mounts, so stale entityType/filters/selection from the previous
    // screen are cleared before that page's CRUD components re-enrich on top.
    useEffect(() => {
        const onRouteChangeStart = (url: string) => setAiContextState({ url });
        router.events.on('routeChangeStart', onRouteChangeStart);
        return () => router.events.off('routeChangeStart', onRouteChangeStart);
    }, [router.events]);

    // Best-effort auto context from the route alone (works on every page, including
    // non-CRUD ones). Owns `url`, the path-based `view`, and `entityId` (from the [id] param).
    // The CRUD components enrich `entityType` / `filters` / `selection` on top.
    useEffect(() => {
        patchAiContext({
            url: router.asPath,
            view: deriveView(router.pathname),
            entityId: (router.query.id as string) ?? undefined,
            locale: router.locale ?? undefined
        });
    }, [router.asPath, router.pathname, router.query.id, router.locale, patchAiContext]);

    // Purge the conversation whenever the logged-in user changes (login / logout / switch),
    // so one user's chat never carries over to another session — then rehydrate that user's own
    // conversation from sessionStorage (per-tab), so a hard page reload no longer wipes the chat.
    // Keyed on a primitive identity so it fires only on an actual change.
    const userKey = user?.username ?? user?.id ?? null;
    useEffect(() => {
        setIsOpen(false);
        if (!userKey || typeof window === 'undefined') {
            setMessages([]);
            setConversationId(null);
            return;
        }
        try {
            const raw = window.sessionStorage.getItem(CHAT_STORAGE_PREFIX + userKey);
            const parsed = raw ? JSON.parse(raw) : null;
            // Legacy shape was a plain array of messages; current shape is {messages, conversationId}.
            const stored = Array.isArray(parsed) ? { messages: parsed } : (parsed ?? {});
            setMessages(Array.isArray(stored.messages) ? stored.messages : []);
            setConversationId(stored.conversationId ?? null);
        } catch (e) {
            setMessages([]);
            setConversationId(null);
        }
    }, [userKey]);

    // Best-effort persistence of the completed turns (pending/error bubbles are transient, and
    // base64 document payloads are dropped — they can be MBs and would blow the storage quota).
    useEffect(() => {
        if (!userKey || typeof window === 'undefined') return;
        try {
            const completed = messages
                .filter((m) => !m.pending && !m.error)
                .map((m) =>
                    m.documents?.some((d) => d?.base64)
                        ? {
                              ...m,
                              documents: m.documents.map((d) => ({ ...d, base64: undefined }))
                          }
                        : m
                );
            if (completed.length === 0 && !conversationId) {
                window.sessionStorage.removeItem(CHAT_STORAGE_PREFIX + userKey);
            } else {
                window.sessionStorage.setItem(
                    CHAT_STORAGE_PREFIX + userKey,
                    JSON.stringify({ messages: completed, conversationId })
                );
            }
        } catch (e) {
            // Storage full or unavailable: persistence is best-effort, the in-memory chat still works.
        }
    }, [messages, conversationId, userKey]);

    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);
    const toggle = useCallback(() => setIsOpen((v) => !v), []);
    const clearMessages = useCallback(() => {
        setMessages([]);
        setConversationId(null); // "new conversation": the next turn starts a fresh persisted one
    }, []);

    const storeValue = useMemo(
        () => ({ aiContext, patchAiContext, setAiContext }),
        [aiContext, patchAiContext, setAiContext]
    );

    const chatValue = useMemo(
        () => ({
            isOpen,
            open,
            close,
            toggle,
            messages,
            setMessages,
            clearMessages,
            conversationId,
            setConversationId
        }),
        [isOpen, open, close, toggle, messages, clearMessages, conversationId]
    );

    return (
        <AiContextStore.Provider value={storeValue}>
            <CellaBotChatContext.Provider value={chatValue}>
                {children}
            </CellaBotChatContext.Provider>
        </AiContextStore.Provider>
    );
};

// Lean store for the CRUD components: pushing context never re-renders on chat activity.
export const useAiContextStore = (): IAiContextStore => {
    const ctx = useContext(AiContextStore);
    if (!ctx) {
        throw new Error('useAiContextStore must be used within a CellaBotProvider');
    }
    return ctx;
};

// Full chat state for the widget.
export const useCellaBotChat = (): ICellaBotChat => {
    const ctx = useContext(CellaBotChatContext);
    if (!ctx) {
        throw new Error('useCellaBotChat must be used within a CellaBotProvider');
    }
    return ctx;
};
