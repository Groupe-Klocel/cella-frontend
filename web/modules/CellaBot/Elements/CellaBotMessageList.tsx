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
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Empty } from 'antd';
import { AiChatMessage } from 'context/CellaBotContext';
import { useEffect, useRef } from 'react';
import styled from 'styled-components';
import CellaBotMessage from './CellaBotMessage';

const Scroller = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 16px 12px 8px;
    display: flex;
    flex-direction: column;
`;

const CellaBotMessageList = ({
    messages,
    onProposalDecision
}: {
    messages: Array<AiChatMessage>;
    onProposalDecision?: (index: number, confirmed: boolean) => void;
}) => {
    const { t } = useTranslation();
    const tt = (key: string, def: string) => {
        const v = t(key);
        return v && v !== key ? v : def;
    };
    const bottomRef = useRef<HTMLDivElement>(null);

    // Keep the latest message in view as the conversation grows.
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    if (messages.length === 0) {
        return (
            <Scroller style={{ justifyContent: 'center' }}>
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={tt(
                        'common:cellabot-empty',
                        'Ask CellaBot about what you are viewing.'
                    )}
                />
            </Scroller>
        );
    }

    return (
        <Scroller>
            {messages.map((message, idx) => (
                <CellaBotMessage
                    key={idx}
                    message={message}
                    onProposalDecision={
                        onProposalDecision
                            ? (confirmed: boolean) => onProposalDecision(idx, confirmed)
                            : undefined
                    }
                />
            ))}
            <div ref={bottomRef} />
        </Scroller>
    );
};

export default CellaBotMessageList;
