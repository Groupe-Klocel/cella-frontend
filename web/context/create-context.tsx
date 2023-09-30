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
import React, { createContext, Dispatch, Reducer, useContext, useMemo } from 'react';

export function createCtx<S, A>(defaultValue: S, reducer: Reducer<S, A>) {
    const defaultDispatch: Dispatch<A> = () => defaultValue;
    const stateCtx = createContext(defaultValue);
    const dispatchCtx = createContext(defaultDispatch);

    function useStateCtx<K extends keyof S>() {
        const state = useContext(stateCtx);
        return state; // only one depth selector for comparison
    }

    function useDispatchCtx() {
        return useContext(dispatchCtx);
    }

    function Provider({ children }: React.PropsWithChildren<{}>) {
        const [state, dispatch] = React.useReducer(reducer, defaultValue);
        const contextValue = useMemo(() => {
            return { state, dispatch };
        }, [state, dispatch]);

        return (
            <dispatchCtx.Provider value={contextValue.dispatch}>
                <stateCtx.Provider value={contextValue.state}>{children}</stateCtx.Provider>
            </dispatchCtx.Provider>
        );
    }
    return [useStateCtx, useDispatchCtx, Provider] as const;
}
