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
import { Select } from 'antd';
import { useAuth } from 'context/AuthContext';
import useTranslation from 'next-translate/useTranslation';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export interface ISelectArticleProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    contents?: any;
    action1Trigger?: any;
}

export const SelectArticleForm = ({
    process,
    stepNumber,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    action1Trigger,
    contents
}: ISelectArticleProps) => {
    const { graphqlRequestClient } = useAuth();
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');

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

    //SelectArticle-1: retrieve articles without features
    const articlesList: Array<any> = [];
    contents
        ?.filter((content: any) => content.handlingUnitContentFeatures.length <= 0)
        .forEach((item: any) => {
            articlesList.push({ key: item.articleId, text: item.article.name });
        });

    //SelectArticle-2a: retrieve chosen article from select and set information
    const onFinish = (values: any) => {
        const data: { [label: string]: any } = {};
        const selectedArticle = contents?.find(
            (e: any) => e.articleId === values.otherArticles
        )?.article;
        const selectedContent = contents?.find((e: any) => {
            return e.articleId == values.otherArticles;
        });
        data['article'] = selectedArticle;
        data['handlingUnitContent'] = selectedContent;
        data['resType'] = 'barcode';
        storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
        storage.set(process, JSON.stringify(storedObject));
        setTriggerRender(!triggerRender);
        action1Trigger?.setAction1Trigger(false);
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
            >
                <StyledFormItem
                    label={t('common:other-articles')}
                    name="otherArticles"
                    rules={[{ required: true, message: t('messages:error-message-empty-input') }]}
                >
                    <Select style={{ height: '20px', marginBottom: '5px' }}>
                        {articlesList?.map((option: any) => (
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
