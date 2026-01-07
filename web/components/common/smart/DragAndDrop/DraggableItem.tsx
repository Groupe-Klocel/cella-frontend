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
import { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';

// Draggable row component
export const DraggableItem = ({
    record,
    index,
    columns,
    addRow,
    moveRow,
    removeRow,
    isDragSource,
    ...restProps
}: any) => {
    const itemType = isDragSource ? 'SOURCE_ITEM' : 'DEST_ITEM';

    if (!record) return <tr {...restProps} />;

    const [{ isDragging }, drag] = useDrag({
        type: itemType,
        item: { ...record, index },
        collect: (monitor) => ({
            isDragging: monitor.isDragging()
        })
    });

    const [{ isOver }, drop] = useDrop({
        accept: ['SOURCE_ITEM', 'DEST_ITEM'],

        drop: (draggedItem: any, monitor) => {
            if (isDragSource) {
                if (monitor.getItemType() === 'DEST_ITEM') {
                    removeRow(draggedItem);
                }
            } else {
                if (monitor.getItemType() === 'SOURCE_ITEM') {
                    addRow(draggedItem, index);
                } else if (monitor.getItemType() === 'DEST_ITEM') {
                    if (draggedItem.index !== index) {
                        moveRow(draggedItem.index, index);
                    }
                }
            }
        },

        collect: (monitor) => ({
            isOver: monitor.isOver()
        })
    });

    return (
        <tr
            ref={(node) => drag(drop(node))}
            {...restProps}
            style={{ opacity: isDragging ? 0.5 : 1, cursor: 'move' }}
        >
            {columns.map((column: any) => {
                return <td key={column.key}>{record[column.key]}</td>;
            })}
        </tr>
    );
};
