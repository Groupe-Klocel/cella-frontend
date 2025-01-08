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
import useTranslation from 'next-translate/useTranslation';
import { Checkbox, Col, Form, Input, InputNumber, Modal, Row, Select } from 'antd';
import { useEffect, useState } from 'react';
import {
    SimpleGetInProgressStockOwnersQuery,
    UpdateArticlesMutation,
    UpdateArticlesMutationVariables,
    useListConfigsForAScopeQuery,
    useListParametersForAScopeQuery,
    useSimpleGetInProgressStockOwnersQuery,
    useUpdateArticlesMutation
} from 'generated/graphql';
import { showError, showSuccess } from '@helpers';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import { CheckboxChangeEvent } from 'antd/lib/checkbox';

export interface IEditArticlesRenderModalProps {
    visible: boolean;
    rows: any;
    showhideModal: () => void;
    refetch: boolean;
    setRefetch: () => void;
}

const EditArticlesRenderModal = ({
    visible,
    showhideModal,
    rows,
    setRefetch
}: IEditArticlesRenderModalProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const [form] = Form.useForm();
    const errorMessageUpdateData = t('messages:error-update-data');
    const successMessageUpdateData = t('messages:success-updated');
    const [cubingTypes, setCubingTypes] = useState<any>();
    const [featureTypes, setFeatureTypes] = useState<any>();
    const [rotations, setRotations] = useState<any>();
    const [statuses, setStatuses] = useState<any>();
    const [familyArticle, setFamilyArticle] = useState<any>();
    const [subFamilyArticle, setSubFamilyArticle] = useState<any>();
    const [stockOwners, setStockOwners] = useState<any>();

    //To render Simple In progress stock owners list
    const stockOwnersList = useSimpleGetInProgressStockOwnersQuery<
        Partial<SimpleGetInProgressStockOwnersQuery>,
        Error
    >(graphqlRequestClient);

    useEffect(() => {
        if (stockOwnersList) {
            setStockOwners(stockOwnersList?.data?.stockOwners?.results);
        }
    }, [stockOwnersList]);

    //To render cubing_types from configs
    const cubingTypesTextList = useListConfigsForAScopeQuery(graphqlRequestClient, {
        scope: 'article_cubing_type',
        language: router.locale
    });
    useEffect(() => {
        if (cubingTypesTextList) {
            setCubingTypes(cubingTypesTextList?.data?.listConfigsForAScope);
        }
    }, [cubingTypesTextList.data]);

    //To render feature_types from parameters
    const featureTypesTextList = useListParametersForAScopeQuery(graphqlRequestClient, {
        scope: 'feature_type',
        language: router.locale
    });
    useEffect(() => {
        if (featureTypesTextList) {
            setFeatureTypes(featureTypesTextList?.data?.listParametersForAScope);
        }
    }, [featureTypesTextList.data]);

    //To render article_family from parameters
    const familyArticleList = useListParametersForAScopeQuery(graphqlRequestClient, {
        scope: 'article_family',
        language: router.locale
    });
    useEffect(() => {
        if (familyArticleList) {
            setFamilyArticle(familyArticleList?.data?.listParametersForAScope);
        }
    }, [familyArticleList.data]);

    //To render article_subfamily from parameters
    const subFamilyArticleList = useListParametersForAScopeQuery(graphqlRequestClient, {
        scope: 'article_subfamily',
        language: router.locale
    });
    useEffect(() => {
        if (subFamilyArticleList) {
            setSubFamilyArticle(subFamilyArticleList?.data?.listParametersForAScope);
        }
    }, [subFamilyArticleList.data]);

    //To render rotations from parameters
    const rotationsTextList = useListParametersForAScopeQuery(graphqlRequestClient, {
        scope: 'rotation',
        language: router.locale
    });
    useEffect(() => {
        if (rotationsTextList) {
            setRotations(rotationsTextList?.data?.listParametersForAScope);
        }
    }, [rotationsTextList.data]);

    //To render statuses from parameters
    const statusesTextList = useListConfigsForAScopeQuery(graphqlRequestClient, {
        scope: 'article_status',
        language: router.locale
    });
    useEffect(() => {
        if (statusesTextList) {
            setStatuses(statusesTextList?.data?.listConfigsForAScope);
        }
    }, [statusesTextList.data]);

    //Checkbox baseUnitPicking
    const onBaseUnitPickingChange = (e: CheckboxChangeEvent) => {
        form.setFieldsValue({ baseUnitPicking: e.target.checked });
    };

    //Checkbox endOfLife
    const onEndOfLifeChange = (e: CheckboxChangeEvent) => {
        form.setFieldsValue({ endOfLife: e.target.checked });
    };

    //Checkbox permanentProduct
    const onPermanentProductChange = (e: CheckboxChangeEvent) => {
        form.setFieldsValue({ permanentProduct: e.target.checked });
    };

    // UPDATE Articles
    const {
        mutate,
        isPending: updateLoading,
        data
    } = useUpdateArticlesMutation<Error>(graphqlRequestClient, {
        onSuccess: (
            data: UpdateArticlesMutation,
            _variables: UpdateArticlesMutationVariables,
            _context: any
        ) => {
            showSuccess(successMessageUpdateData);
            setRefetch();
            form.resetFields();
        },
        onError: (err) => {
            showError(errorMessageUpdateData);
        }
    });

    const updateArticles = ({ input, ids }: UpdateArticlesMutationVariables) => {
        mutate({ input, ids });
    };

    const handleCancel = () => {
        showhideModal();
        form.resetFields();
    };

    const onClickOk = () => {
        form.validateFields()
            .then(() => {
                const formData = form.getFieldsValue(true);
                updateArticles({ input: formData, ids: rows.selectedRowKeys });
            })
            .catch((err) => {
                showError(errorMessageUpdateData);
            });
        showhideModal();
    };

    return (
        <Modal
            title={t('actions:edit-articles')}
            open={visible}
            onOk={onClickOk}
            onCancel={handleCancel}
            width="80vw"
        >
            <Form form={form} layout="vertical" scrollToFirstError>
                <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }} justify="center">
                    <Col xs={2} xl={3}>
                        <Form.Item label={t('d:length')} name="length">
                            <InputNumber min={0} />
                        </Form.Item>
                        <Form.Item label={t('d:width')} name="width">
                            <InputNumber min={0} />
                        </Form.Item>
                        <Form.Item label={t('d:height')} name="height">
                            <InputNumber min={0} />
                        </Form.Item>
                        <Form.Item label={t('d:baseUnitWeight')} name="baseUnitWeight">
                            <InputNumber min={0} />
                        </Form.Item>
                    </Col>
                    <Col xs={3} xl={6}>
                        <Form.Item name="stockOwnerId" label={t('d:stockOwner')}>
                            <Select
                                allowClear
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('d:stockOwner')
                                })}`}
                            >
                                <Select.Option value={null}> </Select.Option>
                                {stockOwners?.map((stockOwner: any) => (
                                    <Select.Option key={stockOwner.id} value={stockOwner.id}>
                                        {stockOwner.name}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item label={t('d:family')} name="family">
                            <Select
                                allowClear
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('d:family')
                                })}`}
                            >
                                <Select.Option value={null}> </Select.Option>
                                {familyArticle?.map((familyArticle: any) => (
                                    <Select.Option
                                        key={parseInt(familyArticle.code)}
                                        value={familyArticle.code}
                                    >
                                        {familyArticle.text}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item label={t('d:subfamily')} name="subfamily">
                            <Select
                                allowClear
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('d:subfamily')
                                })}`}
                            >
                                <Select.Option value={null}> </Select.Option>
                                {subFamilyArticle?.map((subFamilyArticle: any) => (
                                    <Select.Option
                                        key={parseInt(subFamilyArticle.code)}
                                        value={subFamilyArticle.code}
                                    >
                                        {subFamilyArticle.text}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item label={t('d:cubingType')} name="cubingType">
                            <Select
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('d:cubingType')
                                })}`}
                            >
                                {cubingTypes?.map((cubingTypes: any) => (
                                    <Select.Option
                                        key={parseInt(cubingTypes.code)}
                                        value={parseInt(cubingTypes.code)}
                                    >
                                        {cubingTypes.text}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item label={t('d:featureType')} name="featureType">
                            <Select
                                allowClear
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('d:featureType')
                                })}`}
                            >
                                <Select.Option value={null}> </Select.Option>
                                {featureTypes?.map((featureTypes: any) => (
                                    <Select.Option
                                        key={parseInt(featureTypes.code)}
                                        value={parseInt(featureTypes.code)}
                                    >
                                        {featureTypes.text}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col xs={3} xl={6}>
                        <Form.Item label={t('d:countryOfOrigin')} name="countryOfOrigin">
                            <Input />
                        </Form.Item>
                        <Form.Item label={t('d:supplierName')} name="supplierName">
                            <Input />
                        </Form.Item>
                        <Form.Item label={t('d:baseUnitRotation')} name="baseUnitRotation">
                            <Select
                                allowClear
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('d:baseUnitRotation')
                                })}`}
                            >
                                <Select.Option value={null}> </Select.Option>
                                {rotations?.map((rotations: any) => (
                                    <Select.Option
                                        key={parseInt(rotations.code)}
                                        value={parseInt(rotations.code)}
                                    >
                                        {rotations.text}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item label={t('d:groupingId')} name="groupingId">
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col xs={2} xl={4}>
                        <Form.Item label={t('d:baseUnitPicking')} name="baseUnitPicking">
                            <Checkbox onChange={onBaseUnitPickingChange}></Checkbox>
                        </Form.Item>
                        <Form.Item label={t('d:endOfLife')} name="endOfLife">
                            <Checkbox onChange={onEndOfLifeChange}></Checkbox>
                        </Form.Item>
                        <Form.Item label={t('d:permanentProduct')} name="permanentProduct">
                            <Checkbox onChange={onPermanentProductChange}></Checkbox>
                        </Form.Item>
                        <Form.Item label={t('d:status')} name="status">
                            <Select
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('d:status')
                                })}`}
                            >
                                {statuses?.map((statuses: any) => (
                                    <Select.Option
                                        key={parseInt(statuses.code)}
                                        value={parseInt(statuses.code)}
                                    >
                                        {statuses.text}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
        </Modal>
    );
};

export { EditArticlesRenderModal };
