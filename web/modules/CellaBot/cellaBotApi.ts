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
import { useMutation, useQuery } from '@tanstack/react-query';
import { gql } from 'graphql-request';
import { AiUiContext } from 'context/CellaBotContext';

// The CELLA AI assistant lives behind two GraphQL operations (aiChat / aiAvailability).
// We use the runtime gql layer (graphqlRequestClient.request) rather than generated hooks —
// this is the repo's dominant data-fetching pattern (see crudHooks) and avoids re-running the
// staging-pinned codegen (which would churn generated/graphql.ts).

export const AI_AVAILABILITY_QUERY = gql`
    query AiAvailability {
        aiAvailability {
            enabled
        }
    }
`;

export const AI_CHAT_MUTATION = gql`
    mutation AiChat($prompt: String!, $history: [JSON!], $context: JSON) {
        aiChat(prompt: $prompt, history: $history, context: $context) {
            message
            steps
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

export interface AiChatResult {
    message?: string | null;
    steps?: number | null;
    documents?: Array<AiChatDocument> | null;
    toolCalls?: Array<AiChatToolCall> | null;
}

export interface AiChatHistoryEntry {
    role: 'user' | 'assistant';
    content: string;
}

export interface AiChatVariables {
    prompt: string;
    history?: Array<AiChatHistoryEntry>;
    context?: AiUiContext;
}

interface AiAvailabilityResponse {
    aiAvailability?: { enabled?: boolean | null } | null;
}

interface AiChatResponse {
    aiChat?: AiChatResult | null;
}

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
