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
import { WrapperForm, StyledForm, StyledFormItem, RadioButtons } from '@components';
import { Form, Input } from 'antd';
import { useEffect, useState } from 'react';
import useTranslation from 'next-translate/useTranslation';
import { showError, useArticleLuBarcodeIds, LsIsSecured } from '@helpers';
import CameraScanner from 'modules/Common/CameraScanner';

export interface IScanArticleFormProps {
    process: string;
    stepNumber: number;
    label: string;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
}

export const ScanArticleForm = ({
    process,
    stepNumber,
    label,
    trigger: { triggerRender, setTriggerRender },
    buttons
}: IScanArticleFormProps) => {
    const [form] = Form.useForm();
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');
    const [camData, setCamData] = useState();

    useEffect(() => {
        form.setFieldsValue({ barcode: camData });
    }, [camData]);

    //Pre-requisite: initialize current step
    useEffect(() => {
        if (storedObject.currentStep < stepNumber) {
            //check workflow direction and assign current step accordingly
            storedObject[`step${stepNumber}`] = { previousStep: storedObject.currentStep };
            storedObject.currentStep = stepNumber;
        }
        storage.set(process, JSON.stringify(storedObject));
    }, []);

    const [articleBarcode, setArticleBarcode] = useState<string>();
    const onFinish = (values: any) => {
        setArticleBarcode(values.barcode);
    };

    //ScanArticle-2: launch query for article_lu_barcodes
    const { data: articleLuBarcodeData, error } = useArticleLuBarcodeIds(
        { barcode_Name: `${articleBarcode}` },
        1,
        100,
        null
    );

    useEffect(() => {
        if (articleBarcode && articleLuBarcodeData) {
            if (articleLuBarcodeData.articleLuBarcodes?.results.length !== 0) {
                const data: { [label: string]: any } = {};
                data['articleLuBarcodes'] = articleLuBarcodeData?.articleLuBarcodes?.results;
                setTriggerRender(!triggerRender);
                storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
                storage.set(process, JSON.stringify(storedObject));
                setCamData(undefined);
            } else {
                showError(t('messages:no-article'));
                form.resetFields();
                setArticleBarcode(undefined);
                setCamData(undefined);
            }
        }
    }, [articleLuBarcodeData]);

    const handleCleanData = () => {
        form.resetFields();
        setCamData(undefined);
    };

    //ScanArticleByLocation-1b: handle back to previous step settings
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
                    <Input style={{ height: '20px', marginBottom: '5px' }} autoFocus />
                </StyledFormItem>
                <CameraScanner camData={{ setCamData }} handleCleanData={handleCleanData} />
                <RadioButtons
                    input={{ ...buttons }}
                    output={{ trigger: { triggerRender, setTriggerRender }, onBack }}
                ></RadioButtons>
            </StyledForm>
        </WrapperForm>
    );
};
