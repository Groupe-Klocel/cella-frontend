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
import React from 'react';
import { Typography, Space, Button, Breadcrumb, Avatar, Tag } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { BreadcrumbProps } from 'antd/lib/breadcrumb';

const { Title, Paragraph } = Typography;

interface TagType {
    color: string;
    text: string;
}

interface CustomPageHeaderProps {
    title: string;
    subTitle?: React.ReactNode;
    onBack?: () => void;
    extra?: React.ReactNode;
    avatar?: string;
    breadcrumb?: React.ReactNode;
    tags?: TagType[];
    footer?: React.ReactNode;
    children?: React.ReactNode;
}

const CustomPageHeader: React.FC<CustomPageHeaderProps> = ({
    title,
    subTitle,
    onBack,
    extra,
    avatar,
    breadcrumb,
    tags,
    footer,
    children
}) => {
    return (
        <div className="custom-header">
            {breadcrumb}
            <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                <Space align="start">
                    {onBack && (
                        <Button
                            icon={<ArrowLeftOutlined />}
                            className="ant-page-header-back-button"
                            onClick={onBack}
                            type="link"
                        />
                    )}
                    {avatar && <Avatar src={avatar} />}
                    <Space direction="vertical" size={0}>
                        <Title level={4} style={{ margin: 0 }}>
                            {title}
                        </Title>
                        {subTitle && <Paragraph style={{ margin: 0 }}>{subTitle}</Paragraph>}
                    </Space>
                </Space>
                {extra && <div style={{ float: 'right' }}>{extra}</div>}
            </div>
            {tags && (
                <div style={{ marginBottom: '16px' }}>
                    {tags.map((tag, index) => (
                        <Tag key={index} color={tag.color}>
                            {tag.text}
                        </Tag>
                    ))}
                </div>
            )}
            {children && <div style={{ marginBottom: '16px' }}>{children}</div>}
            {footer && <div>{footer}</div>}
        </div>
    );
};

export default CustomPageHeader;
