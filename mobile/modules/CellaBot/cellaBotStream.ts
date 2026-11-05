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

// Streaming client of the CELLA AI chat (POST /ai/chat/stream, Server-Sent Events) for the handheld.
// Mirror of the web's web/modules/CellaBot/cellaBotApi.ts `streamAiChat` (the two apps share no
// code): same events, same error kinds. Keep both in step when the backend contract changes.

export interface MobileChatVariables {
    prompt: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    context?: any;
    readOnly?: boolean;
    conversationId?: string | null;
}

export interface MobileChatResult {
    message?: string | null;
    conversationId?: string | null;
}

export interface MobileChatStreamEvent {
    type: 'step' | 'tool' | 'documents' | 'delta' | 'final' | 'error';
    step?: number;
    tool?: string;
    text?: string;
    message?: string;
    result?: any;
}

// Why a turn failed (a discriminant rather than Error subclasses: the app compiles to ES5).
// - rejected:   refused before the stream opened (403/422/429) with a safe `{error}` message;
// - notStarted: the stream could not be opened for another reason — the mutation fallback is safe;
// - aborted:    the operator stopped the turn;
// - server:     an `error` event after the stream opened (safe wording from the backend);
// - incomplete: the stream ended without its `final` event.
export type MobileChatErrorKind = 'rejected' | 'notStarted' | 'aborted' | 'server' | 'incomplete';

const chatError = (kind: MobileChatErrorKind, message: string, status?: number) =>
    Object.assign(new Error(message), { cellaBotKind: kind, status });

export const chatErrorKind = (error: any): MobileChatErrorKind | undefined => error?.cellaBotKind;

// Coded API errors whose wording comes from the `errors:<code>` DB translations: AI disabled for the
// warehouse, AI provider failure, daily token budget used up, missing wm_cellabot permission.
const TRANSLATED_ERROR_CODES = ['AI-000100', 'AI-000110', 'AI-000130', 'APP-000200'];

/**
 * The message to show for a failed turn: the translated wording of a known API error code, else the
 * server's own (safe) message, else a generic one.
 */
export const chatErrorMessage = (error: any, tt: (key: string, def: string) => string): string => {
    const generic = tt('common:cellabot-error', 'Sorry, something went wrong.');
    switch (chatErrorKind(error)) {
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

// The SSE endpoint lives on the same API host as the GraphQL endpoint.
const streamEndpoint = () =>
    (process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT ?? '').replace(/\/graphql\/?$/, '') +
    '/ai/chat/stream';

const REJECTED_STATUSES = [403, 422, 429];

/**
 * POST the turn to /ai/chat/stream with token streaming on; report progress (`step` / `tool` /
 * `documents`) and answer pieces (`delta`) through the handlers, resolve with the final result.
 * Past the first event (`onStarted`) the turn must never be re-sent through the mutation.
 */
export const streamMobileChat = async (
    variables: MobileChatVariables,
    handlers: {
        onProgress?: (event: MobileChatStreamEvent) => void;
        onDelta?: (text: string) => void;
        onStarted?: () => void;
    },
    signal?: AbortSignal
): Promise<MobileChatResult> => {
    const token = cookie.get('token');
    if (!token) throw chatError('notStarted', 'Not authenticated');
    // Same fake-data headers as the GraphQL client (AuthContext).
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
            body: JSON.stringify({ ...variables, streamTokens: true }),
            signal
        });
    } catch (error: any) {
        if (signal?.aborted) throw chatError('aborted', 'Stopped');
        throw chatError('notStarted', String(error?.message ?? error));
    }
    if (!response.ok || !response.body) {
        if (REJECTED_STATUSES.includes(response.status)) {
            let message = '';
            try {
                const body = await response.json();
                message = typeof body?.error === 'string' ? body.error : '';
            } catch (e) {
                /* not JSON: keep the generic message */
            }
            throw chatError('rejected', message, response.status);
        }
        throw chatError('notStarted', `AI stream failed (${response.status})`, response.status);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let started = false;
    let final: MobileChatResult | null = null;

    const handleEvent = (event: MobileChatStreamEvent) => {
        if (!started) {
            started = true;
            handlers.onStarted?.();
        }
        switch (event.type) {
            case 'error':
                throw chatError('server', event.message || '');
            case 'delta':
                if (event.text) handlers.onDelta?.(event.text);
                return;
            case 'final':
                if (event.result) {
                    final = {
                        message: event.result.message,
                        conversationId:
                            event.result.conversationId ?? event.result.conversation_id ?? null
                    };
                }
                return;
            default:
                handlers.onProgress?.(event);
        }
    };

    // One SSE frame ("data: <json>"); the space after 'data:' is optional per spec.
    const drainFrame = (raw: string) => {
        const line = raw.split('\n').find((l) => l.startsWith('data:'));
        if (!line) return;
        let event: MobileChatStreamEvent;
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
            // Proxies may rewrite the separator to \r\n\r\n; payloads never carry a raw CR.
            buffer += decoder.decode(value, { stream: true }).replace(/\r/g, '');
            let separator;
            while ((separator = buffer.indexOf('\n\n')) >= 0) {
                const raw = buffer.slice(0, separator);
                buffer = buffer.slice(separator + 2);
                drainFrame(raw);
            }
        }
        // A last frame not terminated by a blank line (often `final`).
        buffer += decoder.decode().replace(/\r/g, '');
        if (buffer.trim()) drainFrame(buffer);
        if (!final) {
            // Closed without a single event: the agent never reported starting, so the turn is
            // still safe to re-send through the mutation.
            throw started
                ? chatError('incomplete', 'AI stream ended without a final event')
                : chatError('notStarted', 'AI stream closed without any event');
        }
        return final;
    } catch (error: any) {
        if (signal?.aborted) throw chatError('aborted', 'Stopped');
        if (chatErrorKind(error)) throw error;
        throw started
            ? chatError('incomplete', String(error?.message ?? error))
            : chatError('notStarted', String(error?.message ?? error));
    } finally {
        try {
            await reader.cancel();
        } catch (e) {
            /* already closed */
        }
    }
};
