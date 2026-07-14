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
import { DeleteOutlined } from '@ant-design/icons';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Button, Empty, List, Popconfirm, Spin, Typography } from 'antd';
import styled from 'styled-components';
import { AiConversationSummary } from '../cellaBotApi';
import { CELLA_YELLOW } from '../cellaBotColors';

const Scroller = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 4px 8px;
`;

const Center = styled.div`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
`;

const Line = styled.div<{ $active?: boolean }>`
    flex: 1;
    min-width: 0;
    cursor: pointer;
    border-left: 3px solid ${(p) => (p.$active ? CELLA_YELLOW : 'transparent')};
    padding-left: 8px;
`;

// A safe, locale-aware timestamp for the conversation's `created`; blank on an unparseable value.
const formatDate = (value?: string | null): string => {
    if (!value) return '';
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? '' : parsed.toLocaleString();
};

/**
 * The user's saved CellaBot conversations: click one to continue it, or delete it. The list is
 * row-scoped server-side (a worker only ever sees their own). Rendered inside the widget drawer in
 * place of the message list when the history panel is open.
 */
const CellaBotConversationList = ({
    conversations,
    loading,
    activeId,
    onContinue,
    onDelete
}: {
    conversations: Array<AiConversationSummary>;
    loading: boolean;
    activeId: string | null;
    onContinue: (id: string) => void;
    onDelete: (id: string) => void;
}) => {
    const { t } = useTranslation();
    const tt = (key: string, def: string) => {
        const v = t(key);
        return v && v !== key ? v : def;
    };

    if (loading) {
        return (
            <Center>
                <Spin size="small" />
            </Center>
        );
    }
    if (conversations.length === 0) {
        return (
            <Center>
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={tt(
                        'common:cellabot-no-conversations',
                        'No saved conversations yet.'
                    )}
                />
            </Center>
        );
    }

    return (
        <Scroller>
            <List
                size="small"
                dataSource={conversations}
                renderItem={(conversation) => {
                    // Compute the formatted date once: it was parsed twice (guard + render), which
                    // also risked inconsistent output if locale/timezone shifted between the calls.
                    const created = formatDate(conversation.created);
                    return (
                        <List.Item
                            key={conversation.id}
                            actions={[
                                <Popconfirm
                                    key="delete"
                                    title={tt(
                                        'common:cellabot-delete-conversation-confirm',
                                        'Delete this conversation?'
                                    )}
                                    okText={tt('actions:delete', 'Delete')}
                                    cancelText={tt('actions:cancel', 'Cancel')}
                                    onConfirm={() => onDelete(conversation.id)}
                                >
                                    <Button
                                        type="text"
                                        size="small"
                                        danger
                                        icon={<DeleteOutlined />}
                                        aria-label={tt('actions:delete', 'Delete')}
                                    />
                                </Popconfirm>
                            ]}
                        >
                            <Line
                                $active={conversation.id === activeId}
                                role="button"
                                tabIndex={0}
                                onClick={() => onContinue(conversation.id)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        onContinue(conversation.id);
                                    }
                                }}
                            >
                                <Typography.Text ellipsis style={{ display: 'block' }}>
                                    {conversation.title ||
                                        tt(
                                            'common:cellabot-untitled-conversation',
                                            'Untitled conversation'
                                        )}
                                </Typography.Text>
                                {created && (
                                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                        {created}
                                    </Typography.Text>
                                )}
                            </Line>
                        </List.Item>
                    );
                }}
            />
        </Scroller>
    );
};

export default CellaBotConversationList;
