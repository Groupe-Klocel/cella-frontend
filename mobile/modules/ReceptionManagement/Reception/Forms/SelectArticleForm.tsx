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
//DESCRIPTION: select manually or automatically one location in a list of locations according to their level

import { WrapperForm, StyledForm, StyledFormItem, RadioButtons } from '@components';
import { LsIsSecured, showError } from '@helpers';
import { Form, Modal, Select } from 'antd';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';
import CameraScanner from 'modules/Common/CameraScanner';

export interface ISelectArticleProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    articleLuBarcodes?: any;
    action1Trigger?: any;
}

export const SelectArticleForm = ({
    process,
    stepNumber,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    action1Trigger,
    articleLuBarcodes
}: ISelectArticleProps) => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');

    // TYPED SAFE ALL
    //Pre-requisite: initialize current step
    useEffect(() => {
        if (articleLuBarcodes.length === 1) {
            // N.B.: in this case previous step is kept at its previous value
            let isNewProductToUpdate = false;
            if (articleLuBarcodes[0].article.newProduct) {
                Modal.warning({
                    title: (
                        <span style={{ fontSize: '14px' }}>
                            {t('messages:new-article-warning')}
                        </span>
                    ),
                    okText: t('messages:confirm'),
                    bodyStyle: { fontSize: '2px' }
                });
            }
            isNewProductToUpdate = true;
            const data: { [label: string]: any } = {};
            data['isNewProductToUpdate'] = isNewProductToUpdate;
            data['chosenArticleLuBarcode'] = articleLuBarcodes[0];
            data['currentPurchaseOrderLine'] = storedObject[
                `step10`
            ].data.purchaseOrder.purchaseOrderLines.find(
                (purchaseOrderLine: any) =>
                    purchaseOrderLine.articleId === articleLuBarcodes[0].articleId
            );
            storedObject[`step${stepNumber}`] = {
                ...storedObject[`step${stepNumber}`],
                data
            };
            setTriggerRender(!triggerRender);
        } else if (storedObject.currentStep < stepNumber) {
            //check workflow direction and assign current step accordingly
            storedObject[`step${stepNumber}`] = { previousStep: storedObject.currentStep };
            storedObject.currentStep = stepNumber;
        }
        storage.set(process, JSON.stringify(storedObject));
    }, []);

    //SelectArticle-1: retrieve articles
    const articlesList: Array<any> = [];
    articleLuBarcodes?.forEach((item: any) => {
        articlesList.push({ key: item.articleId, text: item.article.name });
    });

    //camera scanner section
    const [form] = Form.useForm();
    const [camData, setCamData] = useState();

    useEffect(() => {
        if (camData) {
            if (articlesList?.some((option) => option.text === camData)) {
                const articleToFind = articlesList?.find((option) => option.text === camData);
                form.setFieldsValue({ possibleArticles: articleToFind.key });
            } else {
                showError(t('messages:unexpected-scanned-item'));
            }
        }
    }, [camData, articlesList]);

    const handleCleanData = () => {
        form.resetFields();
        setCamData(undefined);
    };
    // end camera scanner section

    //SelectArticle-2a: retrieve chosen article from select and set information
    const onFinish = (values: any) => {
        const data: { [label: string]: any } = {};
        const selectedArticle = articleLuBarcodes?.find(
            (e: any) => e.articleId === values.possibleArticles
        )?.article;
        let isNewProductToUpdate = false;
        if (selectedArticle.newProduct) {
            Modal.warning({
                title: (
                    <span style={{ fontSize: '14px' }}>{t('messages:new-article-warning')}</span>
                ),
                bodyStyle: { fontSize: '2px' }
            });
            isNewProductToUpdate = true;
            data['article'] = selectedArticle;
            data['isNewProductToUpdate'] = isNewProductToUpdate;
            data['currentPurchaseOrderLine'] = storedObject[
                `step10`
            ].data.purchaseOrder.purchaseOrderLines.find(
                (purchaseOrderLine: any) => purchaseOrderLine.articleId === selectedArticle.id
            );
            storedObject[`step${stepNumber}`] = {
                ...storedObject[`step${stepNumber}`],
                data
            };
            storage.set(process, JSON.stringify(storedObject));
            setTriggerRender(!triggerRender);
            action1Trigger?.setAction1Trigger(false);
        } else {
            data['article'] = selectedArticle;
            data['isNewProductToUpdate'] = isNewProductToUpdate;
            data['currentPurchaseOrderLine'] = storedObject[
                `step10`
            ].data.purchaseOrder.purchaseOrderLines.find(
                (purchaseOrderLine: any) => purchaseOrderLine.articleId === selectedArticle.id
            );
            storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
            storage.set(process, JSON.stringify(storedObject));
            setTriggerRender(!triggerRender);
            action1Trigger?.setAction1Trigger(false);
        }
    };

    //SelectArticle-2b: handle back to previous step settings
    const onBack = () => {
        setTriggerRender(!triggerRender);
        delete storedObject[`step${storedObject[`step${stepNumber}`].previousStep}`].data;
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
                    label={t('common:possible-articles')}
                    name="possibleArticles"
                    rules={[{ required: true, message: t('messages:error-message-empty-input') }]}
                >
                    <Select
                        style={{ height: '20px', marginBottom: '5px' }}
                        showSearch
                        filterOption={(inputValue, option) =>
                            option!.props.children
                                .toUpperCase()
                                .indexOf(inputValue.toUpperCase()) !== -1
                        }
                        allowClear
                    >
                        {articlesList?.map((option: any) => (
                            <Select.Option key={option.key} value={option.key}>
                                {option.text}
                            </Select.Option>
                        ))}
                    </Select>
                </StyledFormItem>
                <CameraScanner camData={{ setCamData }} handleCleanData={handleCleanData} />
                <RadioButtons
                    input={{ ...buttons, action1Trigger: action1Trigger?.action1Trigger }}
                    output={{ onBack, setAction1Trigger: action1Trigger?.setAction1Trigger }}
                    action1Label={t('actions:back')}
                ></RadioButtons>
            </StyledForm>
        </WrapperForm>
    );
};
