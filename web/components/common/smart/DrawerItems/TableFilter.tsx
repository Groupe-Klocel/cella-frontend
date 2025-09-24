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
import { EyeInvisibleTwoTone, EyeTwoTone } from '@ant-design/icons';
import { isVisible, MyColumnType, setCustomColumnsProps, showWarning } from '@helpers';
import { Button, Space, Table } from 'antd';
import Text from 'antd/lib/typography/Text';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, Key, ClassAttributes, HTMLAttributes } from 'react';
import { SortableContainer, SortableElement, SortableHandle } from 'react-sortable-hoc';
import { arrayMoveImmutable } from 'array-move';
import { MenuOutlined } from '@ant-design/icons';

export interface ITableFilterProps {
    allColumnsInfos: any; //need to find what is wrong with this MyColumnType[],
    setAllColumnsInfos: Function;
}

interface Iindex {
    oldIndex: number;
    newIndex: number;
}

const DragHandle = SortableHandle(() => <MenuOutlined style={{ cursor: 'grab', color: '#999' }} />);
const SortableItem = SortableElement(
    (
        props: JSX.IntrinsicAttributes &
            ClassAttributes<HTMLTableRowElement> &
            HTMLAttributes<HTMLTableRowElement>
    ) => <tr {...props} />
);
const SortableBody = SortableContainer(
    (
        props: JSX.IntrinsicAttributes &
            ClassAttributes<HTMLTableSectionElement> &
            HTMLAttributes<HTMLTableSectionElement>
    ) => <tbody {...props} />
);

const TableFilter: FC<ITableFilterProps> = ({ allColumnsInfos, setAllColumnsInfos }) => {
    const { t } = useTranslation();

    async function handleVisibleChange(key: Key) {
        setAllColumnsInfos((prev: any) => {
            const newState = prev.map((obj: any) => {
                // change isVisible to true
                if (obj.dataIndex === key) {
                    return { ...obj, hidden: !obj.hidden };
                }
                return obj;
            });
            return newState;
        });
    }

    // rowSelection object indicates the need for row selection
    const fixedSelection = {
        selectedRowKeys: allColumnsInfos
            .filter((col: any) => col.fixed === true)
            .map((el: any) => el.dataIndex),
        onChange: (selectedRowKeys: Key[]) => {
            let tempColumns = allColumnsInfos;
            tempColumns = allColumnsInfos.map((obj: any) => {
                // change fixed to true
                if (selectedRowKeys.some((r) => obj.dataIndex === r)) {
                    return { ...obj, fixed: true };
                } else {
                    return { ...obj, fixed: false };
                }
            });
            setAllColumnsInfos(tempColumns);
        },
        getCheckboxProps: (record: MyColumnType) => ({
            disabled: record?.disabled // Column configuration not to be checked
        })
    };

    const columns = [
        {
            title: t('actions:fixed'),
            key: 'fixed',
            width: '1%' // width to minimum possible
        },
        {
            title: t('actions:show-hide'),
            key: 'show-hide',
            render: (record: { title: string; key: Key }) => (
                <Space>
                    <Button
                        shape="circle"
                        icon={
                            allColumnsInfos.filter((col: any) => col.dataIndex === record.key)[0]
                                .hidden ? (
                                <EyeInvisibleTwoTone />
                            ) : (
                                <EyeTwoTone />
                            )
                        }
                        onClick={() => handleVisibleChange(record.key)}
                    />
                    <Text>{t(record.title)}</Text>
                </Space>
            )
        },
        {
            title: t('actions:sort'),
            dataIndex: 'sort',
            width: 30,
            className: 'drag-visible',
            render: () => <DragHandle />
        }
    ];

    const onSortEnd = ({ oldIndex, newIndex }: Iindex) => {
        if (oldIndex !== newIndex) {
            const newData = arrayMoveImmutable(
                [].concat(allColumnsInfos),
                oldIndex,
                newIndex
            ).filter((el) => !!el);
            setAllColumnsInfos(newData);
        }
    };

    const DraggableContainer = (props: any) => (
        <SortableBody
            useDragHandle
            disableAutoscroll
            helperClass="row-dragging"
            onSortEnd={onSortEnd}
            {...props}
        />
    );

    const DraggableBodyRow = ({ className, style, ...restProps }: any) => {
        // function findIndex base on Table rowKey props and should always be a right array index
        const index = allColumnsInfos.findIndex(
            (x: { dataIndex: number }) => x.dataIndex === restProps['data-row-key']
        );
        return <SortableItem className="sortableHelper" index={index} {...restProps} />;
    };

    return (
        <>
            <Table
                pagination={false}
                rowSelection={fixedSelection}
                columns={columns}
                dataSource={allColumnsInfos.filter((e: any) => e.key !== 'actions')}
                rowKey="dataIndex"
                components={{
                    body: {
                        wrapper: DraggableContainer,
                        row: DraggableBodyRow
                    }
                }}
            />
        </>
    );
};

TableFilter.displayName = 'TableFilter';

export { TableFilter };
