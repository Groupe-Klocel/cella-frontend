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
import {
    ExpandOutlined,
    RedoOutlined,
    ReloadOutlined,
    SaveOutlined,
    UndoOutlined,
    ZoomInOutlined,
    ZoomOutOutlined
} from '@ant-design/icons';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Badge, Button, Select, Space, Switch, Tooltip } from 'antd';
import { FC } from 'react';

export interface IEditorToolbarProps {
    readOnly: boolean;
    dirtyCount: number;
    canUndo: boolean;
    canRedo: boolean;
    snapOn: boolean;
    setSnapOn: (on: boolean) => void;
    gridStep: number;
    setGridStep: (step: number) => void;
    isSaving: boolean;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onFit: () => void;
    onUndo: () => void;
    onRedo: () => void;
    onRefresh: () => void;
    onSave: () => void;
}

const GRID_STEPS = [0.25, 0.5, 1];

const EditorToolbar: FC<IEditorToolbarProps> = ({
    readOnly,
    dirtyCount,
    canUndo,
    canRedo,
    snapOn,
    setSnapOn,
    gridStep,
    setGridStep,
    isSaving,
    onZoomIn,
    onZoomOut,
    onFit,
    onUndo,
    onRedo,
    onRefresh,
    onSave
}: IEditorToolbarProps) => {
    const { t } = useTranslation();

    return (
        <Space wrap>
            <Space.Compact>
                <Tooltip title={t('actions:zoom-in')}>
                    <Button icon={<ZoomInOutlined />} onClick={onZoomIn} />
                </Tooltip>
                <Tooltip title={t('actions:zoom-out')}>
                    <Button icon={<ZoomOutOutlined />} onClick={onZoomOut} />
                </Tooltip>
                <Tooltip title={t('actions:fit-view')}>
                    <Button icon={<ExpandOutlined />} onClick={onFit} />
                </Tooltip>
            </Space.Compact>
            {!readOnly ? (
                <>
                    <Space size={4}>
                        <Switch size="small" checked={snapOn} onChange={setSnapOn} />
                        <span>{t('common:snap-to-grid')}</span>
                        <Select
                            size="small"
                            style={{ width: 80 }}
                            value={gridStep}
                            onChange={setGridStep}
                            options={GRID_STEPS.map((step) => ({
                                value: step,
                                label: `${step} m`
                            }))}
                            disabled={!snapOn}
                        />
                    </Space>
                    <Space.Compact>
                        <Tooltip title={t('actions:undo')}>
                            <Button icon={<UndoOutlined />} onClick={onUndo} disabled={!canUndo} />
                        </Tooltip>
                        <Tooltip title={t('actions:redo')}>
                            <Button icon={<RedoOutlined />} onClick={onRedo} disabled={!canRedo} />
                        </Tooltip>
                    </Space.Compact>
                </>
            ) : null}
            <Tooltip title={t('actions:refresh')}>
                <Button icon={<ReloadOutlined />} onClick={onRefresh} />
            </Tooltip>
            {!readOnly ? (
                <Badge count={dirtyCount} size="small">
                    <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={onSave}
                        loading={isSaving}
                        disabled={dirtyCount === 0}
                        data-testid="cartography-save"
                    >
                        {t('actions:save-layout')}
                    </Button>
                </Badge>
            ) : null}
        </Space>
    );
};

EditorToolbar.displayName = 'EditorToolbar';

export { EditorToolbar };
