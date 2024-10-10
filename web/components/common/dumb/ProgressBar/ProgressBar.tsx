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
import { FC, ReactNode, useState } from 'react';
import styled from 'styled-components';

export interface IProgressBarProps {
    value?: number;
}

const StyledProgressWrapper = styled.div`
    background-color: #eaeaea;
    border-radius: 5px;
    position: relative;
    margin: 15px auto;
    height: 20px;
    width: 90%;
`;

const StyledDivProgressDone = styled.div`
    background: linear-gradient(to left, #7cf270, #c3ff72);
    box-shadow:
        0 1px 1px -3px #7cf270,
        0 1px 3px #7cf270;
    border-radius: 5px;
    color: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 0;
    opacity: 0;
    transition: 1s ease 0.3s;
    position: absolute;
    z-index: 1;
`;

const StyledDivValue = styled.div`
    z-index: 100;
    position: relative;
    text-align: center;
`;

const ProgressBar: FC<IProgressBarProps> = ({ value }: IProgressBarProps) => {
    const [style, setStyle] = useState({});

    setTimeout(() => {
        const newStyle = {
            opacity: 1,
            width: `${value}%`
        };

        setStyle(newStyle);
    }, 100);

    return (
        <StyledProgressWrapper>
            <StyledDivProgressDone style={style} />
            <StyledDivValue>{value}%</StyledDivValue>
        </StyledProgressWrapper>
    );
};

ProgressBar.displayName = 'ProgressBar';

ProgressBar.defaultProps = {
    value: 0
};

export { ProgressBar };
