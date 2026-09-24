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
import { LinkButton } from '@components';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import {
    Button,
    Card,
    Divider,
    Empty,
    Input,
    InputNumber,
    Select,
    Space,
    Switch,
    Tag,
    Tooltip,
    Typography
} from 'antd';
import { FC, useEffect, useState } from 'react';
import {
    AccessDirection,
    AccessPoint,
    AccessPointKind,
    AisleColumnDrift,
    AisleDef,
    AisleSides,
    BlockedZone,
    RectShape,
    rotateAisle90
} from '../layoutModel';

// Fixed side panel mirroring the selected shape: numeric fields commit on blur/enter (one undo
// entry per edit, not per keystroke) and stay two-way bound with drag gestures on the canvas.

export type PanelSelection =
    | { kind: 'building'; id: string; name: string; rect: RectShape }
    | { kind: 'block'; id: string; name: string; rect: RectShape }
    | {
          kind: 'aisle';
          blockId: string;
          aisle: string;
          // an aisle can be laid in several stretches (a cross-aisle cuts it in two): index is
          // the stretch being edited, segmentCount how many the aisle currently has
          index: number;
          segmentCount: number;
          def: AisleDef;
          // columns read from the locations right now: null while they are not loaded (no
          // drift can be claimed then), and the drift they would produce if applied
          liveColumns: string[] | null;
          drift: AisleColumnDrift | null;
      }
    | {
          kind: 'blocked';
          blockId: string;
          id: string;
          name?: string;
          rect: RectShape;
      }
    | {
          kind: 'access';
          buildingId: string;
          point: AccessPoint;
          floorLabel: string;
          // labels of the floors this point could lead to, null when the building has none in
          // that direction (a floor access declared toward a floor that does not exist is inert)
          upperFloorLabel: string | null;
          lowerFloorLabel: string | null;
      }
    | null;

export interface IPropertiesPanelProps {
    selection: PanelSelection;
    readOnly: boolean;
    onRectChange: (patch: Partial<RectShape>) => void;
    onAisleChange: (def: AisleDef) => void;
    onAccessChange: (patch: Partial<Omit<AccessPoint, 'id'>>) => void;
    onBlockedChange: (patch: Partial<Omit<BlockedZone, 'id'>>) => void;
    onRemoveFromMap: () => void;
    onRelayAisle: () => void;
    onResyncAisle: () => void;
    onPickColumns: () => void;
    onOpen?: () => void;
}

const NumberField: FC<{
    label: string;
    value: number;
    disabled?: boolean;
    min?: number;
    onCommit: (value: number) => void;
}> = ({ label, value, disabled, min, onCommit }) => {
    const [draft, setDraft] = useState<number | null>(value);
    useEffect(() => {
        setDraft(value);
    }, [value]);
    const commit = () => {
        if (draft !== null && Number.isFinite(draft) && draft !== value) onCommit(draft);
        else setDraft(value);
    };
    return (
        <Space size={4}>
            <Typography.Text type="secondary" style={{ width: 52, display: 'inline-block' }}>
                {label}
            </Typography.Text>
            <InputNumber
                size="small"
                style={{ width: 90 }}
                value={draft}
                min={min}
                step={0.5}
                disabled={disabled}
                onChange={(newValue) => setDraft(newValue)}
                onBlur={commit}
                onPressEnter={commit}
            />
        </Space>
    );
};

const TextField: FC<{
    label: string;
    value: string;
    disabled?: boolean;
    onCommit: (value: string) => void;
}> = ({ label, value, disabled, onCommit }) => {
    const [draft, setDraft] = useState<string>(value);
    useEffect(() => {
        setDraft(value);
    }, [value]);
    const commit = () => {
        if (draft !== value) onCommit(draft);
    };
    return (
        <Space size={4}>
            <Typography.Text type="secondary" style={{ width: 52, display: 'inline-block' }}>
                {label}
            </Typography.Text>
            <Input
                size="small"
                style={{ width: 180 }}
                value={draft}
                disabled={disabled}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={commit}
                onPressEnter={commit}
            />
        </Space>
    );
};

// changing the family of an access point keeps the intent of its direction: a door you can only
// enter becomes a way up, one you can only leave becomes a way down, and both stays both
const REKINDED_DIRECTION: { [key: string]: AccessDirection } = {
    in: 'up',
    out: 'down',
    up: 'in',
    down: 'out',
    both: 'both'
};

const PropertiesPanel: FC<IPropertiesPanelProps> = ({
    selection,
    readOnly,
    onRectChange,
    onAisleChange,
    onAccessChange,
    onBlockedChange,
    onRemoveFromMap,
    onRelayAisle,
    onResyncAisle,
    onPickColumns,
    onOpen
}: IPropertiesPanelProps) => {
    const { t } = useTranslation();

    if (!selection) {
        return (
            <Card
                size="small"
                style={{ width: 280, flexShrink: 0 }}
                data-testid="cartography-properties"
            >
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={t('messages:no-selection')}
                />
            </Card>
        );
    }

    if (selection.kind === 'aisle') {
        const def = selection.def;
        const patch = (partial: Partial<AisleDef>) => onAisleChange({ ...def, ...partial });
        return (
            <Card
                // key remounts the number fields when the selection changes, so a draft typed
                // for the previous shape can never be committed onto the new one
                key={`aisle-${selection.blockId}-${selection.aisle}-${selection.index}`}
                size="small"
                title={
                    selection.segmentCount > 1
                        ? `${t('d:aisle')} ${selection.aisle} (${selection.index + 1}/${
                              selection.segmentCount
                          })`
                        : `${t('d:aisle')} ${selection.aisle}`
                }
                style={{ width: 280, flexShrink: 0 }}
                data-testid="cartography-properties"
            >
                <Space direction="vertical" size={6}>
                    <Space size={4} wrap>
                        <NumberField
                            label="X1"
                            value={def.from[0]}
                            disabled={readOnly}
                            onCommit={(value) => patch({ from: [value, def.from[1]] })}
                        />
                        <NumberField
                            label="Y1"
                            value={def.from[1]}
                            disabled={readOnly}
                            onCommit={(value) => patch({ from: [def.from[0], value] })}
                        />
                        <NumberField
                            label="X2"
                            value={def.to[0]}
                            disabled={readOnly}
                            onCommit={(value) => patch({ to: [value, def.to[1]] })}
                        />
                        <NumberField
                            label="Y2"
                            value={def.to[1]}
                            disabled={readOnly}
                            onCommit={(value) => patch({ to: [def.to[0], value] })}
                        />
                        <NumberField
                            label={t('common:pitch')}
                            value={def.pitch ?? 0}
                            disabled={readOnly}
                            min={0}
                            onCommit={(value) => patch({ pitch: value > 0 ? value : undefined })}
                        />
                        <NumberField
                            label={t('common:cell-width')}
                            value={def.cellW ?? 1.2}
                            disabled={readOnly}
                            min={0.1}
                            onCommit={(value) => patch({ cellW: value })}
                        />
                        <NumberField
                            label={t('common:cell-depth')}
                            value={def.cellD ?? 1}
                            disabled={readOnly}
                            min={0.1}
                            onCommit={(value) => patch({ cellD: value })}
                        />
                    </Space>
                    <Space size={4}>
                        <Switch
                            size="small"
                            checked={!!def.reversed}
                            disabled={readOnly}
                            onChange={(checked) => patch({ reversed: checked ? true : undefined })}
                        />
                        <span>{t('common:reversed-order')}</span>
                    </Space>
                    <Space size={4}>
                        <Typography.Text type="secondary">{t('common:pick-side')}</Typography.Text>
                        <Select
                            size="small"
                            style={{ width: 120 }}
                            value={def.sides ?? 'both'}
                            disabled={readOnly}
                            onChange={(sides: AisleSides) =>
                                patch({ sides: sides === 'both' ? undefined : sides })
                            }
                            options={[
                                { value: 'both', label: t('common:side-both') },
                                { value: 'left', label: t('common:side-left') },
                                { value: 'right', label: t('common:side-right') }
                            ]}
                        />
                    </Space>
                    <Space size={4} wrap>
                        <Typography.Text type="secondary">
                            {`${t('d:column')}: ${def.columns.length}`}
                        </Typography.Text>
                        {selection.drift ? (
                            <Tooltip
                                title={[
                                    selection.drift.added.length > 0
                                        ? `+ ${selection.drift.added.join(', ')}`
                                        : null,
                                    selection.drift.removed.length > 0
                                        ? `- ${selection.drift.removed.join(', ')}`
                                        : null
                                ]
                                    .filter(Boolean)
                                    .join(' | ')}
                            >
                                <Tag color="warning" style={{ margin: 0 }}>
                                    {`${t('common:out-of-sync')} (+${
                                        selection.drift.added.length
                                    }/-${selection.drift.removed.length})`}
                                </Tag>
                            </Tooltip>
                        ) : null}
                    </Space>
                    {!readOnly ? (
                        <>
                            <Divider style={{ margin: '8px 0' }} />
                            <Space direction="vertical" size={4}>
                                <Button
                                    size="small"
                                    onClick={() => onAisleChange(rotateAisle90(def))}
                                >
                                    {t('actions:rotate-90')}
                                </Button>
                                <Button size="small" onClick={onRelayAisle}>
                                    {t('actions:lay-aisle')}
                                </Button>
                                {/* re-open the column picker for this stretch: ticking a column
                                    off leaves it to another stretch (or unplaced), ticking one on
                                    takes it away from the stretch that holds it */}
                                <Button size="small" onClick={onPickColumns}>
                                    {t('actions:choose-columns')}
                                </Button>
                                {/* redistributes the columns read from the locations along the
                                    SAME segment — never automatic: it moves where the operator
                                    is sent to pick, so it stays an explicit decision */}
                                <Button
                                    size="small"
                                    type={selection.drift ? 'primary' : 'default'}
                                    ghost={!!selection.drift}
                                    disabled={!selection.liveColumns || !selection.drift}
                                    onClick={onResyncAisle}
                                >
                                    {t('actions:resync-columns')}
                                </Button>
                                <Button size="small" danger onClick={onRemoveFromMap}>
                                    {t('actions:remove-from-map')}
                                </Button>
                            </Space>
                        </>
                    ) : null}
                </Space>
            </Card>
        );
    }

    if (selection.kind === 'blocked') {
        const rect = selection.rect;
        return (
            <Card
                key={`blocked-${selection.blockId}-${selection.id}`}
                size="small"
                title={selection.name || t('d:blocked-zone')}
                style={{ width: 280, flexShrink: 0 }}
                data-testid="cartography-properties"
            >
                <Space direction="vertical" size={6}>
                    <Typography.Text type="secondary">
                        {t('messages:blocked-zone-hint')}
                    </Typography.Text>
                    <Space size={4} wrap>
                        <NumberField
                            label={t('d:position-x')}
                            value={rect.x}
                            disabled={readOnly}
                            onCommit={(value) => onRectChange({ x: value })}
                        />
                        <NumberField
                            label={t('d:position-y')}
                            value={rect.y}
                            disabled={readOnly}
                            onCommit={(value) => onRectChange({ y: value })}
                        />
                        <NumberField
                            label={t('common:width-m')}
                            value={rect.w}
                            disabled={readOnly}
                            min={0.2}
                            onCommit={(value) => onRectChange({ w: value })}
                        />
                        <NumberField
                            label={t('common:depth-m')}
                            value={rect.d}
                            disabled={readOnly}
                            min={0.2}
                            onCommit={(value) => onRectChange({ d: value })}
                        />
                    </Space>
                    <TextField
                        label={t('d:name')}
                        value={selection.name ?? ''}
                        disabled={readOnly}
                        onCommit={(value) => onBlockedChange({ name: value || undefined })}
                    />
                    {!readOnly ? (
                        <>
                            <Divider style={{ margin: '8px 0' }} />
                            <Button size="small" danger onClick={onRemoveFromMap}>
                                {t('actions:remove-from-map')}
                            </Button>
                        </>
                    ) : null}
                </Space>
            </Card>
        );
    }

    if (selection.kind === 'access') {
        const point = selection.point;
        const isFloorAccess = point.kind === 'floor';
        // a floor access aimed at a floor the building does not have leads nowhere: say so
        // rather than drawing a chevron into the void
        const deadEnd =
            isFloorAccess &&
            [
                point.direction === 'up' || point.direction === 'both'
                    ? selection.upperFloorLabel
                    : 'ok',
                point.direction === 'down' || point.direction === 'both'
                    ? selection.lowerFloorLabel
                    : 'ok'
            ].some((target) => target === null);
        const directionOptions = isFloorAccess
            ? [
                  { value: 'up', label: t('common:access-up') },
                  { value: 'down', label: t('common:access-down') },
                  { value: 'both', label: t('common:access-up-down') }
              ]
            : [
                  { value: 'in', label: t('common:access-in') },
                  { value: 'out', label: t('common:access-out') },
                  { value: 'both', label: t('common:access-in-out') }
              ];
        return (
            <Card
                key={`access-${selection.buildingId}-${point.id}`}
                size="small"
                title={point.name || t('d:access-point')}
                style={{ width: 280, flexShrink: 0 }}
                data-testid="cartography-properties"
            >
                <Space direction="vertical" size={6}>
                    <Space size={4}>
                        <Typography.Text type="secondary">{t('d:type')}</Typography.Text>
                        <Select
                            size="small"
                            style={{ width: 170 }}
                            value={point.kind}
                            disabled={readOnly}
                            onChange={(kind: AccessPointKind) =>
                                onAccessChange({
                                    kind,
                                    direction: REKINDED_DIRECTION[point.direction] ?? 'both'
                                })
                            }
                            options={[
                                { value: 'building', label: t('common:access-building') },
                                { value: 'floor', label: t('common:access-floor') }
                            ]}
                        />
                    </Space>
                    <Space size={4}>
                        <Typography.Text type="secondary">{t('common:direction')}</Typography.Text>
                        <Select
                            size="small"
                            style={{ width: 170 }}
                            value={point.direction}
                            disabled={readOnly}
                            onChange={(direction: AccessDirection) => onAccessChange({ direction })}
                            options={directionOptions}
                        />
                    </Space>
                    <TextField
                        label={t('d:name')}
                        value={point.name ?? ''}
                        disabled={readOnly}
                        onCommit={(value) => onAccessChange({ name: value || undefined })}
                    />
                    <Space size={4} wrap>
                        <NumberField
                            label={t('d:position-x')}
                            value={point.x}
                            disabled={readOnly}
                            onCommit={(value) => onAccessChange({ x: value })}
                        />
                        <NumberField
                            label={t('d:position-y')}
                            value={point.y}
                            disabled={readOnly}
                            onCommit={(value) => onAccessChange({ y: value })}
                        />
                    </Space>
                    <Typography.Text type="secondary">
                        {`${t('common:floor')}: ${selection.floorLabel}`}
                    </Typography.Text>
                    {isFloorAccess ? (
                        <Typography.Text type="secondary">
                            {`${t('common:access-mirrored')}: ${
                                [
                                    point.direction === 'up' || point.direction === 'both'
                                        ? selection.upperFloorLabel
                                        : null,
                                    point.direction === 'down' || point.direction === 'both'
                                        ? selection.lowerFloorLabel
                                        : null
                                ]
                                    .filter(Boolean)
                                    .join(', ') || '-'
                            }`}
                        </Typography.Text>
                    ) : null}
                    {deadEnd ? (
                        <Tag color="warning" style={{ whiteSpace: 'normal' }}>
                            {t('messages:no-adjacent-floor')}
                        </Tag>
                    ) : null}
                    {!readOnly ? (
                        <>
                            <Divider style={{ margin: '8px 0' }} />
                            <Button size="small" danger onClick={onRemoveFromMap}>
                                {t('actions:remove-from-map')}
                            </Button>
                        </>
                    ) : null}
                </Space>
            </Card>
        );
    }

    const rect = selection.rect;
    const detailPath =
        selection.kind === 'building' ? `/buildings/${selection.id}` : `/blocks/${selection.id}`;

    return (
        <Card
            key={`${selection.kind}-${selection.id}`}
            size="small"
            title={selection.name}
            style={{ width: 280, flexShrink: 0 }}
            data-testid="cartography-properties"
        >
            <Space direction="vertical" size={6}>
                <Space size={4} wrap>
                    <NumberField
                        label={t('d:position-x')}
                        value={rect.x}
                        disabled={readOnly}
                        onCommit={(value) => onRectChange({ x: value })}
                    />
                    <NumberField
                        label={t('d:position-y')}
                        value={rect.y}
                        disabled={readOnly}
                        onCommit={(value) => onRectChange({ y: value })}
                    />
                    <NumberField
                        label={t('common:width-m')}
                        value={rect.w}
                        disabled={readOnly}
                        min={0.5}
                        onCommit={(value) => onRectChange({ w: value })}
                    />
                    <NumberField
                        label={t('common:depth-m')}
                        value={rect.d}
                        disabled={readOnly}
                        min={0.5}
                        onCommit={(value) => onRectChange({ d: value })}
                    />
                </Space>
                <Divider style={{ margin: '8px 0' }} />
                <Space direction="vertical" size={4}>
                    {onOpen ? (
                        <Button size="small" type="primary" ghost onClick={onOpen}>
                            {t('actions:open')}
                        </Button>
                    ) : null}
                    <LinkButton title={t('common:detail')} path={detailPath} />
                    {!readOnly ? (
                        <Button size="small" danger onClick={onRemoveFromMap}>
                            {t('actions:remove-from-map')}
                        </Button>
                    ) : null}
                </Space>
            </Space>
        </Card>
    );
};

PropertiesPanel.displayName = 'PropertiesPanel';

export { PropertiesPanel };
