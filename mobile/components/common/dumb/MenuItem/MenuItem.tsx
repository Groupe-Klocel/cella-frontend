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
import { Button } from 'antd';
import Link from 'next/link';
import React, { FC, ReactNode } from 'react';
import styled from 'styled-components';
import { RightOutlined } from '@ant-design/icons';
import CSS from 'csstype';

const ButtonContainer = styled.div`
    align-items: center;
    justify-content: center;
    display: flex;
`;

const buttonStyle: CSS.Properties = {
    height: '35px',
    background: '#FEF5E1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
};

export interface IMenuItemProps {
    title: string;
    path: string;
}
const MenuItem: FC<IMenuItemProps> = ({ title, path }: IMenuItemProps) => {
    return (
        <ButtonContainer>
            <Link href={path} passHref style={{ width: '100%' }}>
                <Button block style={buttonStyle}>
                    {title}
                    <RightOutlined />
                </Button>
            </Link>
        </ButtonContainer>
    );
};

MenuItem.displayName = 'MenuItem';

export { MenuItem };
