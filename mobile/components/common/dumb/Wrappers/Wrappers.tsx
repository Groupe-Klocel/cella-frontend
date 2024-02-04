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
import styled from 'styled-components';
import { Layout } from 'antd';

const WrapperForm = styled.div`
    padding: 2px 5px 2px 5px;
    margin: 2px;
`;
const WrapperStepContent = styled.div`
    margin: 40px auto;
`;
const WrapperStickyActions = styled.div`
    position: absolute;
    right: 0;
    margin-right: 15px;
    align-self: flex-end;
`;

const WrapperSlide = styled.div`
    min-height: 130px;
    padding: 2px 10px 50px 10px;
    border-radius: 5px;
    border: solid grey 1px;
    background-color: #fef5e1;
`;

const WrapperLogin = styled.div`
    display: flex;
    align-items: flex-start;
    justify-items: center;
    padding: 5%;
    padding-top: 50px;
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
    flex-direction: column;
    width: 100%;
    background: white;
    @media only screen and (min-device-width: 320px) and (min-width: 360px) and (max-device-width: 480px) {
        hr {
            margin-bottom: 0.3rem;
        }
        h4 {
            font-size: small;
        }
        height: 70%;
    }
`;

const WrapperButtons = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: stretch;
    justify-content: space-around;
    width: 100%;
    background: transparent;
    padding-top: 10px;
`;

const PageContentWrapper = styled.div`
    margin: 0px 2px;
    background: white;
    min-height: 88vh;
`;
const PageTableContentWrapper = styled(Layout.Content)`
    width: 100%;
    min-height: 50px !important;
    padding: 2px 5px;
    margin: 1px 5px;
`;

const WrapperSimple = styled.div`
    margin: 25px 10px;
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

export {
    PageContentWrapper,
    PageTableContentWrapper,
    WrapperLogin,
    WrapperForm,
    WrapperSlide,
    WrapperButtons,
    WrapperStepContent,
    WrapperStickyActions,
    WrapperSimple
};
