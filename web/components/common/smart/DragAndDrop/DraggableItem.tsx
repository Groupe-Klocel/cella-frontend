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
