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
import { WrapperForm, ContentSpin } from '@components';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { useEffect } from 'react';

export interface IQuantityChecksReducerProps {
    dataToCheck: any;
}

export const QuantityChecks_reducer = ({ dataToCheck }: IQuantityChecksReducerProps) => {
    const state = useAppState();
    const dispatch = useAppDispatch();

    const {
        processName,
        stepNumber,
        enteredInfo: { enteredInfo }
    } = dataToCheck;

    const storedObject = state[processName] || {};

    // TYPED SAFE ALL
    useEffect(() => {
        if (enteredInfo) {
            const data: { [label: string]: any } = {};
            data['movingQuantity'] = enteredInfo;
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: `step${stepNumber}`,
                object: {
                    ...storedObject[`step${stepNumber}`],
                    data
                },
                customFields: [{ key: 'currentStep', value: stepNumber }]
            });
        }
    }, [enteredInfo]);

    return (
        <WrapperForm>
            {enteredInfo && !storedObject[`step${stepNumber}`]?.data ? <ContentSpin /> : <></>}
        </WrapperForm>
    );
};
