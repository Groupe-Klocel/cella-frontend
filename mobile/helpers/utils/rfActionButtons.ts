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

/**
 * Configurable styling/ordering of the action buttons on the RF preparation flows
 * (pick / pack / pick-and-pack).
 *
 * The configuration is read from the `extras` field of the parameter
 *   scope: 'outbound'
 *   code:  'RF_PREPARATION_ACTION_BUTTONS'
 *
 * `extras` is an object indexed by each button's stable `key` (language-independent,
 * defined on the button config in the page). Every entry and every property is
 * optional - when missing the base behaviour is kept untouched:
 *   {
 *     "submit": { "order": 2, "color": "radial-gradient(circle, #52c41a 70%, #389e0d 100%)" },
 *     "back":   { "order": 1, "color": "radial-gradient(circle, #ff4d4f 70%, #cf1322 100%)" },
 *     "close-box": { "color": "#1677ff" }
 *   }
 *
 * - `color` overrides the button `background`.
 * - `order` reorders only the buttons that have a configured order, among the slots
 *   those buttons currently occupy. Buttons without a configured order keep their
 *   position. Lower order = placed first.
 *
 * If the parameter (or the matching key in `extras`) does not exist, the passed
 * `buttonManagement` array is returned unchanged.
 */

const PARAMETER_SCOPE = 'outbound';
const PARAMETER_CODE = 'RF_PREPARATION_ACTION_BUTTONS';

type ActionButtonExtra = {
    order?: number;
    color?: string;
};

const getActionButtonsExtras = (parameters: any[]): Record<string, ActionButtonExtra> | null => {
    const parameter = parameters?.find(
        (item: any) => item?.scope === PARAMETER_SCOPE && item?.code?.toUpperCase() === PARAMETER_CODE
    );

    if (!parameter) {
        return null;
    }

    let extras: any = parameter.extras;
    // `extras` is usually already an object (GraphQL JSON), but guard for a string payload.
    if (typeof extras === 'string') {
        try {
            extras = JSON.parse(extras);
        } catch {
            return null;
        }
    }

    if (!extras || typeof extras !== 'object' || Object.keys(extras).length === 0) {
        return null;
    }

    return extras;
};

/**
 * Returns a new `buttonManagement` array with the configured color/order applied to
 * any button that carries a `key` matching an entry in the parameter `extras`. Falls
 * back to the input array untouched when no valid configuration is found.
 */
export const applyRfActionButtonsConfig = <T extends { key?: string; label: string; style?: any }>(
    buttonManagement: T[],
    parameters: any[]
): T[] => {
    const extras = getActionButtonsExtras(parameters);
    if (!extras) {
        return buttonManagement;
    }

    // 1. Colors: apply the configured background to each matching button (keeps the base style otherwise).
    let buttons = buttonManagement.map((button) => {
        const config = button.key ? extras[button.key] : undefined;
        if (config?.color) {
            return { ...button, style: { ...(button.style ?? {}), background: config.color } };
        }
        return button;
    });

    // 2. Order: reorder only the buttons that have a configured order, among the slots they occupy.
    const configured = buttons
        .map((button, index) => ({
            button,
            index,
            order: button.key ? extras[button.key]?.order : undefined
        }))
        .filter((entry) => typeof entry.order === 'number');

    if (configured.length > 1) {
        const slots = configured.map((entry) => entry.index); // existing positions, in ascending order
        const sortedButtons = [...configured]
            .sort((a, b) => (a.order as number) - (b.order as number))
            .map((entry) => entry.button);
        slots.forEach((slot, i) => {
            buttons[slot] = sortedButtons[i];
        });
    }

    return buttons;
};
