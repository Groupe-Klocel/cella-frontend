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
import { LsIsSecured } from '@helpers';
import { Form, Modal, Select } from 'antd';
import { useAuth } from 'context/AuthContext';
import { GetAllArticlesQuery, useGetAllArticlesQuery } from 'generated/graphql';
import useTranslation from 'next-translate/useTranslation';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export interface ISelectOtherArticleProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    contents?: any;
    action1Trigger?: any;
}

export const SelectOtherArticleForm = ({
    process,
    stepNumber,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    action1Trigger,
    contents
}: ISelectOtherArticleProps) => {
    const { graphqlRequestClient } = useAuth();
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');
    const [articles, setArticles] = useState<Array<any>>();
    const [form] = Form.useForm();
    const [resetForm, setResetForm] = useState<boolean>(false);

    // Manage form reset in case of error
    useEffect(() => {
        if (resetForm) {
            form.resetFields();
            setResetForm(false);
        }
    }, [resetForm]);

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

    //SelectOtherArticle-1: retrieve articles without features
    //retrieve articles list
    const articlesList = useGetAllArticlesQuery<Partial<GetAllArticlesQuery>, Error>(
        graphqlRequestClient,
        {
            filters: {},
            orderBy: null,
            page: 1,
            itemsPerPage: 1000
        }
    );

    useEffect(() => {
        if (articlesList) {
            const newArticleTexts: Array<any> = [];
            const tmp = articlesList?.data?.articles?.results;
            if (tmp) {
                tmp.forEach((item) => {
                    if (item.featureType === null)
                        newArticleTexts.push({ key: item.id, text: item.name });
                });
                setArticles(newArticleTexts);
            }
        }
    }, [articlesList.data]);

    //SelectOtherArticle-2a: retrieve chosen article from select and set information
    const onFinish = (values: any) => {
        const data: { [label: string]: any } = {};

        const selectedArticle = articlesList?.data?.articles?.results?.find(
            (article: { id: any }) => article.id === values.otherArticles
        );

        const selectedContent = contents?.find((e: any) => {
            return e.articleId == values.otherArticles;
        });

        if (!selectedContent) {
            Modal.confirm({
                title: (
                    <span style={{ fontSize: '14px' }}>
                        {t('messages:article-creation-confirm')}
                    </span>
                ),
                onOk: () => {
                    data['article'] = selectedArticle;
                    data['handlingUnitContent'] = selectedContent;
                    data['resType'] = 'barcode';
                    storedObject[`step${stepNumber}`] = {
                        ...storedObject[`step${stepNumber}`],
                        data
                    };
                    storage.set(process, JSON.stringify(storedObject));
                    setTriggerRender(!triggerRender);
                    action1Trigger?.setAction1Trigger(false);
                },
                onCancel: () => {
                    setResetForm(true);
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel'),
                bodyStyle: { fontSize: '2px' }
            });
        } else {
            data['article'] = selectedArticle;
            data['handlingUnitContent'] = selectedContent;
            data['resType'] = 'barcode';
            storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
            storage.set(process, JSON.stringify(storedObject));
            setTriggerRender(!triggerRender);
            action1Trigger?.setAction1Trigger(false);
        }
    };

    //SelectOtherArticle-2b: handle back to previous step settings
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
            >
                <StyledFormItem
                    label={t('common:other-articles')}
                    name="otherArticles"
                    rules={[{ required: true, message: t('messages:error-message-empty-input') }]}
                >
                    <Select style={{ height: '20px', marginBottom: '5px' }}>
                        {articles?.map((option: any) => (
                            <Select.Option key={option.key} value={option.key}>
                                {option.text}
                            </Select.Option>
                        ))}
                    </Select>
                </StyledFormItem>
                <RadioButtons
                    input={{ ...buttons, action1Trigger: action1Trigger?.action1Trigger }}
                    output={{ onBack, setAction1Trigger: action1Trigger?.setAction1Trigger }}
                    action1Label={t('actions:back')}
                ></RadioButtons>
            </StyledForm>
        </WrapperForm>
    );
};
