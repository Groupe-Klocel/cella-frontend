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
import { Spin } from 'antd';
import { FC } from 'react';
import styled from 'styled-components';

const StyledSpinWrapper = styled.div`
    display: flex;
    justify-content: center; // centers in the flex direction and the default flex-direction is row;
    margin-top: 5vh;
    height: 40vh;
`;

const UpperMobileSpinner: FC = () => {
    return (
        <StyledSpinWrapper>
            <Spin />
        </StyledSpinWrapper>
    );
};

UpperMobileSpinner.displayName = 'UpperMobileSpinner';

export { UpperMobileSpinner };
