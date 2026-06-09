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
}

// One chat bubble. `toolCalls`/`documents`/`pending`/`error` are UI-only extras and are
// stripped when the running history is sent back to the API (only { role, content } is sent).
export interface AiChatMessage {
    role: 'user' | 'assistant';
    content: string;
    toolCalls?: Array<{ tool?: string | null; arguments?: any }>;
    documents?: Array<{ filename?: string | null; base64?: string | null; url?: string | null }>;
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
}

const AiContextStore = createContext<IAiContextStore | undefined>(undefined);
const CellaBotChatContext = createContext<ICellaBotChat | undefined>(undefined);

const deriveView = (pathname: string): string | undefined => {
    return pathname.split('/').filter(Boolean)[0] || undefined;
};

export const CellaBotProvider = ({ children }: { children: ReactNode }) => {
    const router = useRouter();
    const { user } = useAuth();
    const [aiContext, setAiContextState] = useState<AiUiContext>({});
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Array<AiChatMessage>>([]);

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
            entityId: (router.query.id as string) ?? undefined
        });
    }, [router.asPath, router.pathname, router.query.id, patchAiContext]);

    // Purge the conversation whenever the logged-in user changes (login / logout / switch),
    // so one user's chat never carries over to another session. Keyed on a primitive identity
    // so it fires only on an actual change (the first mount no-ops on an already-empty chat).
    const userKey = user?.username ?? user?.id ?? null;
    useEffect(() => {
        setMessages([]);
        setIsOpen(false);
    }, [userKey]);

    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);
    const toggle = useCallback(() => setIsOpen((v) => !v), []);
    const clearMessages = useCallback(() => setMessages([]), []);

    const storeValue = useMemo(
        () => ({ aiContext, patchAiContext, setAiContext }),
        [aiContext, patchAiContext, setAiContext]
    );

    const chatValue = useMemo(
        () => ({ isOpen, open, close, toggle, messages, setMessages, clearMessages }),
        [isOpen, open, close, toggle, messages, clearMessages]
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
