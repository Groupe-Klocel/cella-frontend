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
    FileExcelOutlined,
    FileImageOutlined,
    FilePdfOutlined,
    FileTextOutlined
} from '@ant-design/icons';
import { Tag, Tooltip } from 'antd';
import { attachmentKind, formatBytes } from '../cellaBotAttachments';

const ICONS = {
    pdf: <FilePdfOutlined />,
    image: <FileImageOutlined />,
    spreadsheet: <FileExcelOutlined />,
    text: <FileTextOutlined />
};

/** A file attached to a turn: type icon, name and size. Closable while it is only staged. */
const CellaBotAttachmentChip = ({
    filename,
    size,
    mediaType,
    onRemove
}: {
    filename: string;
    size?: number;
    mediaType?: string;
    onRemove?: () => void;
}) => (
    <Tooltip title={filename}>
        <Tag
            icon={ICONS[attachmentKind(filename, mediaType)]}
            closable={Boolean(onRemove)}
            onClose={(e) => {
                e.preventDefault();
                onRemove?.();
            }}
            aria-label={filename}
            style={{ maxWidth: '100%', marginInlineEnd: 4, marginBottom: 4 }}
        >
            <span
                style={{
                    display: 'inline-block',
                    maxWidth: 180,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    verticalAlign: 'bottom'
                }}
            >
                {filename}
            </span>
            {size ? <span style={{ opacity: 0.6, marginLeft: 4 }}>{formatBytes(size)}</span> : null}
        </Tag>
    </Tooltip>
);

export default CellaBotAttachmentChip;
