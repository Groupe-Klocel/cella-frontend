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
import { LsIsSecured, showError } from '@helpers';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';

export interface IReturnDateChecksProps {
    dataToCheck: any;
}

export const ReturnDateChecks = ({ dataToCheck }: IReturnDateChecksProps) => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const {
        process,
        stepNumber,
        enteredInfo: { enteredInfo, setEnteredInfo },
        trigger: { triggerRender, setTriggerRender },
        setResetForm
    } = dataToCheck;

    const storedObject = JSON.parse(storage.get(process) || '{}');

    // RESTART HERE : CREATE PURCHASE ORDER IF RETURN IS ENTERED (API?)
    // TYPED SAFE ALL
    const [fetchResult, setFetchResult] = useState<any>();
    useEffect(() => {
        if (enteredInfo) {
            if (
                storedObject[`step${storedObject[`step${stepNumber}`].previousStep}`]?.data
                    ?.purchaseOrder === 'new'
            ) {
                setIsLoading(true);
                const fetchData = async () => {
                    const res = await fetch(`/api/reception-management/createReturnPo/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            orderDate: enteredInfo.date,
                            supplier: storedObject[`step10`]?.data?.block?.name
                        })
                    });
                    const response = await res.json();

                    setFetchResult(response.response);
                    if (!res.ok) {
                        if (response.error.is_error) {
                            // specific error
                            showError(t(`errors:${response.error.code}`));
                        } else {
                            setResetForm(true);
                            showError(t('messages:return-creation-failed'));
                        }
                        setIsLoading(false);
                        setEnteredInfo(undefined);
                    }
                };
                fetchData();
            }
        }
    }, [enteredInfo]);

    useEffect(() => {
        if (enteredInfo && fetchResult) {
            const currentStepData: { [label: string]: any } = {};
            const previousStepData: { [label: string]: any } = {};
            previousStepData['purchaseOrder'] = fetchResult.createdPO.createPurchaseOrder;
            storedObject[`step${storedObject[`step${stepNumber}`].previousStep}`] = {
                ...storedObject[`step${storedObject[`step${stepNumber}`].previousStep}`],
                data: previousStepData
            };
            currentStepData['returnDate'] = enteredInfo;
            storedObject[`step${stepNumber}`] = {
                ...storedObject[`step${stepNumber}`],
                data: currentStepData
            };
            storage.set(process, JSON.stringify(storedObject));
            setTriggerRender(!triggerRender);
        }
    }, [enteredInfo, fetchResult]);

    return (
        <WrapperForm>
            {enteredInfo && !storedObject[`step${stepNumber}`]?.data ? <ContentSpin /> : <></>}
        </WrapperForm>
    );
};
