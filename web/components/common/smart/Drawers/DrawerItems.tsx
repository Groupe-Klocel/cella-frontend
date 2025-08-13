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
import { Button, Drawer, Space } from 'antd';
import { useDrawerDispatch, useDrawerState } from 'context/DrawerContext';
import React, { useCallback } from 'react';
import { useTranslationWithFallback as useTranslation } from '@helpers';

interface DrawerItemsProps {
    size?: number | string;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    title: string;
    cancelButton?: boolean;
    comfirmButton?: boolean;
    cancelButtonTitle?: string;
    comfirmButtonTitle?: string;
    content?: React.ReactNode;
    onComfirm?: () => void;
    onCancel?: () => void;
}

const DrawerItems: React.FC<DrawerItemsProps> = (props) => {
    const {
        size,
        isOpen,
        setIsOpen,
        title,
        cancelButton,
        comfirmButton,
        cancelButtonTitle,
        comfirmButtonTitle,
        content,
        onComfirm,
        onCancel
    } = props;

    const { t } = useTranslation();

    return (
        <Drawer
            onClose={() => {
                setIsOpen(false);
            }}
            open={isOpen}
            title={t(title)}
            destroyOnClose={false}
            width={size}
            placement="right"
            motion={{
                motionName: 'ant-slide-right'
            }}
            extra={
                <Space>
                    {cancelButton ? (
                        <Button onClick={onCancel}>{t(cancelButtonTitle ?? '')} </Button>
                    ) : null}
                    {comfirmButton ? (
                        <Button onClick={onComfirm} type="primary">
                            {t(comfirmButtonTitle ?? '')}{' '}
                        </Button>
                    ) : null}
                </Space>
            }
        >
            {content}
        </Drawer>
    );
};

DrawerItems.displayName = 'DrawerItems';

export { DrawerItems };
