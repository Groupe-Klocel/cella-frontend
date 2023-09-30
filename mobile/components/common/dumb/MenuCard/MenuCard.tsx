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
import { Typography } from 'antd';
import Link from 'next/link';
import { FC, ReactNode } from 'react';
import styled from 'styled-components';

const ButtonContainer = styled.div`
    align-items: center;
    justify-content: center;
    display: flex;
    flex-direction: column;
`;

const StyledButton = styled.button`
    width: 80px;
    height: 80px;
    background-color: #f4a261 !important;
    box-shadow: inset 0px 1px 0px 0px #f9eca0 !important;
    background: radial-gradient(circle, #f5c73d 50%, #f4a261 100%) !important;
    margin: 10px;
    border-radius: 30px;
    border-color: #4f4613;
`;

export interface IMenuCardProps {
    title: string;
    icon: ReactNode;
    path: string;
}
const MenuCard: FC<IMenuCardProps> = ({ title, icon, path }: IMenuCardProps) => {
    return (
        <ButtonContainer>
            <Link href={path} passHref>
                <StyledButton>{icon}</StyledButton>
            </Link>
            <Typography style={{ fontSize: '10px' }}>{title}</Typography>
        </ButtonContainer>
    );
};

MenuCard.displayName = 'MenuCard';

export { MenuCard };
