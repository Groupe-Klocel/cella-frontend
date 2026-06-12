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
import { SendOutlined } from '@ant-design/icons';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Button, Input } from 'antd';
import { KeyboardEvent, useState } from 'react';
import styled from 'styled-components';

const Wrapper = styled.div`
    display: flex;
    align-items: flex-end;
    gap: 8px;
    padding: 12px;
    border-top: 1px solid #f0f0f0;
`;

interface ICellaBotComposerProps {
    onSend: (text: string) => void;
    loading?: boolean;
    disabled?: boolean;
}

const CellaBotComposer = ({ onSend, loading, disabled }: ICellaBotComposerProps) => {
    const { t } = useTranslation();
    const tt = (key: string, def: string) => {
        const v = t(key);
        return v && v !== key ? v : def;
    };
    const [value, setValue] = useState('');

    const submit = () => {
        const text = value.trim();
        if (!text || loading || disabled) return;
        onSend(text);
        setValue('');
    };

    const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
        }
    };

    return (
        <Wrapper>
            <Input.TextArea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={tt('common:cellabot-placeholder', 'Ask CellaBot…')}
                autoSize={{ minRows: 1, maxRows: 4 }}
                disabled={disabled}
            />
            <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={submit}
                loading={loading}
                disabled={disabled || !value.trim()}
            />
        </Wrapper>
    );
};

export default CellaBotComposer;
