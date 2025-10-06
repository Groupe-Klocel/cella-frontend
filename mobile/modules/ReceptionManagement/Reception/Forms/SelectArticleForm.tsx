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
import { showError } from '@helpers';
import { Form, Modal, Select } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useState } from 'react';
import CameraScanner from 'modules/Common/CameraScanner';
import { useAppDispatch, useAppState } from 'context/AppContext';

export interface ISelectArticleProps {
    processName: string;
    stepNumber: number;
    buttons: { [label: string]: any };
    articleLuBarcodes?: any;
    action1Trigger?: any;
}

export const SelectArticleForm = ({
    processName,
    stepNumber,
    buttons,
    action1Trigger,
    articleLuBarcodes
}: ISelectArticleProps) => {
    const { t } = useTranslation();
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};

    // TYPED SAFE ALL
    //Pre-requisite: initialize current step
    useEffect(() => {
        let objectUpdate: any = {
            type: 'UPDATE_BY_STEP',
            processName,
            stepName: `step${stepNumber}`,
            object: undefined,
            currentStep: undefined
        };
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
            objectUpdate.object = {
                ...storedObject[`step${stepNumber}`],
                data: { isNewProductToUpdate, chosenArticleLuBarcode: articleLuBarcodes[0] }
            };
        } else if (storedObject.currentStep < stepNumber) {
            //check workflow direction and assign current step accordingly
            objectUpdate.object = { previousStep: storedObject.currentStep };
            objectUpdate.currentStep = stepNumber;
        }
        dispatch(objectUpdate);
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
            ].data.purchaseOrder.purchaseOrderLines.filter(
                (purchaseOrderLine: any) => purchaseOrderLine.articleId === selectedArticle.id
            );
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: `step${stepNumber}`,
                object: { ...storedObject[`step${stepNumber}`], data },
                customFields: [{ key: 'currentStep', value: stepNumber }]
            });
            action1Trigger?.setAction1Trigger(false);
        } else {
            data['article'] = selectedArticle;
            data['isNewProductToUpdate'] = isNewProductToUpdate;
            data['currentPurchaseOrderLine'] = storedObject[
                `step10`
            ].data.purchaseOrder.purchaseOrderLines.filter(
                (purchaseOrderLine: any) => purchaseOrderLine.articleId === selectedArticle.id
            );
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: `step${stepNumber}`,
                object: { ...storedObject[`step${stepNumber}`], data },
                customFields: [{ key: 'currentStep', value: stepNumber }]
            });
            action1Trigger?.setAction1Trigger(false);
        }
    };

    //SelectArticle-2b: handle back to previous step settings
    const onBack = () => {
        dispatch({
            type: 'ON_BACK',
            processName,
            stepToReturn: `step${storedObject[`step${stepNumber}`].previousStep}`
        });
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
