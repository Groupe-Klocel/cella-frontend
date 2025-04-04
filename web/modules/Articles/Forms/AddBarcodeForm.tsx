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
import { Button, Col, Input, Row, Form, Select, Checkbox, AutoComplete } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import {
    useSimpleGetInProgressStockOwnersQuery,
    SimpleGetInProgressStockOwnersQuery
} from 'generated/graphql';
import {
    showError,
    showSuccess,
    useArticleIds,
    useArticleLus,
    getRulesWithNoSpacesValidator
} from '@helpers';

import { debounce } from 'lodash';
import { CheckboxChangeEvent } from 'antd/lib/checkbox';

interface IOption {
    value: string;
    id: string;
}

const { Option } = Select;

export const AddBarcodeForm = () => {
    const { t } = useTranslation('common');
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const { id } = router.query;

    // TEXTS TRANSLATION ( REFACTORING POSSIBLE / EXPORT / DON'T KNOW YET )
    const stockOwner = t('d:stockOwnerId');
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
    const [stockOwners, setStockOwners] = useState<any>();
    const [articles, setArticles] = useState<any>();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [choosenStockOwner, setChoosenStockOwner] = useState<string>();
    const [aIdOptions, setAIdOptions] = useState<Array<IOption>>([]);
    const [articleName, setArticleName] = useState<string>('');
    const [aId, setAId] = useState<string>();
    const onChange = (data: string) => {
        setArticleName(data);
    };

    // to render article_lu list and thus Lu related to selected article
    const articleLuData = useArticleLus(null, 1, 100, null);

    useEffect(() => {
        if (articleLuData) {
            setArticleLus(articleLuData?.data?.articleLus);
        }
    }, [articleLuData]);

    //To render Simple In progress stock owners list
    const stockOwnerList = useSimpleGetInProgressStockOwnersQuery<
        Partial<SimpleGetInProgressStockOwnersQuery>,
        Error
    >(graphqlRequestClient);

    useEffect(() => {
        if (stockOwnerList) {
            setStockOwners(stockOwnerList?.data?.stockOwners?.results);
        }
    }, [stockOwnerList]);

    const onStockOwnerChange = (e: any) => {
        setChoosenStockOwner(e);
    };

    //To render all articles
    // const articleFilter = choosenStockOwner ? { stockOwnerId: `${choosenStockOwner}` } : null;

    // const articleData = useArticleIds(articleFilter, 1, 100, null);

    // useEffect(() => {
    //     if (articleData.data) {
    //         setArticles(articleData?.data?.articles?.results);
    //     }
    // }, [articleData]);

    //to render autocompleted articles list
    const articleData = useArticleIds({ name: `${articleName}%` }, 1, 100, null);

    useEffect(() => {
        const formValue = form.getFieldsValue(true);
        form.setFieldsValue({ ...formValue, articleId: aId, articleName: articleName });
    }, [aId]);

    useEffect(() => {
        if (articleData.data) {
            const newIdOpts: Array<IOption> = [];
            articleData.data.articles?.results.forEach(({ id, name }) => {
                if (form.getFieldsValue(true).articleId === id) {
                    setArticleName(name!);
                    setAId(id!);
                }
                newIdOpts.push({ value: name!, id: id! });
            });
            setAIdOptions(newIdOpts);
        }
    }, [articleData.data]);

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
                        const response = await res.json();
                        const createdBarcodeId = response.response.createdBarcode.id;
                        router.push(`/barcodes/${createdBarcodeId}`);
                        showSuccess(t('messages:success-created'));
                    }
                    if (!res.ok) {
                        const errorResponse = await res.json();
                        if (errorResponse.error) {
                            console.log(res);
                            showError(t(`errors:${errorResponse.error.code}`));
                        } else {
                            showError(t('messages:error-creating-data'));
                        }
                    }
                    if (res) {
                        setIsLoading(false);
                        form.resetFields();
                        setAId(undefined);
                        setArticleName('');
                    }
                };
                fetchData();
            })
            .catch((err) => {
                showError(t('messages:error-creating-data'));
            });
    };

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
                        <Form.Item name="stockOwnerId" label={stockOwner}>
                            <Select
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('common:stock-owner')
                                })}`}
                                onChange={onStockOwnerChange}
                                allowClear
                                showSearch
                                filterOption={(input, option) =>
                                    option?.props.children
                                        .toLowerCase()
                                        .indexOf(input.toLowerCase()) >= 0
                                }
                            >
                                {stockOwners?.map((stockOwner: any) => (
                                    <Option key={stockOwner.id} value={stockOwner.id}>
                                        {stockOwner.name}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Form.Item
                            label={article}
                            name="articleName"
                            rules={[{ required: true, message: errorMessageEmptyInput }]}
                        >
                            <AutoComplete
                                placeholder={`${t('messages:please-fill-letter-your', {
                                    name: t('d:articleName')
                                })}`}
                                style={{ width: '100%' }}
                                options={aIdOptions}
                                value={articleName}
                                filterOption={(inputValue, option) =>
                                    option!.value
                                        .toUpperCase()
                                        .indexOf(inputValue.toUpperCase()) !== -1
                                }
                                onKeyUp={(e: any) => {
                                    debounce(() => {
                                        setArticleName(e.target.value);
                                    }, 3000);
                                }}
                                onSelect={(value, option) => {
                                    setAId(option.id);
                                    setArticleName(value);
                                }}
                                allowClear
                                onChange={onChange}
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Form.Item
                            label={logisticUnit}
                            name="articleLuId"
                            rules={[{ required: false, message: errorMessageEmptyInput }]}
                        >
                            {
                                <Select
                                    allowClear
                                    showSearch
                                    placeholder={`${t('messages:please-select-a', {
                                        name: t('common:logistic-unit')
                                    })}`}
                                    filterOption={(input, option) =>
                                        option?.props.children
                                            .toLowerCase()
                                            .indexOf(input.toLowerCase()) >= 0
                                    }
                                >
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
