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
import { FC, ReactNode } from 'react';
import styled from 'styled-components';

const StyledAuthLayout = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    height: 100vh;
    background-color: #f9c834;
`;

export interface IAuthLayoutProps {
    children?: ReactNode;
}

const AuthLayout: FC<IAuthLayoutProps> = ({ children }: IAuthLayoutProps) => {
    return <StyledAuthLayout>{children}</StyledAuthLayout>;
};

export const getLayout = (page: any) => <AuthLayout>{page}</AuthLayout>;

export default AuthLayout;
