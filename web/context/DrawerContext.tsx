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
import { createCtx } from './create-context';

const initialState = {
    size: 700,
    isOpen: false,
    content: null,
    title: '',
    cancelButton: false,
    comfirmButton: true,
    cancelButtonTitle: '',
    comfirmButtonTitle: '',
    onComfirm: undefined,
    onCancel: undefined,
    onClose: undefined
};

type State = typeof initialState;
type Action = any;
function reducer(state: State, action: Action) {
    switch (action.type) {
        case 'OPEN_DRAWER':
            return {
                ...state,
                size: action.size,
                isOpen: true,
                content: action.content,
                title: action.title,
                cancelButton: action.cancelButton,
                comfirmButton: action.comfirmButton,
                cancelButtonTitle: action.cancelButtonTitle,
                comfirmButtonTitle: action.comfirmButtonTitle,
                onComfirm: action.onComfirm,
                onCancel: action.onCancel
            };
        case 'CLOSE_DRAWER':
            return {
                ...state,
                isOpen: false,
                content: null
            };
        default:
            return state;
    }
}

const [useDrawerState, useDrawerDispatch, DrawerProvider] = createCtx(initialState, reducer);

export { useDrawerState, useDrawerDispatch, DrawerProvider };
