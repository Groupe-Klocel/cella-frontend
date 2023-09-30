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
import { Button, Col, Input, Row, Form, Select, Checkbox } from 'antd';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { showError, showSuccess, useArticleLus, getRulesWithNoSpacesValidator } from '@helpers';

import { CheckboxChangeEvent } from 'antd/lib/checkbox';

interface IOption {
    value: string;
    id: string;
}
const { Option } = Select;

export interface ISingleItemProps {
    articleId: string | any;
    articleName: string | any;
    stockOwnerId: string | any;
    stockOwnerName: string | any;
}

export const AddArticleBarcodeForm = (props: ISingleItemProps) => {
    const { t } = useTranslation('common');
    const router = useRouter();

    // TEXTS TRANSLATION ( REFACTORING POSSIBLE / EXPORT / DON'T KNOW YET )
    const stockOwner = t('d:stockOwner');
    const name = t('common:name');
    const article = t('common:article');
    const master = t('d:master');
    const logisticUnit = t('d:logisticUnit');
    const errorMessageEmptyInput = t('messages:error-message-empty-input');
    const submit = t('actions:submit');
    const cancel = t('actions:cancel');

    // END TEXTS TRANSLATION

    // TYPED SAFE ALL
    const [form] = Form.useForm();
    const [articleLus, setArticleLus] = useState<any>();
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // to render article_lu list and thus Lu related to selected article
    const articleLuData = useArticleLus({ articleId: props.articleId }, 1, 100, null);

    useEffect(() => {
        if (articleLuData) {
            setArticleLus(articleLuData?.data?.articleLus);
        }
    }, [articleLuData]);

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                const formData = form.getFieldsValue(true);
                setIsLoading(true);
                const fetchData = async () => {
                    const res = await fetch(`/api/barcodes/barcode_create/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            input: formData
                        })
                    });

                    if (res.ok) {
                        router.push(`/articles/${props.articleId}`);
                        showSuccess(t('messages:success-created'));
                    }
                    if (!res.ok) {
                        const errorResponse = await res.json();
                        if (errorResponse.error.response.errors[0].extensions) {
                            showError(
                                t(
                                    `errors:${errorResponse.error.response.errors[0].extensions.code}`
                                )
                            );
                        } else {
                            showError(t('messages:error-creating-data'));
                        }
                    }
                    if (res) {
                        setIsLoading(false);
                        form.resetFields();
                    }
                };
                fetchData();
            })
            .catch((err) => {
                showError(t('messages:error-creating-data'));
            });
    };

    useEffect(() => {
        const tmp_details = {
            articleName: props.articleName,
            articleId: props.articleId,
            stockOwnerId: props.stockOwnerId,
            stockOwnerName: props.stockOwnerName
        };
        form.setFieldsValue(tmp_details);
    }, []);

    const onMasterChange = (e: CheckboxChangeEvent) => {
        form.setFieldsValue({ master: e.target.checked });
    };

    return (
        <WrapperForm>
            <Form form={form} scrollToFirstError>
                <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                    <Col xs={8} xl={12}>
                        <Form.Item
                            label={name}
                            name="name"
                            rules={getRulesWithNoSpacesValidator(
                                [{ required: true, message: errorMessageEmptyInput }],
                                t('messages:error-space')
                            )}
                        >
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Form.Item
                            name="stockOwnerName"
                            label={stockOwner}
                            rules={[{ required: true, message: errorMessageEmptyInput }]}
                        >
                            <Input disabled />
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Form.Item
                            label={article}
                            name="articleName"
                            rules={[{ required: true, message: errorMessageEmptyInput }]}
                        >
                            <Input disabled />
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Form.Item
                            label={logisticUnit}
                            name="articleLuId"
                            rules={[{ required: false, message: errorMessageEmptyInput }]}
                        >
                            {
                                <Select>
                                    placeholder=
                                    {`${t('messages:please-select-a', {
                                        name: t('common:logistic-unit')
                                    })}`}
                                    {articleLus?.results?.map((articleLu: any) => (
                                        <Option key={articleLu.id} value={articleLu.id}>
                                            {articleLu.name}
                                        </Option>
                                    ))}
                                </Select>
                            }
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Form.Item label={master} name="master">
                            <Checkbox onChange={onMasterChange}>{master}</Checkbox>
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
            <div style={{ textAlign: 'center' }}>
                <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                    <Col xs={24} xl={12}>
                        <Button type="primary" loading={isLoading} onClick={onFinish}>
                            {submit}
                        </Button>
                    </Col>
                    <Col xs={24} xl={12}>
                        <Button danger onClick={() => router.back()}>
                            {cancel}
                        </Button>
                    </Col>
                </Row>
            </div>
        </WrapperForm>
    );
};
