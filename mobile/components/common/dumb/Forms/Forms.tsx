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
import { Button, DatePicker, Form, Input, Switch } from 'antd';
import styled from 'styled-components';

const StyledForm = styled(Form)`
    width: 100%;
`;

const StyledFormItem = styled(Form.Item)`
    margin: 2px !important;
    flex-direction: row;
    && .ant-form-item-label > label {
        height: auto !important;
    }
`;

const StyledButton = styled(Button)`
    background-color: #f4a261 !important;
    box-shadow: inset 0px 1px 0px 0px #f9eca0 !important;
    background: radial-gradient(circle, #f5c73d 70%, #f4a261 100%) !important;
    border: 1px solid #f5c73d !important;
    color: #000000 !important;
    font-size: 10px !important;
    max-width: 25%;
    margin: 2px;
    height: auto !important;
    white-space: normal !important;
    min-height: 35px;
    width: 100% auto !important;
    flex-basis: calc(30% - 5px);
`;

const NavButton = styled(Button)`
    background-color: #f4a261 !important;
    box-shadow: inset 0px 1px 0px 0px #f9eca0 !important;
    background: radial-gradient(circle, #f5c73d 10%, #fef5e1 100%) !important;
    border: 1px solid #f5c73d !important;
`;

const WrapperFeature = styled.div`
    padding: 2px 5px 2px 5px;
    margin: 2px;
    border: 1px solid;
    border-radius: 5px;
`;

const StyledFeaturesInput = styled(Input)<{ isEditable: boolean }>`
    &:disabled {
        color: black !important;
        background-color: transparent !important;
        border: none !important;
    }
`;

const StyledFeaturesDatePicker = styled(DatePicker)`
    &.ant-picker-disabled {
        background-color: transparent !important;
        border: none !important;
    }

    &.ant-picker-disabled .ant-picker-input > input {
        color: rgba(0, 0, 0, 0.88) !important;
    }

    &.ant-picker-disabled .ant-picker-suffix {
        display: none !important;
    }
`;

const StyledFeaturesFormItem = styled(StyledFormItem)`
    .ant-form-item-label > label {
        font-weight: bold;
    }
`;

const StyledRadioSwitch = styled(Switch)`
    &.ant-switch {
        width: 36px;
        height: 20px;
        min-width: 36px;
    }

    &.ant-switch .ant-switch-handle {
        width: 16px;
        height: 16px;
        top: 2px;
    }

    &.ant-switch-checked {
        background: radial-gradient(circle, #f5c73d 10%, #fef5e1 100%) !important;
    }

    &.ant-switch-checked .ant-switch-handle {
        left: calc(100% - 18px);
    }
`;

export {
    StyledForm,
    StyledFormItem,
    StyledButton,
    NavButton,
    WrapperFeature,
    StyledFeaturesInput,
    StyledFeaturesDatePicker,
    StyledFeaturesFormItem,
    StyledRadioSwitch
};
