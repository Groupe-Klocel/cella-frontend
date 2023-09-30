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
import { Layout } from 'antd';
import React, { FC, ReactNode } from 'react';
import styled from 'styled-components';

const StyledAppContent = styled(Layout.Content)`
overflow-y: auto;
scrollbar-width: auto;
scrollbar-color: #8f54a0 #ffffff;
&::-webkit-scrollbar {
    width: 14px;
  }

&::-webkit-scrollbar-track {
    background: #ffffff;
  }

&::-webkit-scrollbar-thumb {
    background-color: #262630;
    border-radius: 10px;
    border: 3px solid #ffffff;
  }
`

export interface IAppContentProps {
  children?: ReactNode
}


const AppContent: FC<IAppContentProps> = ({ children }: IAppContentProps) => {

  return (
    <StyledAppContent>
      {children}
    </StyledAppContent>
  )
}

AppContent.displayName = 'AppContent'

export { AppContent };

