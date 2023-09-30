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
import { showError, useArticleLuBarcodeIds, LsIsSecured } from '@helpers';
import { Form, Input } from 'antd';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';

export interface IScanArticleByPoProps {
    process: string;
    stepNumber: number;
    label: string;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    goodsInInfos: { [label: string]: any };
}

export const ScanArticleByPoForm = ({
    process,
    stepNumber,
    label,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    goodsInInfos
}: IScanArticleByPoProps) => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [form] = Form.useForm();

    // TYPED SAFE ALL
    //Pre-requisite: initialize current step
    useEffect(() => {
        if (storedObject.currentStep < stepNumber) {
            //check workflow direction and assign current step accordingly
            storedObject[`step${stepNumber}`] = { previousStep: storedObject.currentStep };
            storedObject.currentStep = stepNumber;
        }
        storage.set(process, JSON.stringify(storedObject));
    }, []);

    //ScanArticleByPo-1a: retrieve value from input
    const [articleBarcode, setArticleBarcode] = useState<string>();
    const onFinish = (values: any) => {
        setIsLoading(true);
        setArticleBarcode(values.barcode);
    };

    //ScanArticleByPo-2: launch query for article_lu_barcodes
    const { data: articleLuBarcodeData, error } = useArticleLuBarcodeIds(
        { barcode_Name: `${articleBarcode}` },
        1,
        100,
        null
    );

    //ScanArticleByPo-3: retrieve articleLuBarcodesIds list
    const [articleIds, setArticleIds] = useState<any>();
    useEffect(() => {
        const articleIds: Array<string> = [];
        if (articleBarcode && articleLuBarcodeData) {
            if (articleLuBarcodeData.articleLuBarcodes?.count != 0) {
                //this will check if there are articles in the given location
                articleLuBarcodeData?.articleLuBarcodes?.results.map((e: any) => {
                    articleIds.push(e.articleId);
                });
                setArticleIds(articleIds);
            } else {
                showError(t('messages:no-article'));
                form.resetFields();
                setArticleBarcode(undefined);
                setIsLoading(false);
            }
        }
    }, [articleLuBarcodeData]);

    //ScanArticleByPo-4: check if article is expected and if there is still some quantities to receive
    useEffect(() => {
        if (goodsInInfos && articleIds) {
            //this will check if there are articles in the po lines
            const matchingPoLines = goodsInInfos.purchaseOrder?.purchaseOrderLines?.filter(
                (e: any) => {
                    return articleIds.includes(e['articleId']);
                }
            );

            const matchingHuContentInbound =
                goodsInInfos.handlingUnitInbound !== 'to-be-created'
                    ? goodsInInfos.handlingUnitInbound?.handlingUnitContentInbounds?.filter(
                          (e: any) => {
                              return articleIds.includes(e.handlingUnitContent['articleId']);
                          }
                      ).length !== 0
                        ? goodsInInfos.handlingUnitInbound?.handlingUnitContentInbounds?.filter(
                              (e: any) => {
                                  return articleIds.includes(e.handlingUnitContent['articleId']);
                              }
                          )
                        : [{ new: true, receivedQuantity: 0 }]
                    : [{ new: true, receivedQuantity: 0 }];
            if (matchingPoLines.length !== 0) {
                let remainQtyToReceiveFound = false;
                for (let i = 0; i < matchingPoLines.length; i++) {
                    // this will check the quantities already received
                    let remainQtyToReceive;
                    if (matchingHuContentInbound[i]) {
                        remainQtyToReceive =
                            matchingPoLines[i].quantityMax -
                            matchingHuContentInbound[i].receivedQuantity;
                    } else {
                        remainQtyToReceive = matchingPoLines[i].quantityMax;
                    }
                    if (remainQtyToReceive !== 0) {
                        remainQtyToReceiveFound = true;
                        const data: { [label: string]: any } = {};
                        data['articleLuBarcodes'] =
                            articleLuBarcodeData?.articleLuBarcodes?.results;
                        data['remainQtyToReceive'] = remainQtyToReceive;
                        data['matchingPoLine'] = matchingPoLines[i];
                        data['matchingHuContentInbound'] = matchingHuContentInbound[i];
                        setTriggerRender(!triggerRender);
                        storedObject[`step${stepNumber}`] = {
                            ...storedObject[`step${stepNumber}`],
                            data
                        };
                        storage.set(process, JSON.stringify(storedObject));
                        setIsLoading(false);
                    } //else {
                    //     showError(t('messages:no-article-for-hui'));
                    //     form.resetFields();
                    //     setArticleBarcode(undefined);
                    //     setIsLoading(false);
                    // }
                }
                if (remainQtyToReceiveFound == false) {
                    showError(t('messages:no-article-for-hui'));
                    form.resetFields();
                    setArticleBarcode(undefined);
                    setIsLoading(false);
                }
            } else {
                showError(t('messages:no-article-for-po'));
                form.resetFields();
                setArticleBarcode(undefined);
                setIsLoading(false);
            }
        }
    }, [articleIds]);

    //ScanArticleByPo-1b: handle back to previous step settings
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
