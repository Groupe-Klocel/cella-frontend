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
        }
    }
`;

// What THIS front can render: the backend only teaches/offers the matching features (an older
// front that doesn't declare them keeps the plain pre-existing chat behavior).
export const CELLABOT_CAPABILITIES = ['entityLinks', 'proposedActions', 'charts'];

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
}

export interface AiExposedDocument {
    documentName?: string | null;
    description?: string | null;
}

interface AiAvailabilityResponse {
    aiAvailability?: {
        enabled?: boolean | null;
        exposedDocuments?: Array<AiExposedDocument> | null;
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

// Conversation management (list / delete). The resolver row-scopes ai_conversation to the current
// worker, so this only ever returns/deletes the caller's own conversations (admins/integrators see
// all — the audit use case). The `username` filter is belt-and-suspenders on top of that scoping.
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

// Lightweight availability check — only fires once the user is authenticated.
export const useAiAvailability = (graphqlRequestClient: any, enabled: boolean) =>
    useQuery<AiAvailabilityResponse>({
        queryKey: ['aiAvailability'],
        queryFn: () => graphqlRequestClient.request(AI_AVAILABILITY_QUERY),
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
        mutationFn: (variables: AiChatVariables) =>
            graphqlRequestClient.request(AI_CHAT_MUTATION, variables),
        onSuccess: options?.onSuccess,
        onError: options?.onError
    });

// ---------------------------------------------------------------- step-progress streaming (SSE)

export interface AiChatStreamEvent {
    type: 'step' | 'tool' | 'final' | 'error';
    step?: number;
    tool?: string;
    arguments?: any;
    result?: any;
    message?: string;
}

// The SSE endpoint lives on the same API host as the GraphQL endpoint.
const streamEndpoint = () =>
    (process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT ?? '').replace(/\/graphql\/?$/, '') +
    '/ai/chat/stream';

/**
 * Streaming variant of the aiChat mutation: POSTs to /ai/chat/stream and reports each progress
 * event ("step"/"tool") through `onProgress`, resolving with the final AiChatResult.
 *
 * `onStarted` fires on the FIRST received event: past that point the agent may already have run
 * tools (including mutations), so callers must NOT fall back to the non-streaming mutation — a
 * retry could re-execute writes. Fallback is only safe when the stream failed to start.
 */
export const streamAiChat = async (
    variables: AiChatVariables,
    onProgress: (event: AiChatStreamEvent) => void,
    onStarted?: () => void
): Promise<AiChatResult> => {
    const token = cookie.get('token');
    if (!token) {
        throw new Error('Not authenticated');
    }
    // Mirror the fake-data headers AuthContext puts on the GraphQL client, so streaming behaves the
    // same as the aiChat mutation in NEXT_PUBLIC_FAKE_DATA_ON environments (else the SSE endpoint can
    // diverge / fail there).
    const headers: Record<string, string> = {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`
    };
    if (IS_FAKE) {
        headers['X-API-fake'] = 'fake';
        if (IS_SAME_SEED) headers['X-API-seed'] = 'same';
    }
    const response = await fetch(streamEndpoint(), {
        method: 'POST',
        headers,
        body: JSON.stringify(variables)
    });
    if (!response.ok || !response.body) {
        throw new Error(`AI stream failed (${response.status})`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let started = false;
    let final: AiChatResult | null = null;

    const handleEvent = (event: AiChatStreamEvent) => {
        if (!started) {
            started = true;
            onStarted?.();
        }
        if (event.type === 'error') {
            throw new Error(event.message || 'AI stream error');
        }
        if (event.type === 'final' && event.result) {
            final = {
                message: event.result.message,
                steps: event.result.steps,
                documents: event.result.documents ?? [],
                // The raw agent result uses snake_case (unlike the camelCased GraphQL payload); the
                // stream endpoint injects conversationId camelCased, but accept both to be safe.
                toolCalls: event.result.tool_calls ?? [],
                conversationId: event.result.conversationId ?? event.result.conversation_id ?? null,
                proposedActions: event.result.proposed_actions ?? null,
                charts: event.result.charts ?? []
            };
            return;
        }
        onProgress(event);
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
            throw new Error('AI stream ended without a final event');
        }
        return final;
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
