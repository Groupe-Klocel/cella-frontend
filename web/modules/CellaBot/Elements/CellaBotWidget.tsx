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
import { CommentOutlined, DeleteOutlined, RobotOutlined } from '@ant-design/icons';
import {
    getModesFromPermissions,
    IS_CELLABOT_ENABLED,
    showError,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { Button, ConfigProvider, Drawer, FloatButton, Space, Tooltip } from 'antd';
import { useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import { AiChatMessage, useAiContextStore, useCellaBotChat } from 'context/CellaBotContext';
import { ModeEnum } from 'generated/graphql';
import styled from 'styled-components';
import { AiChatHistoryEntry, useAiAvailability, useAiChat } from '../cellaBotApi';
import { CELLA_ON_YELLOW, CELLA_YELLOW } from '../cellaBotColors';
import CellaBotComposer from './CellaBotComposer';
import CellaBotMessageList from './CellaBotMessageList';

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
    const { isAuthenticated, graphqlRequestClient } = useAuth();
    const { permissions } = useAppState();
    const { aiContext } = useAiContextStore();
    const { isOpen, open, close, messages, setMessages, clearMessages } = useCellaBotChat();

    // Third gate: the user must hold the wm_cellabot permission in READ mode.
    const hasCellabotRead = getModesFromPermissions(
        permissions,
        CELLABOT_PERMISSION_TABLE
    ).includes(ModeEnum.Read);

    // Only query availability when authenticated, the env kill switch is on, AND the user is allowed.
    const availability = useAiAvailability(
        graphqlRequestClient,
        isAuthenticated && IS_CELLABOT_ENABLED && hasCellabotRead
    );
    const chat = useAiChat(graphqlRequestClient);

    const handleSend = (text: string) => {
        // History = the completed conversation so far ({ role, content } only).
        const history: Array<AiChatHistoryEntry> = messages
            .filter((m) => !m.pending && !m.error)
            .map((m) => ({ role: m.role, content: m.content }));

        const userMessage: AiChatMessage = { role: 'user', content: text };
        const pendingMessage: AiChatMessage = { role: 'assistant', content: '', pending: true };
        setMessages((prev) => [...prev, userMessage, pendingMessage]);

        chat.mutate(
            { prompt: text, history, context: aiContext },
            {
                onSuccess: (data) => {
                    const result = data?.aiChat;
                    setMessages((prev) => [
                        ...prev.filter((m) => !m.pending),
                        {
                            role: 'assistant',
                            content: result?.message ?? '',
                            toolCalls: result?.toolCalls ?? [],
                            documents: result?.documents ?? []
                        }
                    ]);
                },
                onError: () => {
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.pending
                                ? {
                                      role: 'assistant',
                                      content: tt(
                                          'common:cellabot-error',
                                          'Sorry, something went wrong. Please try again.'
                                      ),
                                      error: true
                                  }
                                : m
                        )
                    );
                    showError(tt('common:cellabot-error', 'Sorry, something went wrong.'));
                }
            }
        );
    };

    // Show only when ALL gates pass: env kill switch on, authenticated, the user holds the
    // wm_cellabot READ right, and AI is enabled for the warehouse.
    if (!IS_CELLABOT_ENABLED) return null;
    if (!isAuthenticated) return null;
    if (!hasCellabotRead) return null;
    if (availability.data?.aiAvailability?.enabled !== true) return null;

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
                    <Tooltip title={tt('common:cellabot-new', 'New conversation')}>
                        <Button
                            type="text"
                            icon={<DeleteOutlined />}
                            onClick={clearMessages}
                            disabled={messages.length === 0}
                        />
                    </Tooltip>
                }
            >
                <Body>
                    <CellaBotMessageList messages={messages} />
                    <CellaBotComposer onSend={handleSend} loading={chat.isPending} />
                </Body>
            </Drawer>
        </ConfigProvider>
    );
};

export default CellaBotWidget;
