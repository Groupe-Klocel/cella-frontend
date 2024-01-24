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
import { Select, Form } from 'antd';
import { useAuth } from 'context/AuthContext';
import { GetAllArticlesQuery, useGetAllArticlesQuery } from 'generated/graphql';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';
import parameters from '../../../../../common/parameters.json';
import CameraScanner from 'modules/Common/CameraScanner';

export interface ISelectArticleProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    defaultValue?: any;
}

export const SelectArticleForm = ({
    process,
    stepNumber,
    defaultValue,
    trigger: { triggerRender, setTriggerRender },
    buttons
}: ISelectArticleProps) => {
    const { graphqlRequestClient } = useAuth();
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');

    const [articles, setArticles] = useState<Array<any>>();

    //camera scanner section
    const [form] = Form.useForm();
    const [camData, setCamData] = useState();

    useEffect(() => {
        if (camData) {
            if (articles?.some((option) => option.text === camData)) {
                const articleToFind = articles?.find((option) => option.text === camData);
                form.setFieldsValue({ article: articleToFind.key });
            } else {
                showError(t('messages:unexpected-scanned-item'));
            }
        }
    }, [camData, articles]);

    const handleCleanData = () => {
        form.resetFields();
        setCamData(undefined);
    };
    // end camera scanner section

    // TYPED SAFE ALL
    //Pre-requisite: initialize current step
    useEffect(() => {
        //automatically set returnDate when defaultValue is provided
        if (defaultValue) {
            // N.B.: in this case previous step is kept at its previous value
            const data: { [label: string]: any } = {};
            data['article'] = defaultValue;
            storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
            setTriggerRender(!triggerRender);
        } else if (storedObject.currentStep < stepNumber) {
            //check workflow direction and assign current step accordingly
            storedObject[`step${stepNumber}`] = { previousStep: storedObject.currentStep };
            storedObject.currentStep = stepNumber;
        }
        storage.set(process, JSON.stringify(storedObject));
    }, []);

    //SelectArticle-1: retrieve articles
    const articlesList = useGetAllArticlesQuery<Partial<GetAllArticlesQuery>, Error>(
        graphqlRequestClient,
        {
            filters: { featureType: [parameters.FEATURE_TYPE_ID] },
            orderBy: null,
            page: 1,
            itemsPerPage: 100
        }
    );

    useEffect(() => {
        if (articlesList) {
            const newArticleTexts: Array<any> = [];
            const tmp = articlesList?.data?.articles?.results;
            if (tmp) {
                tmp.forEach((item) => {
                    newArticleTexts.push({ key: item.id, text: item.name });
                });
                setArticles(newArticleTexts);
            }
        }
    }, [articlesList.data]);

    //SelectArticle-2a: retrieve chosen article from select and set information
    const onFinish = (values: any) => {
        const data: { [label: string]: any } = {};
        const selectedArticle = articlesList?.data?.articles?.results.find((e: any) => {
            return e.id == values.article;
        });
        data['article'] = selectedArticle;
        storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
        storage.set(process, JSON.stringify(storedObject));
        setTriggerRender(!triggerRender);
    };

    //SelectArticle-2b: handle back to previous step settings
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
                    label={t('common:articles')}
                    name="article"
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
                        {articles?.map((option: any) => (
                            <Select.Option key={option.key} value={option.key}>
                                {option.text}
                            </Select.Option>
                        ))}
                    </Select>
                </StyledFormItem>
                <CameraScanner camData={{ setCamData }} handleCleanData={handleCleanData} />
                <RadioButtons
                    input={{ ...buttons }}
                    output={{ onBack }}
                    action1Label={t('actions:back')}
                ></RadioButtons>
            </StyledForm>
        </WrapperForm>
    );
};
