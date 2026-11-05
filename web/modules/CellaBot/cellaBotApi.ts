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
import { cookie, IS_FAKE, IS_SAME_SEED } from '@helpers';
import { useMutation, useQuery } from '@tanstack/react-query';
import { gql } from 'graphql-request';
import { OperationDefinitionNode, parse } from 'graphql';
import { AiUiContext } from 'context/CellaBotContext';

// The CELLA AI assistant lives behind two GraphQL operations (aiChat / aiAvailability).
// We use the runtime gql layer (graphqlRequestClient.request) rather than generated hooks —
// this is the repo's dominant data-fetching pattern (see crudHooks) and avoids re-running the
// staging-pinned codegen (which would churn generated/graphql.ts).

export const AI_AVAILABILITY_QUERY = gql`
    query AiAvailability {
        aiAvailability {
            enabled
            exposedDocuments {
                documentName
                description
            }
            documentAnalysis {
                enabled
                maxFiles
                maxBytesTotal
                defaultKind
                allowedSources
                supportedMediaTypes
                kinds {
                    slug
                    description
                }
            }
        }
    }
`;

// The same query without `documentAnalysis`, for a backend that predates document analysis: the
// field is then unknown and the whole query fails validation, which would hide every AI entry point.
const LEGACY_AI_AVAILABILITY_QUERY = gql`
    query AiAvailability {
        aiAvailability {
            enabled
            exposedDocuments {
                documentName
                description
            }
        }
    }
`;

// What THIS front can render: the backend only teaches/offers the matching features (an older
// front that doesn't declare them keeps the plain pre-existing chat behavior).
export const CELLABOT_CAPABILITIES = ['entityLinks', 'proposedActions', 'charts'];

const AI_CHAT_RESULT_FIELDS = `
    message
    steps
    conversationId
    proposedActions
    charts
    documents {
        filename
        base64
        url
    }
    toolCalls {
        tool
        arguments
    }
`;

export const AI_CHAT_MUTATION = gql`
    mutation AiChat(
        $prompt: String!
        $history: [JSON!]
        $context: JSON
        $conversationId: String
        $capabilities: [String!]
    ) {
        aiChat(
            prompt: $prompt
            history: $history
            context: $context
            conversationId: $conversationId
            capabilities: $capabilities
        ) {
            ${AI_CHAT_RESULT_FIELDS}
        }
    }
`;

// Variant used when files are attached. Kept separate (like the iOS app) so the plain chat keeps
// working against a backend without `documents` / `usage`: only a turn that needs them asks for them.
// `kind` (the extraction recipe) only exists on the SSE route, so this fallback uses the default one.
export const AI_CHAT_WITH_DOCUMENTS_MUTATION = gql`
    mutation AiChat(
        $prompt: String!
        $history: [JSON!]
        $context: JSON
        $conversationId: String
        $capabilities: [String!]
        $documents: [AiDocumentInput!]
    ) {
        aiChat(
            prompt: $prompt
            history: $history
            context: $context
            conversationId: $conversationId
            capabilities: $capabilities
            documents: $documents
        ) {
            ${AI_CHAT_RESULT_FIELDS}
            usage
        }
    }
`;

export interface AiChatDocument {
    filename?: string | null;
    base64?: string | null;
    url?: string | null;
}

export interface AiChatToolCall {
    tool?: string | null;
    arguments?: any;
}

export interface AiProposedActions {
    summary: string;
    operations: Array<{ document: string; variables?: any }>;
    count: number;
}

// Token cost of one turn (every LLM call of the turn, cached prompt tokens included).
export interface AiUsage {
    inputTokens?: number | null;
    outputTokens?: number | null;
    cacheReadTokens?: number | null;
    cacheWriteTokens?: number | null;
    totalTokens?: number | null;
}

// A file attached to a turn: always sent inline (the API has no upload step).
export interface AiDocumentInput {
    filename: string;
    base64: string;
}

// A proposed operation is executable only if it is a GraphQL *mutation* with object (or absent)
// variables: the confirm path runs writes with the user's own rights, so a stray query/subscription
// or malformed variables from LLM/backend JSON must never run. Parse the document and require exactly
// one operation that is a mutation (fragments allowed, not counted); a `/^\s*mutation/` token check
// would wrongly drop a valid fragment-first mutation, and >1 operation makes graphql-request throw.
const isMutationDocument = (document: string): boolean => {
    try {
        const operations = parse(document).definitions.filter(
            (definition) => definition.kind === 'OperationDefinition'
        ) as OperationDefinitionNode[];
        return operations.length === 1 && operations[0].operation === 'mutation';
    } catch {
        return false;
    }
};

const hasObjectVariables = (variables: any): boolean =>
    variables == null || (typeof variables === 'object' && !Array.isArray(variables));

/**
 * The proposal operations that will ACTUALLY run on confirm. Single source of truth shared by the
 * confirm path (execution) and the proposal card (count + details) so the card never claims more
 * operations than are executed.
 */
export const executableProposalOperations = (
    proposal?: AiProposedActions | null
): Array<{ document: string; variables?: any }> =>
    Array.isArray(proposal?.operations)
        ? proposal!.operations.filter(
              (op: any) =>
                  op &&
                  typeof op.document === 'string' &&
                  op.document.trim() &&
                  isMutationDocument(op.document) &&
                  hasObjectVariables(op.variables)
          )
        : [];

export interface AiChatResult {
    message?: string | null;
    steps?: number | null;
    documents?: Array<AiChatDocument> | null;
    toolCalls?: Array<AiChatToolCall> | null;
    conversationId?: string | null;
    proposedActions?: AiProposedActions | null;
    charts?: Array<any> | null;
    usage?: AiUsage | null;
}

export interface AiChatHistoryEntry {
    role: 'user' | 'assistant';
    content: string;
}

export interface AiChatVariables {
    prompt: string;
    history?: Array<AiChatHistoryEntry>;
    context?: AiUiContext;
    conversationId?: string | null;
    capabilities?: string[];
    documents?: Array<AiDocumentInput>;
    // Extraction recipe for the attached documents (SSE route only); omitted = warehouse default.
    kind?: string | null;
}

export interface AiExposedDocument {
    documentName?: string | null;
    description?: string | null;
}

export interface AiDocumentKind {
    slug: string;
    description?: string | null;
}

// Per-warehouse document analysis settings: whether the paperclip is offered and its limits.
export interface AiDocumentAnalysisAvailability {
    enabled?: boolean | null;
    maxFiles?: number | null;
    maxBytesTotal?: number | null;
    defaultKind?: string | null;
    allowedSources?: Array<string> | null;
    supportedMediaTypes?: Array<string> | null;
    kinds?: Array<AiDocumentKind> | null;
}

export interface AiAvailabilityResponse {
    aiAvailability?: {
        enabled?: boolean | null;
        exposedDocuments?: Array<AiExposedDocument> | null;
        documentAnalysis?: AiDocumentAnalysisAvailability | null;
    } | null;
}

interface AiChatResponse {
    aiChat?: AiChatResult | null;
}

// The user's most recent persisted conversation (cross-device history). Both queries ride the
// generated V2 resolvers; a user without READ rights on the tables simply gets an error that the
// caller ignores (hydration is best-effort).
export const LAST_CONVERSATION_QUERY = gql`
    query CellaBotLastConversation($f: AiConversationSearchFilters) {
        aiConversations(
            filters: $f
            orderBy: [{ field: created, ascending: false }]
            itemsPerPage: 1
        ) {
            results {
                id
            }
        }
    }
`;

// Order DESCENDING (newest first) under the 100-item cap so a long conversation keeps its most
// recent context instead of the oldest 100 turns; callers reverse the page back to chronological
// (oldest→newest) for display.
export const CONVERSATION_MESSAGES_QUERY = gql`
    query CellaBotConversationMessages($f: AiMessageSearchFilters) {
        aiMessages(
            filters: $f
            orderBy: [{ field: created, ascending: false }]
            itemsPerPage: 100
        ) {
            results {
                role
                content
                toolCalls
                documents
            }
        }
    }
`;

// Conversation management (list / rename / delete). The resolver row-scopes ai_conversation to the
// current worker, so this only ever returns/changes the caller's own conversations. The `username`
// filter is belt-and-suspenders on top of that scoping.
export const CONVERSATIONS_LIST_QUERY = gql`
    query CellaBotConversations($f: AiConversationSearchFilters, $itemsPerPage: Int) {
        aiConversations(
            filters: $f
            orderBy: [{ field: created, ascending: false }]
            itemsPerPage: $itemsPerPage
        ) {
            results {
                id
                title
                created
            }
        }
    }
`;

export const DELETE_CONVERSATION_MUTATION = gql`
    mutation CellaBotDeleteConversation($id: String!) {
        deleteAiConversation(id: $id)
    }
`;

export const RENAME_CONVERSATION_MUTATION = gql`
    mutation CellaBotRenameConversation($id: String!, $input: UpdateAiConversationInput!) {
        updateAiConversation(id: $id, input: $input) {
            id
            title
        }
    }
`;

// The backend titles a new conversation with the first 120 characters of its first prompt.
export const CONVERSATION_TITLE_MAX_LENGTH = 120;

export interface AiConversationSummary {
    id: string;
    title?: string | null;
    created?: string | null;
}

/** List the user's persisted conversations (most recent first). Row-scoped server-side. */
export const fetchConversations = async (
    graphqlRequestClient: any,
    username: string,
    itemsPerPage = 30
): Promise<Array<AiConversationSummary>> => {
    const res = await graphqlRequestClient.request(CONVERSATIONS_LIST_QUERY, {
        f: { username },
        itemsPerPage
    });
    return res?.aiConversations?.results ?? [];
};

/** Load one conversation's messages (most recent 100), scoped to the caller server-side, returned
 *  oldest→newest for display (the query fetches newest-first under the cap, so reverse it). */
export const fetchConversationMessages = async (
    graphqlRequestClient: any,
    conversationId: string
): Promise<Array<any>> => {
    const res = await graphqlRequestClient.request(CONVERSATION_MESSAGES_QUERY, {
        f: { conversationId }
    });
    return [...(res?.aiMessages?.results ?? [])].reverse();
};

/** Delete a conversation (its messages cascade server-side). */
export const deleteConversation = async (graphqlRequestClient: any, id: string): Promise<void> => {
    await graphqlRequestClient.request(DELETE_CONVERSATION_MUTATION, { id });
};

/** Rename a conversation (ownership is enforced server-side). */
export const renameConversation = async (
    graphqlRequestClient: any,
    id: string,
    title: string
): Promise<void> => {
    await graphqlRequestClient.request(RENAME_CONVERSATION_MUTATION, { id, input: { title } });
};

/** Fetch the user's latest persisted conversation, or null (best-effort, errors swallowed). */
export const fetchLastConversation = async (
    graphqlRequestClient: any,
    username: string
): Promise<{ conversationId: string; messages: Array<any> } | null> => {
    try {
        const conversations = await graphqlRequestClient.request(LAST_CONVERSATION_QUERY, {
            f: { username }
        });
        const conversationId = conversations?.aiConversations?.results?.[0]?.id;
        if (!conversationId) return null;
        const messages = await graphqlRequestClient.request(CONVERSATION_MESSAGES_QUERY, {
            f: { conversationId }
        });
        // The query returns newest-first (see CONVERSATION_MESSAGES_QUERY): reverse to chronological.
        return { conversationId, messages: [...(messages?.aiMessages?.results ?? [])].reverse() };
    } catch (error) {
        return null;
    }
};

// GraphQL validation error raised when a selected field does not exist on the server's schema.
const isUnknownFieldError = (error: any): boolean =>
    (error?.response?.errors ?? []).some((e: any) =>
        /Cannot query field/i.test(String(e?.message ?? ''))
    );

const fetchAiAvailability = async (graphqlRequestClient: any): Promise<AiAvailabilityResponse> => {
    try {
        return await graphqlRequestClient.request(AI_AVAILABILITY_QUERY);
    } catch (error) {
        if (isUnknownFieldError(error)) {
            return graphqlRequestClient.request(LEGACY_AI_AVAILABILITY_QUERY);
        }
        throw error;
    }
};

// Lightweight availability check — only fires once the user is authenticated.
export const useAiAvailability = (graphqlRequestClient: any, enabled: boolean) =>
    useQuery<AiAvailabilityResponse>({
        queryKey: ['aiAvailability'],
        queryFn: () => fetchAiAvailability(graphqlRequestClient),
        enabled,
        staleTime: 5 * 60 * 1000,
        retry: false
    });

export const useAiChat = (
    graphqlRequestClient: any,
    options?: {
        onSuccess?: (data: AiChatResponse) => void;
        onError?: (error: any) => void;
    }
) =>
    useMutation<AiChatResponse, any, AiChatVariables>({
        mutationFn: ({ kind, documents, ...variables }: AiChatVariables) =>
            documents && documents.length > 0
                ? graphqlRequestClient.request(AI_CHAT_WITH_DOCUMENTS_MUTATION, {
                      ...variables,
                      documents
                  })
                : graphqlRequestClient.request(AI_CHAT_MUTATION, variables),
        onSuccess: options?.onSuccess,
        onError: options?.onError
    });

// ------------------------------------------------------------------------------ errors

// Why a chat turn failed. Carried on the Error as `cellaBotKind` (a discriminant rather than Error
// subclasses: the project compiles to ES5, where `instanceof` on an Error subclass is unreliable).
// - rejected:   the stream route refused the turn before opening (403/422/429) with a safe message
//               (AI disabled, no wm_cellabot, invalid attachment, daily token budget reached);
// - notStarted: the stream could not be opened for another reason — the mutation fallback is safe;
// - aborted:    the user stopped the turn;
// - server:     an `error` event after the stream opened (safe wording from the backend);
// - incomplete: the stream ended without its `final` event.
export type AiChatErrorKind = 'rejected' | 'notStarted' | 'aborted' | 'server' | 'incomplete';

export const aiChatError = (kind: AiChatErrorKind, message: string, status?: number) =>
    Object.assign(new Error(message), { cellaBotKind: kind, status });

export const aiChatErrorKind = (error: any): AiChatErrorKind | undefined => error?.cellaBotKind;

/** Replace `{{name}}` placeholders in a (translated) template. */
export const interpolate = (template: string, values: Record<string, string | number>): string =>
    template.replace(/{{\s*(\w+)\s*}}/g, (match, name) =>
        values[name] !== undefined ? String(values[name]) : match
    );

// Coded API errors whose wording comes from the `errors:<code>` DB translations: AI disabled for the
// warehouse, AI provider failure, daily token budget used up, missing wm_cellabot permission.
const TRANSLATED_ERROR_CODES = ['AI-000100', 'AI-000110', 'AI-000130', 'APP-000200'];

/**
 * The message to show for a failed chat turn: the translated wording of a known API error code,
 * else the server's own (safe) message, else a generic one.
 */
export const aiErrorMessage = (error: any, tt: (key: string, def: string) => string): string => {
    const generic = tt('common:cellabot-error', 'Sorry, something went wrong. Please try again.');
    switch (aiChatErrorKind(error)) {
        case 'rejected':
            return error.status === 429
                ? tt('errors:AI-000130', error.message || generic)
                : error.message || generic;
        case 'server':
            return error.message || generic;
        case 'incomplete':
            return tt(
                'common:cellabot-incomplete',
                'The answer was interrupted. Please try again.'
            );
        default:
            break;
    }
    const graphqlError = error?.response?.errors?.[0];
    const code = graphqlError?.extensions?.code;
    if (typeof code === 'string' && TRANSLATED_ERROR_CODES.includes(code)) {
        return tt(`errors:${code}`, graphqlError?.message || generic);
    }
    // Other coded errors (AI-000120 invalid input: e.g. which attachment was refused) carry a
    // specific, safe message: show it as is.
    return code && graphqlError?.message ? graphqlError.message : generic;
};

// ---------------------------------------------------------------- streaming (SSE)

export interface AiStreamDocumentInfo {
    filename?: string | null;
    mediaType?: string | null;
    bytes?: number | null;
    pages?: number | null;
}

export interface AiChatStreamEvent {
    type: 'step' | 'tool' | 'documents' | 'delta' | 'final' | 'error';
    step?: number;
    tool?: string;
    arguments?: any;
    result?: any;
    message?: string;
    text?: string;
    documents?: Array<AiStreamDocumentInfo>;
}

export interface AiChatStreamHandlers {
    // Progress of the turn: a completion round (`step`), a tool about to run (`tool`), the attached
    // documents being read (`documents`).
    onProgress?: (event: AiChatStreamEvent) => void;
    // A piece of the answer as the model writes it (token streaming).
    onDelta?: (text: string) => void;
    // The first event was received (see streamAiChat).
    onStarted?: () => void;
}

// The SSE endpoint lives on the same API host as the GraphQL endpoint.
const streamEndpoint = () =>
    (process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT ?? '').replace(/\/graphql\/?$/, '') +
    '/ai/chat/stream';

// Statuses the stream route answers itself, before opening, with a `{"error": "..."}` body.
const REJECTED_STATUSES = [403, 422, 429];

/**
 * Streaming variant of the aiChat mutation: POSTs to /ai/chat/stream with token streaming on and
 * reports progress and answer deltas through `handlers`, resolving with the final AiChatResult.
 *
 * `onStarted` fires on the FIRST received event: past that point the agent may already have run
 * tools (including mutations), so callers must NOT fall back to the non-streaming mutation — a
 * retry could re-execute writes. Fallback is only safe for a `notStarted` error.
 *
 * Aborting `signal` closes the connection; the backend then stops the agent loop (and does not save
 * the turn). The promise rejects with an `aborted` error.
 */
export const streamAiChat = async (
    variables: AiChatVariables,
    handlers: AiChatStreamHandlers = {},
    signal?: AbortSignal
): Promise<AiChatResult> => {
    const token = cookie.get('token');
    if (!token) {
        throw aiChatError('notStarted', 'Not authenticated');
    }
    // Mirror the fake-data headers AuthContext puts on the GraphQL client, so streaming behaves the
    // same as the aiChat mutation in NEXT_PUBLIC_FAKE_DATA_ON environments (else the SSE endpoint can
    // diverge / fail there).
    const headers: Record<string, string> = {
        'content-type': 'application/json',
        accept: 'text/event-stream',
        authorization: `Bearer ${token}`
    };
    if (IS_FAKE) {
        headers['X-API-fake'] = 'fake';
        if (IS_SAME_SEED) headers['X-API-seed'] = 'same';
    }

    let response: Response;
    try {
        response = await fetch(streamEndpoint(), {
            method: 'POST',
            headers,
            // Token streaming is opt-in: `delta` events carry the answer as it is produced.
            body: JSON.stringify({ ...variables, streamTokens: true }),
            signal
        });
    } catch (error: any) {
        if (signal?.aborted) throw aiChatError('aborted', 'Stopped');
        throw aiChatError('notStarted', String(error?.message ?? error));
    }
    if (!response.ok || !response.body) {
        if (REJECTED_STATUSES.includes(response.status)) {
            // The backend's own refusal: re-sending through the mutation would fail the same way
            // (and upload the attachments twice), so surface its message instead.
            let message = '';
            try {
                const body = await response.json();
                message = typeof body?.error === 'string' ? body.error : '';
            } catch (e) {
                /* not JSON: keep the generic message */
            }
            throw aiChatError('rejected', message, response.status);
        }
        throw aiChatError('notStarted', `AI stream failed (${response.status})`, response.status);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let started = false;
    let final: AiChatResult | null = null;

    const handleEvent = (event: AiChatStreamEvent) => {
        if (!started) {
            started = true;
            handlers.onStarted?.();
        }
        switch (event.type) {
            case 'error':
                throw aiChatError('server', event.message || '');
            case 'delta':
                if (event.text) handlers.onDelta?.(event.text);
                return;
            case 'final': {
                const result = event.result;
                if (!result) return;
                // The raw agent result uses snake_case (unlike the camelCased GraphQL payload); the
                // stream endpoint injects conversationId camelCased, but accept both to be safe.
                final = {
                    message: result.message,
                    steps: result.steps,
                    documents: result.documents ?? [],
                    toolCalls: result.tool_calls ?? result.toolCalls ?? [],
                    conversationId: result.conversationId ?? result.conversation_id ?? null,
                    proposedActions: result.proposed_actions ?? result.proposedActions ?? null,
                    charts: result.charts ?? [],
                    usage: result.usage ?? null
                };
                return;
            }
            default:
                handlers.onProgress?.(event);
        }
    };

    // Parse one SSE frame ("data: <json>") and dispatch it. Space after 'data:' is optional per spec.
    const drainFrame = (raw: string) => {
        const line = raw.split('\n').find((l) => l.startsWith('data:'));
        if (!line) return;
        let event: AiChatStreamEvent;
        try {
            event = JSON.parse(line.slice(5).trimStart());
        } catch (e) {
            return;
        }
        handleEvent(event);
    };

    try {
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            // Drop CRs entirely (not just '\r\n': a CRLF can be split across two chunks): proxies may
            // rewrite the SSE separator to \r\n\r\n, and the JSON payloads never carry a raw CR.
            buffer += decoder.decode(value, { stream: true }).replace(/\r/g, '');
            let separator;
            while ((separator = buffer.indexOf('\n\n')) >= 0) {
                const raw = buffer.slice(0, separator);
                buffer = buffer.slice(separator + 2);
                drainFrame(raw);
            }
        }
        // Flush any bytes the decoder held for an incomplete multibyte char, then process a trailing
        // frame that wasn't terminated by a blank line — otherwise the last event (often the `final`
        // one) is dropped and we wrongly report "stream ended without a final event".
        buffer += decoder.decode().replace(/\r/g, '');
        if (buffer.trim()) {
            drainFrame(buffer);
        }
        if (!final) {
            // Closed without a single event: the agent never reported starting, so the turn is
            // still safe to re-send through the mutation.
            throw started
                ? aiChatError('incomplete', 'AI stream ended without a final event')
                : aiChatError('notStarted', 'AI stream closed without any event');
        }
        return final;
    } catch (error: any) {
        // reader.read() rejects once the signal aborts: report it as a stop, not as a failure.
        if (signal?.aborted) throw aiChatError('aborted', 'Stopped');
        if (aiChatErrorKind(error)) throw error;
        // A transport failure mid-stream: never a `notStarted` (no fallback once events arrived).
        throw started
            ? aiChatError('incomplete', String(error?.message ?? error))
            : aiChatError('notStarted', String(error?.message ?? error));
    } finally {
        // Release the SSE connection even when we throw (server `error` event, or no `final` event)
        // so a broken stream never leaks an open reader.
        try {
            await reader.cancel();
        } catch (e) {
            /* already closed */
        }
    }
};
