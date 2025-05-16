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
import { showError, LsIsSecured } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useState } from 'react';
import configs from '../../../../../common/configs.json';
import { Modal } from 'antd';

//TO BE REWORKED

export interface IGoodsInOrPoChecksProps {
    dataToCheck: any;
}

export const GoodsInOrPoChecks = ({ dataToCheck }: IGoodsInOrPoChecksProps) => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const {
        process,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        trigger: { triggerRender, setTriggerRender },
        setResetForm,
        receptionType
    } = dataToCheck;

    const storedObject = JSON.parse(storage.get(process) || '{}');
    //ScanGoodsInPO-2: launch query for barcodes handling
    const [fetchResult, setFetchResult] = useState<any>();
    useEffect(() => {
        if (scannedInfo) {
            setIsLoading(true);
            const fetchData = async () => {
                const res = await fetch(`/api/reception-management/scanGoodsInPO/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        scannedInfo,
                        receptionType
                    })
                });
                const response = await res.json();
                setFetchResult(response.response);
                if (!res.ok) {
                    if (response.error.is_error) {
                        // specific error
                        showError(t(`errors:${response.error.code}`));
                    } else {
                        // generic error
                        showError(t('messages:check-failed'));
                    }
                    setResetForm(true);
                    setScannedInfo(undefined);
                    setIsLoading(false);
                }
            };
            fetchData();
        }
    }, [scannedInfo]);

    //ScanGoodsInPO-3: handle result to store it or pass through modal
    useEffect(() => {
        const handleFetchResult = (fetchResult: any) => {
            setIsLoading(false);
            const data = { ...fetchResult };
            setTriggerRender(!triggerRender);
            storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
            storage.set(process, JSON.stringify(storedObject));
            setTriggerRender(!triggerRender);
        };
        if (fetchResult) {
            setIsLoading(false);
            if (fetchResult.goodsIns === 'to-be-created') {
                Modal.confirm({
                    title: (
                        <span style={{ fontSize: '14px' }}>
                            {t('messages:goodsin-creation-confirm')}
                        </span>
                    ),
                    onOk: () => {
                        handleFetchResult(fetchResult);
                    },
                    onCancel: () => {
                        setResetForm(true);
                        setScannedInfo(undefined);
                    },
                    okText: t('messages:confirm'),
                    cancelText: t('messages:cancel'),
                    bodyStyle: { fontSize: '2px' }
                });
            } else {
                handleFetchResult(fetchResult);
            }
        }
    }, [fetchResult]);

    return <WrapperForm>{scannedInfo ? <ContentSpin /> : <></>}</WrapperForm>;
};
