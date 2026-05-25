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
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Modal } from 'antd';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { useEffect, useState } from 'react';

export interface IQuantityChecksProps {
    dataToCheck: any;
}

export const QuantityChecks = ({ dataToCheck }: IQuantityChecksProps) => {
    const { t } = useTranslation();

    const {
        processName,
        stepNumber,
        enteredInfo: { enteredInfo, setEnteredInfo },
        requiredMaxQuantity
    } = dataToCheck;

    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    const [isLoading, setIsLoading] = useState<boolean>(false);
    // TYPED SAFE ALL
    useEffect(() => {
        if (enteredInfo) {
            const currentHuo = storedObject?.step40?.data?.currentHuo;

            //send to step ReviewHuModelWeightChecks
            const updateQuantity = () => {
                const data: { [label: string]: any } = {};
                data['movingQuantity'] = enteredInfo;
                dispatch({
                    type: 'UPDATE_BY_STEP',
                    processName,
                    stepName: `step${stepNumber}`,
                    object: {
                        ...storedObject[`step${stepNumber}`],
                        data
                    }
                });
            };

            if (requiredMaxQuantity !== undefined && enteredInfo < requiredMaxQuantity) {
                Modal.confirm({
                    title: (
                        <span style={{ fontSize: '14px' }}>
                            {t('messages:message-quantity-to-prepare', {
                                expectedQuantity: requiredMaxQuantity,
                                enteredQuantity: enteredInfo
                            })}
                        </span>
                    ),
                    onOk: updateQuantity,
                    onCancel: () => {
                        setEnteredInfo(undefined);
                    },
                    okText: t('messages:confirm'),
                    cancelText: t('messages:cancel'),
                    bodyStyle: { fontSize: '2px' }
                });
            } else {
                updateQuantity();
            }
        }
    }, [enteredInfo]);

    return (
        <WrapperForm>
            {(enteredInfo && !storedObject[`step${stepNumber}`]?.data) || isLoading ? (
                <ContentSpin />
            ) : (
                <></>
            )}
        </WrapperForm>
    );
};
