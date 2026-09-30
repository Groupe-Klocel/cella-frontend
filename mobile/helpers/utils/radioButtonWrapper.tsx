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
import React, { ReactNode, useEffect, useRef } from 'react';
import { Button, Spin } from 'antd';
import { useAppState } from 'context/AppContext';
import { findValueByScopeAndCode } from './utils';
import { RF_SUBMIT_KEY, SUBMIT_GRACE_MS, rfButtonLock, useRfButtonLock } from './rfButtonLock';

export interface ButtonConfig {
    key?: string; // Optional stable identifier (language-independent) used to configure the button via the RF_PREPARATION_ACTION_BUTTONS parameter
    label: string;
    icon?: any;
    visibleOnSteps: number[];
    permissionsToSeeTheButton?: boolean; // Optional: if not provided, the button will be visible based on steps only
    // May return a promise: its rejection (e.g. a failed form.validateFields()) frees the buttons at once
    onClick: (e?: any) => void | Promise<unknown>;
    position: 'top' | 'bottom';
    style?: React.CSSProperties;
    // What pressing this button does to the other buttons (see rfButtonLock.ts):
    //  - undefined (default): locked while the action runs, as long as an RF spinner shows the
    //    module working; nothing shown within half a second means a local toggle, and they unlock
    //    (a form submit coming from the input itself, i.e. the scanner, gets a 3s grace instead)
    //  - true: locked until the process state changes, an error toast fires or 30s elapse, for an
    //    action that calls the API without ever rendering a spinner
    //  - false: never locks them (a pure display toggle)
    lock?: boolean;
}

interface RadioButtonWrapperProps {
    currentStep: number;
    buttonManagement: ButtonConfig[];
    children: ReactNode;
}

// Keys of the app state that are not an RF process slice (see AppContext's State): a change of
// any other key means the action a pressed button started has moved the process on
const NON_PROCESS_STATE_KEYS = new Set([
    'finish',
    'userSettings',
    'user',
    'translations',
    'permissions',
    'configs',
    'parameters',
    'theme',
    'isSessionMenuCollapsed',
    'isSettingMenuCollapsed',
    'interval',
    'logoutTimeout'
]);

// Warehouse parameter switching the lock off: scope 'radio', code 'BUTTON_LOCK_ENABLED', value '0'.
// Missing or any other value: the lock is on.
const BUTTON_LOCK_PARAMETER = { scope: 'radio', code: 'BUTTON_LOCK_ENABLED' };

const buttonKey = (button: ButtonConfig) => button.key ?? button.label;

const isPromiseLike = (value: unknown): value is Promise<unknown> =>
    !!value && typeof (value as Promise<unknown>).then === 'function';

// Renders the RF action buttons of the current step and locks them while an action runs: the
// pressed button shows a spinner and every other one is disabled, as long as the action started
// by the press, or a step validating itself, is in flight (see rfButtonLock.ts).
export const RadioButtonWrapper: React.FC<RadioButtonWrapperProps> = ({
    currentStep,
    buttonManagement,
    children
}) => {
    const { isLocked, pressedKey } = useRfButtonLock();
    const state = useAppState();

    const lockEnabled =
        findValueByScopeAndCode(
            state.parameters ?? [],
            BUTTON_LOCK_PARAMETER.scope,
            BUTTON_LOCK_PARAMETER.code
        ) !== '0';
    useEffect(() => {
        rfButtonLock.setEnabled(lockEnabled);
    }, [lockEnabled]);

    // A change of an RF process slice is the end of the action a pressed button started
    const previousState = useRef<Record<string, any>>(state);
    useEffect(() => {
        const previous = previousState.current;
        previousState.current = state;
        const processMoved = Object.keys(state).some(
            (key) => !NON_PROCESS_STATE_KEYS.has(key) && state[key] !== previous[key]
        );
        if (processMoved) rfButtonLock.release();
    }, [state]);

    // A press must not outlive the screen that took it
    useEffect(() => () => rfButtonLock.release(), []);

    const onButtonClick = (button: ButtonConfig) => (e?: any) => {
        if (rfButtonLock.getSnapshot().isLocked) return;
        const key = buttonKey(button);
        if (button.lock !== false) rfButtonLock.press(key, button.lock ? 'hold' : 'auto');
        let result: void | Promise<unknown>;
        try {
            result = button.onClick(e);
        } catch (error) {
            rfButtonLock.release(key);
            throw error;
        }
        if (isPromiseLike(result)) {
            // a rejected click (typically a failed client-side validation) frees the buttons at once
            result.then(undefined, () => rfButtonLock.release(key));
        }
    };

    // Every form submit inside the wrapper, the scanner's Enter key included, goes through here
    const onSubmitCapture = (e: React.FormEvent) => {
        if (rfButtonLock.getSnapshot().isLocked) {
            // the module is busy: the submit is swallowed, the scanned value stays in its input
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        const form = e.target as HTMLElement;
        rfButtonLock.press(RF_SUBMIT_KEY, 'auto', SUBMIT_GRACE_MS);
        // antd validates right after the event; a failed validation only marks the form, and
        // nothing else would release the press
        window.setTimeout(() => {
            if (form.querySelector('.ant-form-item-has-error')) rfButtonLock.release(RF_SUBMIT_KEY);
        }, 150);
    };

    const isVisible = (button: ButtonConfig) =>
        button.visibleOnSteps.includes(currentStep) &&
        (button.permissionsToSeeTheButton === undefined || button.permissionsToSeeTheButton);
    const topButtons = buttonManagement.filter(
        (button) => button.position === 'top' && isVisible(button)
    );
    const bottomButtons = buttonManagement.filter(
        (button) => button.position === 'bottom' && isVisible(button)
    );
    // When the pressed button is not on screen (a scanner submit, a button of another step), the
    // bars themselves show that the module is working
    const isPressedButtonVisible =
        pressedKey !== null &&
        [...topButtons, ...bottomButtons].some((button) => buttonKey(button) === pressedKey);

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
        boxShadow: 'inset 0px 1px 0px 0px #f2c794',
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
        flexBasis: 'calc(30% - 5px)',
        transition: 'all 0.1s ease'
    };

    const activeButtonStyle = `
        .custom-button:active {
            transform: translateY(1px) !important;
            box-shadow: inset 0px 2px 4px 0px rgba(0,0,0,0.3) !important;
            background:  #f5c73d !important;
        }
    `;

    const renderBar = (buttons: ButtonConfig[], position: 'top' | 'bottom') => (
        <Spin spinning={isLocked && !isPressedButtonVisible} size="small">
            <div style={containerStyle}>
                {buttons.map((button, index) => {
                    const isPressed = pressedKey !== null && buttonKey(button) === pressedKey;
                    const isBlocked = isLocked && !isPressed;
                    return (
                        <Button
                            key={`${position}-${index}`}
                            icon={button.icon}
                            onClick={onButtonClick(button)}
                            className="custom-button"
                            loading={isPressed}
                            disabled={isBlocked}
                            // The inline gradient hides antd's disabled look, so blocked buttons are faded explicitly
                            style={{
                                ...buttonStyle,
                                ...(button.style ?? {}),
                                ...(isBlocked ? { opacity: 0.45 } : {})
                            }}
                        >
                            {button.label}
                        </Button>
                    );
                })}
            </div>
        </Spin>
    );

    return (
        <>
            <style>{activeButtonStyle}</style>
            {topButtons.length > 0 && renderBar(topButtons, 'top')}
            <div style={{ display: 'contents' }} onSubmitCapture={onSubmitCapture}>
                {children}
            </div>
            {bottomButtons.length > 0 && renderBar(bottomButtons, 'bottom')}
        </>
    );
};
