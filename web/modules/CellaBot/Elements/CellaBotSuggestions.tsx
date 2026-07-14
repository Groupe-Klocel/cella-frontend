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
import { BulbOutlined } from '@ant-design/icons';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Tag } from 'antd';
import { AiUiContext } from 'context/CellaBotContext';
import styled from 'styled-components';
import { AiExposedDocument } from '../cellaBotApi';

const Wrapper = styled.div`
    padding: 8px 12px 4px;

    .ant-tag {
        cursor: pointer;
        margin-bottom: 6px;
        white-space: normal;
    }
`;

const Hint = styled.div`
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
    margin-bottom: 6px;
`;

interface Suggestion {
    key: string;
    label: string;
    prompt: string;
}

// Table enum values are SCREAMING_SNAKE ('PURCHASE_ORDER'); normalize for the static map below.
const normalizeEntity = (entityType?: string) => (entityType ?? '').replace(/_/g, '').toLowerCase();

/**
 * Contextual quick prompts shown while the conversation is empty: a static screen-aware set
 * (detail page / filtered list) + data-driven "generate <document>" chips from the warehouse's
 * exposed documents. Clicking a chip sends the prompt right away.
 */
const CellaBotSuggestions = ({
    context,
    exposedDocuments,
    onPick
}: {
    context: AiUiContext;
    exposedDocuments: Array<AiExposedDocument>;
    onPick: (prompt: string) => void;
}) => {
    const { t } = useTranslation();
    const tt = (key: string, def: string) => {
        const v = t(key);
        return v && v !== key ? v : def;
    };

    const suggestions: Suggestion[] = [];
    const entity = normalizeEntity(context.entityType);
    const onDetail = Boolean(context.entityId && context.entityType);
    const onList = Boolean(!context.entityId && context.entityType);

    if (onDetail) {
        suggestions.push(
            {
                key: 'explain-status',
                label: tt('common:cellabot-suggest-status', 'Explain the status of this record'),
                prompt: tt(
                    'common:cellabot-suggest-status-prompt',
                    'Explain the current status of the record I am viewing and what the next step is.'
                )
            },
            {
                key: 'summarize-record',
                label: tt('common:cellabot-suggest-record', 'Summarize this record'),
                prompt: tt(
                    'common:cellabot-suggest-record-prompt',
                    'Summarize the record I am viewing, including its most important related data.'
                )
            }
        );
        if (entity === 'delivery') {
            suggestions.push({
                key: 'delivery-blocking',
                label: tt('common:cellabot-suggest-blocking', 'What is blocking shipment?'),
                prompt: tt(
                    'common:cellabot-suggest-blocking-prompt',
                    'Is anything blocking the shipment of this delivery? Check its lines and boxes.'
                )
            });
        }
        if (entity === 'article') {
            suggestions.push({
                key: 'article-stock',
                label: tt('common:cellabot-suggest-stock', 'Where is this article stored?'),
                prompt: tt(
                    'common:cellabot-suggest-stock-prompt',
                    'Show the stock of this article: quantities and locations.'
                )
            });
        }
    } else if (onList) {
        suggestions.push(
            {
                key: 'summarize-list',
                label: tt('common:cellabot-suggest-list', 'Summarize the current list'),
                prompt: tt(
                    'common:cellabot-suggest-list-prompt',
                    'Summarize the list I am viewing (with its current filters): how many records, notable patterns.'
                )
            },
            {
                key: 'list-anomalies',
                label: tt('common:cellabot-suggest-anomalies', 'Any anomalies in this list?'),
                prompt: tt(
                    'common:cellabot-suggest-anomalies-prompt',
                    'Look at the list I am viewing and point out anomalies or records needing attention.'
                )
            }
        );
    } else {
        suggestions.push({
            key: 'capabilities',
            label: tt('common:cellabot-suggest-help', 'What can you do?'),
            prompt: tt(
                'common:cellabot-suggest-help-prompt',
                'What can you help me with in CELLA? Give concrete examples.'
            )
        });
    }

    (exposedDocuments ?? [])
        .filter((d): d is AiExposedDocument & { documentName: string } => Boolean(d?.documentName))
        .slice(0, 2)
        .forEach((doc) => {
            suggestions.push({
                key: `doc-${doc.documentName}`,
                label: `${tt('common:cellabot-suggest-generate', 'Generate')} ${doc.documentName}`,
                prompt: `${tt(
                    'common:cellabot-suggest-generate-prompt',
                    'Generate the document'
                )} "${doc.documentName}"${
                    onDetail
                        ? ` ${tt('common:cellabot-suggest-generate-for-record', 'for the record I am viewing')}`
                        : ''
                }.`
            });
        });

    if (suggestions.length === 0) return null;

    return (
        <Wrapper>
            <Hint>
                <BulbOutlined /> {tt('common:cellabot-suggestions', 'Suggestions')}
            </Hint>
            {suggestions.map((suggestion) => (
                <Tag
                    key={suggestion.key}
                    onClick={() => onPick(suggestion.prompt)}
                    // Clickable chips must be reachable and activatable by keyboard / assistive tech.
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onPick(suggestion.prompt);
                        }
                    }}
                    style={{ cursor: 'pointer' }}
                >
                    {suggestion.label}
                </Tag>
            ))}
        </Wrapper>
    );
};

export default CellaBotSuggestions;
