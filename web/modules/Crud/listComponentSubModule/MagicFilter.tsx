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
import { ThunderboltOutlined } from '@ant-design/icons';
import {
    getModesFromPermissions,
    IS_CELLABOT_ENABLED,
    showError,
    showSuccess,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { Button, Input, Modal, Tooltip } from 'antd';
import { useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import { ModeEnum } from 'generated/graphql';
import { gql } from 'graphql-request';
import { useState } from 'react';
import { useAiAvailability } from 'modules/CellaBot/cellaBotApi';

const AI_BUILD_FILTERS_MUTATION = gql`
    mutation AiBuildFilters($model: String!, $text: String!, $language: String) {
        aiBuildFilters(model: $model, text: $text, language: $language) {
            advancedFilters
            explanation
        }
    }
`;

// The per-user right gating the AI features (same as the CellaBot widget).
const CELLABOT_PERMISSION_TABLE = 'wm_cellabot';

// The backend validates the filter, but the payload is still LLM-derived JSON: keep only well-formed
// groups ({filter:[{field:{key:value}, searchType?}, ...]}) so a malformed shape can never reach the
// generic list components (buildSubOptions reads filter[0].field and would otherwise throw).
const sanitizeAiFilters = (raw: any): any[] => {
    if (!Array.isArray(raw)) return [];
    return raw.filter(
        (group: any) =>
            group &&
            Array.isArray(group.filter) &&
            group.filter.length > 0 &&
            group.filter.every(
                (predicate: any) =>
                    predicate &&
                    typeof predicate === 'object' &&
                    !Array.isArray(predicate) &&
                    predicate.field &&
                    typeof predicate.field === 'object' &&
                    // `typeof [] === 'object'`, and `Object.keys(['x']).length === 1`, so an array
                    // field (e.g. `field: []` / `['x']`) would otherwise pass the single-key check
                    // below — exclude arrays explicitly.
                    !Array.isArray(predicate.field) &&
                    // Exactly one field key: downstream (buildSubOptions, tag rendering) only reads the
                    // first key, so a multi-key predicate would silently drop conditions.
                    Object.keys(predicate.field).length === 1
            )
    );
};

/**
 * "Magic filter": a wand button next to the Advanced Filters — the user describes the rows in
 * natural language ("late deliveries for carrier X created this week"), the AI returns the
 * advancedFilters JSON (validated server-side against the model's fields, custom x fields
 * included) and `onApply` applies it like a hand-built advanced filter. Self-gated by the same
 * conditions as CellaBot (env kill switch, wm_cellabot READ, warehouse AI availability).
 */
const MagicFilterButton = ({
    model,
    language,
    onApply
}: {
    model: string;
    language?: string;
    onApply: (advancedFilters: any[]) => void;
}) => {
    const { t } = useTranslation();
    const tt = (key: string, def: string) => {
        const v = t(key);
        return v && v !== key ? v : def;
    };
    const { isAuthenticated, graphqlRequestClient } = useAuth();
    const { permissions } = useAppState();
    const [isOpen, setIsOpen] = useState(false);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);

    const hasCellabotRead = getModesFromPermissions(
        permissions,
        CELLABOT_PERMISSION_TABLE
    ).includes(ModeEnum.Read);
    // Shares the widget's cached availability query (same react-query key).
    const availability = useAiAvailability(
        graphqlRequestClient,
        isAuthenticated && IS_CELLABOT_ENABLED && hasCellabotRead
    );

    if (!IS_CELLABOT_ENABLED || !isAuthenticated || !hasCellabotRead) return <></>;
    if (availability.data?.aiAvailability?.enabled !== true) return <></>;

    const handleOk = async () => {
        if (!text.trim() || loading) return;
        setLoading(true);
        try {
            const response = await graphqlRequestClient.request(AI_BUILD_FILTERS_MUTATION, {
                model,
                text: text.trim(),
                language
            });
            const payload = response?.aiBuildFilters;
            const filters = sanitizeAiFilters(payload?.advancedFilters);
            if (filters.length === 0) {
                showError(
                    payload?.explanation ||
                        tt('messages:magic-filter-no-result', 'No filter could be built.')
                );
                return;
            }
            onApply(filters);
            if (payload.explanation) {
                showSuccess(payload.explanation);
            }
            setIsOpen(false);
            setText('');
        } catch (error) {
            console.error('Magic filter error:', error);
            showError(tt('messages:magic-filter-error', 'The filter could not be built.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Tooltip title={tt('common:magic-filter', 'AI filter')}>
                <Button
                    aria-label={tt('common:magic-filter', 'AI filter')}
                    icon={<ThunderboltOutlined />}
                    onClick={() => setIsOpen(true)}
                />
            </Tooltip>
            <Modal
                open={isOpen}
                title={tt('common:magic-filter', 'AI filter')}
                okText={tt('actions:apply', 'Apply')}
                cancelText={tt('actions:cancel', 'Cancel')}
                confirmLoading={loading}
                // Disable OK until there is non-whitespace input (handleOk is a no-op otherwise, which
                // reads as broken for keyboard/screen-reader users); it also stays disabled while loading.
                okButtonProps={{ disabled: !text.trim() || loading }}
                // While a request is in flight, block every close path (Cancel button, the X, Esc, mask
                // click). Otherwise cancelling mid-request would still let the resolving request call
                // onApply — applying a filter the user explicitly cancelled.
                cancelButtonProps={{ disabled: loading }}
                closable={!loading}
                keyboard={!loading}
                maskClosable={!loading}
                onOk={handleOk}
                onCancel={() => {
                    if (loading) return;
                    setIsOpen(false);
                    setText('');
                }}
                destroyOnClose
            >
                <Input.TextArea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onPressEnter={(e) => {
                        if (!e.shiftKey) {
                            e.preventDefault();
                            handleOk();
                        }
                    }}
                    rows={3}
                    autoFocus
                    placeholder={tt(
                        'common:magic-filter-placeholder',
                        'Describe the rows you want, e.g. "created this week and still in progress"'
                    )}
                />
            </Modal>
        </>
    );
};

export default MagicFilterButton;
