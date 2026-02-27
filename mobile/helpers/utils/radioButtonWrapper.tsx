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

import React, { ReactNode } from 'react';
import { Button } from 'antd';
import { WrapperButtons, StyledButton } from '@components';

interface ButtonConfig {
    label: string;
    icon?: any;
    visibleOnSteps: number[];
    permissionsToSeeTheButton?: boolean; // Optional: if not provided, the button will be visible based on steps only
    onClick: (e?: any) => void;
    position: 'top' | 'bottom';
    style?: React.CSSProperties;
}

interface RadioButtonWrapperProps {
    currentStep: number;
    buttonManagement: ButtonConfig[];
    children: ReactNode;
}

export const RadioButtonWrapper: React.FC<RadioButtonWrapperProps> = ({
    currentStep,
    buttonManagement,
    children
}) => {
    const topButtons = buttonManagement.filter(
        (button) =>
            button.position === 'top' &&
            button.visibleOnSteps.includes(currentStep) &&
            (button.permissionsToSeeTheButton === undefined || button.permissionsToSeeTheButton)
    );
    const bottomButtons = buttonManagement.filter(
        (button) =>
            button.position === 'bottom' &&
            button.visibleOnSteps.includes(currentStep) &&
            (button.permissionsToSeeTheButton === undefined || button.permissionsToSeeTheButton)
    );

    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'stretch',
        justifyContent: 'space-around',
        width: '100%',
        background: 'transparent',
        paddingTop: '10px'
    };

    const buttonStyle: React.CSSProperties = {
        boxShadow: 'inset 0px 1px 0px 0px #f9eca0',
        background: 'radial-gradient(circle, #f5c73d 70%, #f4a261 100%)',
        border: '1px solid #f5c73d',
        color: '#000000',
        fontSize: '10px',
        maxWidth: '25%',
        margin: '2px',
        height: 'auto',
        whiteSpace: 'normal',
        minHeight: '35px',
        width: '100%',
        flexBasis: 'calc(30% - 5px)'
    };

    return (
        <>
            {topButtons.length > 0 && (
                <div style={containerStyle}>
                    {topButtons.map((button, index) => (
                        <Button
                            key={`top-${index}`}
                            icon={button.icon}
                            onClick={button.onClick}
                            style={button.style ? { ...buttonStyle, ...button.style } : buttonStyle}
                        >
                            {button.label}
                        </Button>
                    ))}
                </div>
            )}
            {children}
            {bottomButtons.length > 0 && (
                <div style={containerStyle}>
                    {bottomButtons.map((button, index) => (
                        <Button
                            key={`bottom-${index}`}
                            icon={button.icon}
                            onClick={button.onClick}
                            style={button.style ? { ...buttonStyle, ...button.style } : buttonStyle}
                        >
                            {button.label}
                        </Button>
                    ))}
                </div>
            )}
        </>
    );
};
