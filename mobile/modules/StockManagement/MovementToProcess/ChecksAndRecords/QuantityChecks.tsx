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
import { Modal } from 'antd';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { useEffect, useState } from 'react';
import { useTranslationWithFallback as useTranslation } from '@helpers';

export interface IQuantityChecksProps {
    dataToCheck: any;
    expectedQuantity?: number;
    stockQuantity?: number;
}

export const QuantityChecks = ({
    dataToCheck,
    expectedQuantity,
    stockQuantity
}: IQuantityChecksProps) => {
    const { t } = useTranslation();
    const {
        processName,
        stepNumber,
        enteredInfo: { enteredInfo, setEnteredInfo }
    } = dataToCheck;

    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // TYPED SAFE ALL
    useEffect(() => {
        if (enteredInfo) {
            setIsLoading(true);
            const confirmAndDispatch = () => {
                const data: { [label: string]: any } = {};
                data['movingQuantity'] = enteredInfo;
                storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };

                dispatch({
                    type: 'UPDATE_BY_STEP',
                    processName,
                    stepName: `step${stepNumber}`,
                    object: {
                        ...storedObject[`step${stepNumber}`],
                        data
                    }
                });
                setIsLoading(false);
            };

            if (expectedQuantity && enteredInfo > expectedQuantity) {
                Modal.confirm({
                    title: t('common:quantity-exceeds-expected'),
                    content: t('messages:quantity-exceeds-expected', {
                        movingQuantity: enteredInfo,
                        expectedQuantity
                    }),
                    okText: t('common:bool-yes'),
                    cancelText: t('common:bool-no'),
                    onOk() {
                        confirmAndDispatch();
                    },
                    onCancel() {
                        setIsLoading(false);
                        setEnteredInfo(null);
                        dispatch({
                            type: 'UPDATE_BY_STEP',
                            processName,
                            stepName: `step${stepNumber}`,
                            object: {
                                ...storedObject[`step${stepNumber}`],
                                data: undefined
                            }
                        });
                    }
                });
            } else {
                confirmAndDispatch();
            }
        }
    }, [enteredInfo, stockQuantity, expectedQuantity]);

    return (
        <WrapperForm>
            {isLoading && !storedObject[`step${stepNumber}`]?.data ? <ContentSpin /> : <></>}
        </WrapperForm>
    );
};
