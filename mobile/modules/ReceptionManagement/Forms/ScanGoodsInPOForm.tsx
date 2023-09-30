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
//DESCRIPTION: select list of articles corresponding to a given barcode and check its availability on the previouslychosenlocation

import { WrapperForm, StyledForm, StyledFormItem, RadioButtons } from '@components';
import { showError, LsIsSecured } from '@helpers';
import { Form, Input, Modal } from 'antd';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';

export interface IScanGoodsInPOProps {
    process: string;
    stepNumber: number;
    label: string;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
}

export const ScanGoodsInPOForm = ({
    process,
    stepNumber,
    label,
    trigger: { triggerRender, setTriggerRender },
    buttons
}: IScanGoodsInPOProps) => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [form] = Form.useForm();

    //TYPED SAFE ALL
    //Pre-requisite: initialize current step
    useEffect(() => {
        if (storedObject.currentStep < stepNumber) {
            //check workflow direction and assign current step accordingly
            storedObject[`step${stepNumber}`] = { previousStep: storedObject.currentStep };
            storedObject.currentStep = stepNumber;
        }
        storage.set(process, JSON.stringify(storedObject));
    }, []);

    //ScanGoodsInPO-1a: retrieve value from input
    const [barcodeToSearch, setBarcodeToSearch] = useState<string>();

    const onFinish = (values: any) => {
        // setIsLoading(true);
        setBarcodeToSearch(values.barcode);
    };

    //ScanGoodsInPO-2: launch query for barcodes handling
    const [fetchResult, setFetchResult] = useState<any>();
    useEffect(() => {
        if (barcodeToSearch) {
            setIsLoading(true);
            const fetchData = async () => {
                const res = await fetch(`/api/reception-management/scanGoodsInPO/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        scannedInfo: barcodeToSearch
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
                    onBack();
                    form.resetFields();
                    setBarcodeToSearch(undefined);
                    setIsLoading(false);
                }
            };
            fetchData();
        }
    }, [barcodeToSearch]);

    //ScanGoodsInPO-3: handle result to store it or pass through modal
    useEffect(() => {
        const handleFetchResult = (fetchResult: any) => {
            setIsLoading(false);
            const data = { goodsIn: fetchResult };
            setTriggerRender(!triggerRender);
            storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
            storage.set(process, JSON.stringify(storedObject));
            setTriggerRender(!triggerRender);
        };
        if (fetchResult) {
            setIsLoading(false);
            if (fetchResult.handlingUnitInbound === 'to-be-created') {
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
                        form.resetFields();
                        setBarcodeToSearch(undefined);
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

    //ScanGoodsInPO-1b: handle back to previous step settings
    const onBack = () => {
        setTriggerRender(!triggerRender);
        for (let i = storedObject[`step${stepNumber}`].previousStep; i <= stepNumber; i++) {
            delete storedObject[`step${i}`]?.data;
        }
        storedObject.currentStep = storedObject[`step${stepNumber}`].previousStep;
        storage.set(process, JSON.stringify(storedObject));
    };

    return (
        <WrapperForm>
            <StyledForm
                name="basic"
                layout="vertical"
                onFinish={onFinish}
                autoComplete="off"
                scrollToFirstError
                size="small"
                form={form}
            >
                <StyledFormItem
                    label={label}
                    name="barcode"
                    rules={[{ required: true, message: t('messages:error-message-empty-input') }]}
                >
                    <Input style={{ height: '20px', marginBottom: '5px' }} autoFocus allowClear />
                </StyledFormItem>
                <RadioButtons
                    input={{ ...buttons }}
                    output={{ trigger: { triggerRender, setTriggerRender }, onBack }}
                    submitLoading={isLoading}
                ></RadioButtons>
            </StyledForm>
        </WrapperForm>
    );
};
