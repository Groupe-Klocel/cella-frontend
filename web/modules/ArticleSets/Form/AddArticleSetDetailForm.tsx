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
import { WrapperForm } from '@components';
import { Button, Col, Input, Row, Form, Select, InputNumber } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import {
    useCreateArticleSetDetailMutation,
    CreateArticleSetDetailMutation,
    CreateArticleSetDetailMutationVariables
} from 'generated/graphql';
import { showError, showSuccess, showInfo, useArticleIds } from '@helpers';

import { FormOptionType } from 'models/Models';

const { Option } = Select;

export interface ISingleItemProps {
    articleSetId: string | any;
    articleSetName: string | any;
    articleId: string | any;
    articleName: string | any;
    stockOwnerId: string | any;
    stockOwnerName: string | any;
}

export const AddArticleSetDetailForm = (props: ISingleItemProps) => {
    const { t } = useTranslation('common');
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();

    const articleSet = t('menu:article-set');
    const article = t('common:article');
    const quantity = t('common:quantity');
    const stockOwner = t('common:stock-owner');
    const errorMessageEmptyInput = t('messages:error-message-empty-input');
    const submit = t('actions:submit');
    const cancel = t('actions:cancel');

    const [form] = Form.useForm();

    const [articleOption, setArticleTexts] = useState<Array<FormOptionType>>();
    const ArticleData = useArticleIds({}, 1, 100, null);

    useEffect(() => {
        if (ArticleData.data) {
            const newArticle: Array<FormOptionType> = [];
            ArticleData.data.articles?.results.forEach(({ id, name }) => {
                newArticle.push({ text: name!, key: id! });
            });
            setArticleTexts(newArticle);
        }
    }, [ArticleData.data]);

    const { mutate, isPending: createLoading } = useCreateArticleSetDetailMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: CreateArticleSetDetailMutation,
                _variables: CreateArticleSetDetailMutationVariables,
                _context: any
            ) => {
                router.push(`/article-sets/detail/${data.createArticleSetDetail.id}`);
                showSuccess(t('messages:success-created'));
            },
            onError: (err) => {
                showError(t('messages:error-creating-data'));
            }
        }
    );

    const createArticleSetDetail = ({ input }: CreateArticleSetDetailMutationVariables) => {
        mutate({ input });
    };

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                // Here make api call of something else
                const formData = form.getFieldsValue(true);
                delete formData.articleSetName;
                delete formData.stockOwnerName;
                delete formData.articleName;
                createArticleSetDetail({ input: formData });
            })
            .catch((err) => {
                showError(t('messages:error-creating-data'));
            });
    };

    useEffect(() => {
        const tmp_details = {
            articleSetId: props.articleSetId,
            articleSetName: props.articleSetName,
            articleId: props.articleId,
            articleName: props.articleName,
            stockOwnerId: props.stockOwnerId,
            stockOwnerName: props.stockOwnerName
        };
        form.setFieldsValue(tmp_details);
        if (createLoading) {
            showInfo(t('messages:info-create-wip'));
        }
    }, [createLoading]);

    return (
        <WrapperForm>
            <Form form={form} scrollToFirstError>
                <Col>
                    <Form.Item
                        name="articleSetName"
                        label={articleSet}
                        rules={[{ required: true, message: errorMessageEmptyInput }]}
                    >
                        <Input disabled />
                    </Form.Item>
                </Col>
                <Col>
                    <Form.Item name="stockOwnerName" label={stockOwner}>
                        <Input disabled />
                    </Form.Item>
                </Col>
                <Col>
                    <Form.Item
                        label={article}
                        name="articleName"
                        rules={[{ required: true, message: errorMessageEmptyInput }]}
                    >
                        <Select
                            placeholder={`${t('messages:please-select-a', {
                                name: t('d:handlingUnitModel')
                            })}`}
                        >
                            {articleOption?.map((ed: any) => (
                                <Option key={ed.key} value={ed.key}>
                                    {ed.text}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Col>
                <Col>
                    <Form.Item
                        name="quantity"
                        label={quantity}
                        rules={[{ required: true, message: errorMessageEmptyInput }]}
                    >
                        <InputNumber />
                    </Form.Item>
                </Col>
            </Form>
            <div style={{ textAlign: 'center' }}>
                <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                    <Col xs={24} xl={12}>
                        <Button danger onClick={() => router.back()}>
                            {cancel}
                        </Button>
                    </Col>
                    <Col xs={24} xl={12}>
                        <Button type="primary" loading={createLoading} onClick={onFinish}>
                            {submit}
                        </Button>
                    </Col>
                </Row>
            </div>
        </WrapperForm>
    );
};
