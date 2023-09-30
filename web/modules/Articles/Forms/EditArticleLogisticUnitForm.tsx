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
import {
    getRulesWithNoSpacesValidator,
    showError,
    showInfo,
    showSuccess,
    useArticleLus,
    useHandlingUnitModels
} from '@helpers';
import { Button, Col, Form, Input, InputNumber, Modal, Row, Select } from 'antd';
import Checkbox, { CheckboxChangeEvent } from 'antd/lib/checkbox';
import { useAuth } from 'context/AuthContext';
import {
    GetArticleLuRotationsParamsQuery,
    UpdateArticleLuMutation,
    UpdateArticleLuMutationVariables,
    useGetArticleLuRotationsParamsQuery,
    useListParametersForAScopeQuery,
    useUpdateArticleLuMutation
} from 'generated/graphql';
import useTranslation from 'next-translate/useTranslation';
import { useRouter } from 'next/router';
import { FC, useEffect, useState } from 'react';
import configs from '../../../../common/configs.json';
import parameters from '../../../../common/parameters.json';
import { FormOptionType } from 'models/ModelsV2';

export type EditArticleLogisticUnitFormProps = {
    details: any;
};

const { Option } = Select;

interface IOption {
    value: string;
    id: string;
}

export const EditArticleLogisticUnitForm: FC<EditArticleLogisticUnitFormProps> = ({
    details
}: EditArticleLogisticUnitFormProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes

    // prompt the user if they try and leave with unsaved changes
    useEffect(() => {
        const handleWindowClose = (e: BeforeUnloadEvent) => {
            if (!unsavedChanges) return;
            e.preventDefault();
            return (e.returnValue = t('messages:confirm-leaving-page'));
        };
        const handleBrowseAway = () => {
            if (!unsavedChanges) return;
            if (window.confirm(t('messages:confirm-leaving-page'))) return;
            router.events.emit('routeChangeError');
            throw 'routeChange aborted.';
        };
        window.addEventListener('beforeunload', handleWindowClose);
        router.events.on('routeChangeStart', handleBrowseAway);
        return () => {
            window.removeEventListener('beforeunload', handleWindowClose);
            router.events.off('routeChangeStart', handleBrowseAway);
        };
    }, [unsavedChanges]);

    // TEXTS TRANSLATION ( REFACTORING POSSIBLE / EXPORT / DON'T KNOW YET )
    const stockOwner = t('d:stockOwner');
    const quantity = t('common:quantity');
    const rotation = t('d:rotation');
    const width = t('d:width');
    const height = t('d:height');
    const length = t('d:length');
    const baseUnitWeight = t('d:baseUnitWeight');
    const article = t('common:article');
    const handlingUnitModel = t('d:handlingUnitModel');
    const parentLogisticUnit = t('d:parentLogisticUnit');
    const replenish = t('d:replenishByParentLu');
    const name = t('d:name');
    const errorMessageEmptyInput = t('messages:error-message-empty-input');
    const errorMessageUpdateData = t('messages:error-update-data');
    const submit = t('actions:submit');
    const cancel = t('actions:cancel');
    const preparationModeLabel = t('d:preparationMode');
    // END TEXTS TRANSLATION

    const [handlingUnitModels, setHandlingUnitModels] = useState<any>();
    const [articleLus, setArticleLus] = useState<any>();
    const [articleLuRotations, setArticleLuRotations] = useState<any>();
    const handlingUnitModelData = useHandlingUnitModels({}, 1, 100, null);
    const articleLuData = useArticleLus({}, 1, 100, null);
    const [preparationMode, setModePreparation] = useState<Array<FormOptionType>>();
    const [disableReplenish, setDisableReplenish] = useState<boolean>(false);
    const [replenishValue, setReplenishValue] = useState(details.blacklisted);

    // Retrieve Preparation Modes list
    const modePreparationList = useListParametersForAScopeQuery(graphqlRequestClient, {
        language: router.locale,
        scope: 'preparation_mode'
    });

    useEffect(() => {
        if (modePreparationList) {
            const newModePreparation: Array<FormOptionType> = [];

            const cData = modePreparationList?.data?.listParametersForAScope;
            if (cData) {
                cData.forEach((item) => {
                    newModePreparation.push({ key: parseInt(item.code), text: item.text });
                });
                setModePreparation(newModePreparation);
            }
        }
    }, [modePreparationList.data]);

    // Retrieve Packagings list
    useEffect(() => {
        if (handlingUnitModelData.data) {
            const newIdOpts: Array<FormOptionType> = [];
            handlingUnitModelData.data.handlingUnitModels?.results.forEach(
                ({ id, name, status }) => {
                    if (status != configs.HANDLING_UNIT_MODEL_STATUS_CLOSED)
                        newIdOpts.push({ text: name!, key: id! });
                }
            );
            setHandlingUnitModels(newIdOpts);
        }
    }, [handlingUnitModelData.data]);

    // Retrieve Article LU list
    useEffect(() => {
        if (articleLuData.data) {
            const newIdOpts: Array<FormOptionType> = [];
            articleLuData.data.articleLus?.results.forEach(
                ({ id, name, stockOwnerId, articleId }) => {
                    if (
                        stockOwnerId == details.stockOwnerId &&
                        articleId == details.articleId &&
                        id != details.id
                    )
                        newIdOpts.push({ text: name!, key: id! });
                }
            );
            setArticleLus(newIdOpts);
        }
    }, [articleLuData.data]);

    //manage call back on HU Model change
    const handleHUModelChange = (key: any, value: any) => {
        // if we clear the select, we clear the form
        if (value === null || value === undefined) {
            setDisableReplenish(false);
        }

        // if we select a new value, we fill the form
        if (handlingUnitModelData.data) {
            handlingUnitModelData.data.handlingUnitModels?.results.forEach((huModel: any) => {
                if (
                    huModel.id == key &&
                    huModel.category == parameters.HANDLING_UNIT_MODEL_CATEGORY_OUTBOUND
                ) {
                    setDisableReplenish(true);
                } else {
                    setDisableReplenish(false);
                }
            });
        }
    };

    //manage call back on change checkbox
    const onReplenishChange = (e: CheckboxChangeEvent) => {
        form.setFieldsValue({ replenish: e.target.checked });
    };

    //To render articleLu rotations from params table for the given scope
    const articleLuRotationList = useGetArticleLuRotationsParamsQuery<
        Partial<GetArticleLuRotationsParamsQuery>,
        Error
    >(graphqlRequestClient);

    useEffect(() => {
        if (articleLuRotationList) {
            setArticleLuRotations(articleLuRotationList?.data?.listParametersForAScope);
        }
    }, [articleLuRotationList]);

    // UPDATE MUTATION
    const { mutate, isLoading: updateLoading } = useUpdateArticleLuMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: UpdateArticleLuMutation,
                _variables: UpdateArticleLuMutationVariables,
                _context: any
            ) => {
                router.push(`/articles/lu/${data?.updateArticleLu?.id}`);
                showSuccess(t('messages:success-updated'));
            },
            onError: (err) => {
                showError(t('messages:error-creating-data'));
            }
        }
    );

    const updateArticleLu = ({ id, input }: UpdateArticleLuMutationVariables) => {
        mutate({ id, input });
    };

    const onFinish = () => {
        console.log('IKI2', form.getFieldsValue(true));
        form.validateFields()
            .then(() => {
                const formData = form.getFieldsValue(true);
                delete formData['stockOwner'];
                delete formData['stockOwnerName'];
                delete formData['article'];
                delete formData['articleName'];
                delete formData['handlingUnitModel'];
                delete formData['parentLogisticUnit'];
                delete formData['preparationModeText'];
                delete formData['rotationText'];
                updateArticleLu({ input: formData, id: details.id });
            })
            .catch((err) => {
                showError(errorMessageUpdateData);
            });
    };

    const onCancel = () => {
        setUnsavedChanges(false);
        Modal.confirm({
            title: t('messages:confirm-leaving-page'),
            onOk: () => {
                router.back();
            },
            okText: t('common:bool-yes'),
            cancelText: t('common:bool-no')
        });
    };

    useEffect(() => {
        const tmp_details = {
            ...details,
            articleName: details.article.name,
            stockOwnerName: details.stockOwner.name
        };
        delete tmp_details['id'];
        delete tmp_details['created'];
        delete tmp_details['createdBy'];
        delete tmp_details['modified'];
        delete tmp_details['modifiedBy'];

        if (
            details.handlingUnitModel.category == parameters.HANDLING_UNIT_MODEL_CATEGORY_OUTBOUND
        ) {
            setDisableReplenish(true);
            setReplenishValue(details.replenish);
        } else {
            setDisableReplenish(false);
        }

        form.setFieldsValue(tmp_details);

        if (updateLoading) {
            showInfo(t('messages:info-update-wip'));
        }
    }, [updateLoading]);

    return (
        <WrapperForm>
            <Form form={form} scrollToFirstError>
                <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                    <Col xs={8} xl={12}>
                        <Form.Item name="stockOwnerName" label={stockOwner}>
                            <Input disabled />
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Form.Item label={article} name="articleName">
                            <Input disabled />
                        </Form.Item>
                    </Col>
                </Row>
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
                        <Form.Item label={parentLogisticUnit} name="parentLogisticUnitId">
                            <Select
                                allowClear
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('d:parentLogisticUnit')
                                })}`}
                            >
                                {articleLus?.map((articleLu: any) => (
                                    <Option key={articleLu.key} value={articleLu.key}>
                                        {articleLu.text}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                    <Col xs={8} xl={12}>
                        <Form.Item
                            label={quantity}
                            name="quantity"
                            rules={[{ required: true, message: errorMessageEmptyInput }]}
                        >
                            <InputNumber />
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                    <Col xs={8} xl={12}>
                        <Form.Item
                            label={length}
                            name="length"
                            rules={[{ required: true, message: errorMessageEmptyInput }]}
                        >
                            <InputNumber />
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Form.Item
                            label={width}
                            name="width"
                            rules={[{ required: true, message: errorMessageEmptyInput }]}
                        >
                            <InputNumber />
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Form.Item
                            label={height}
                            name="height"
                            rules={[{ required: true, message: errorMessageEmptyInput }]}
                        >
                            <InputNumber />
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Form.Item
                            label={baseUnitWeight}
                            name="baseUnitWeight"
                            rules={[{ required: true, message: errorMessageEmptyInput }]}
                        >
                            <InputNumber />
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Form.Item label={preparationModeLabel} name="preparationMode">
                            <Select
                                allowClear
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('d:preparationMode')
                                })}`}
                            >
                                {preparationMode?.map((ed: any) => (
                                    <Option key={ed.key} value={ed.key}>
                                        {ed.text}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Form.Item name="rotation" label={rotation}>
                            <Select
                                allowClear
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('d:rotation')
                                })}`}
                            >
                                {articleLuRotations?.map((rotation: any) => (
                                    <Option key={rotation.id} value={parseInt(rotation.code)}>
                                        {rotation.text}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Form.Item label={handlingUnitModel} name="handlingUnitModelId">
                            <Select
                                allowClear
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('d:handlingUnitModel')
                                })}`}
                                onChange={handleHUModelChange}
                            >
                                {handlingUnitModels?.map((lu: any) => (
                                    <Option key={lu.key} value={lu.key}>
                                        {lu.text}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Form.Item name="replenish">
                            <Checkbox
                                disabled={disableReplenish === true ? false : true}
                                onChange={onReplenishChange}
                                checked={replenishValue}
                            >
                                {replenish}
                            </Checkbox>
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
            <div style={{ textAlign: 'center' }}>
                <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                    <Col xs={24} xl={12}>
                        <Button type="primary" loading={updateLoading} onClick={onFinish}>
                            {submit}
                        </Button>
                    </Col>
                    <Col xs={24} xl={12}>
                        <Button danger onClick={onCancel}>
                            {cancel}
                        </Button>
                    </Col>
                </Row>
            </div>
        </WrapperForm>
    );
};
