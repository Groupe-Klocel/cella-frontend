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
import styled from 'styled-components';

// Touch-sized variant of the app's gold/orange themed button, for the kiosk.
export const GateButton = styled(Button)`
    box-shadow: inset 0px 1px 0px 0px #f9eca0 !important;
    background: radial-gradient(circle, #f5c73d 70%, #f4a261 100%) !important;
    border: 1px solid #f5c73d !important;
    color: #000000 !important;
    font-size: 18px !important;
    font-weight: 600;
    height: auto !important;
    min-height: 54px;
    white-space: normal !important;
    width: 100%;

    &:hover,
    &:focus {
        background: #f5c73d !important;
        border-color: #f5c73d !important;
        color: #000000 !important;
    }
    &:active {
        transform: translateY(1px);
        box-shadow: inset 0px 2px 4px 0px rgba(0, 0, 0, 0.3) !important;
    }
    &:disabled {
        background: #f5f5f5 !important;
        border-color: #d9d9d9 !important;
        color: rgba(0, 0, 0, 0.25) !important;
    }
`;
