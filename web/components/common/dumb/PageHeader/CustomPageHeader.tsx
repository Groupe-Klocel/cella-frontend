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
import { Typography, Space, Button, Avatar } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

interface CustomPageHeaderProps {
    title: string;
    subTitle?: React.ReactNode;
    onBack?: () => void;
    extra?: React.ReactNode;
    avatar?: string;
    breadcrumb?: React.ReactNode;
    tags?: any;
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
            {/* Title row (layout rules in styles/globals.css, `.custom-header-*`): the title block
                and the action buttons share one flex row that wraps. On a desktop the actions sit
                at the right of the title, or drop under it right-aligned when the two do not fit
                side by side; under 768px (phone, narrow window) they take a full-width row whose
                buttons wrap. The former `float: right` block overflowed the viewport - and got
                clipped on its left - as soon as the buttons were wider than the screen. */}
            <div className="custom-header-main">
                <Space align="start" className="custom-header-title">
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
                {extra && <div className="custom-header-extra">{extra}</div>}
            </div>
            {tags && <div style={{ marginBottom: '16px' }}>{tags}</div>}
            {children && <div style={{ marginBottom: '16px' }}>{children}</div>}
            {footer && <div>{footer}</div>}
        </div>
    );
};

export default CustomPageHeader;
