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
import { Button, Col, Input, Row, Form, Select, Checkbox, InputNumber, Modal } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import {
    useCreateArticleLuMutation,
    CreateArticleLuMutationVariables,
    useGetArticleLuRotationsParamsQuery,
    GetArticleLuRotationsParamsQuery,
    CreateArticleLuMutation,
    useListParametersForAScopeQuery
} from 'generated/graphql';
import {
    showError,
    showSuccess,
    showInfo,
    useHandlingUnitModels,
    getRulesWithNoSpacesValidator,
    useLogisticUnits,
    useArticleLus,
    useLocations,
    usePatternIds
} from '@helpers';

import { CheckboxChangeEvent } from 'antd/lib/checkbox';
import { FormOptionType } from 'models/Models';
import configs from '../../../../common/configs.json';
import parameters from '../../../../common/parameters.json';
import TextArea from 'antd/es/input/TextArea';

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

export const AddArticleLogisticUnitForm = (props: ISingleItemProps) => {
    const { t } = useTranslation('common');
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
    const description = t('common:description');
    const handlingUnitModel = t('d:handlingUnitModel');
    const logisticUnitModel = t('d:logisticUnitModel');
    const parentLogisticUnit = t('d:parentLogisticUnit');
    const replenish = t('d:replenishByParentLu');
    const name = t('d:name');
    const errorMessageEmptyInput = t('messages:error-message-empty-input');
    const submit = t('actions:submit');
    const cancel = t('actions:cancel');
    const preparationModeLabel = t('d:preparationMode');
    const sortType = t('d:sortType');
    const pickingType = t('d:pickingType');
    const pickingLocation = t('d:pickingLocation');
    const automaticPickingLocationPattern = t('d:automaticPickingLocationPattern');
    const automaticStorageLocationPattern = t('d:automaticStorageLocationPattern');
    const expansionCoefficient = t('d:expansionCoefficient');
    const emptyCoefficient = t('d:emptyCoefficient');
    const minimumReplenishmentThreshold = t('d:minimumReplenishmentThreshold');
    const maximumReplenishmentThreshold = t('d:maximumReplenishmentThreshold');
    // END TEXTS TRANSLATION

    // TYPED SAFE ALL
    const [form] = Form.useForm();
    const [handlingUnitModels, setHandlingUnitModels] = useState<any>();
    const [logisticUnitModels, setLogisticUnitModels] = useState<any>();
    const [articleLus, setArticleLus] = useState<any>();
    const [articleLuRotations, setArticleLuRotations] = useState<any>();
    const handlingUnitModelData = useHandlingUnitModels({}, 1, 100, null);
    const logisticUnitModelData = useLogisticUnits({}, 1, 100, null);
    const locationData = useLocations({}, 1, 100, null);
    const patternData = usePatternIds({}, 1, 100, null);
    const articleLuData = useArticleLus({}, 1, 100, null);
    const [preparationMode, setModePreparation] = useState<Array<FormOptionType>>();
    const [disableReplenish, setDisableReplenish] = useState<boolean>(false);
    const [sortTypes, setSortTypes] = useState<Array<FormOptionType>>();
    const [pickingTypes, setPickingTypes] = useState<Array<FormOptionType>>();
    const [locations, setLocations] = useState<Array<FormOptionType>>();
    const [patterns, setPatterns] = useState<Array<FormOptionType>>();

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

    // Retrieve Logistic Unit Models list
    useEffect(() => {
        if (logisticUnitModelData.data) {
            const newIdOpts: Array<FormOptionType> = [];
            logisticUnitModelData.data.logisticUnits?.results.forEach(
                ({ id, name, status, stockOwnerId }) => {
                    if (status != configs.LOGISTIC_UNIT_STATUS_CLOSED) {
                        if (
                            (props.stockOwnerId && stockOwnerId == props.stockOwnerId) ||
                            (!props.stockOwnerId && stockOwnerId == null)
                        ) {
                            newIdOpts.push({ text: name!, key: id! });
                        }
                    }
                }
            );
            setLogisticUnitModels(newIdOpts);
        }
    }, [logisticUnitModelData.data]);

    // Retrieve Article LU list
    useEffect(() => {
        if (articleLuData.data) {
            const newIdOpts: Array<FormOptionType> = [];
            articleLuData.data.articleLus?.results.forEach(
                ({ id, name, stockOwnerId, articleId }) => {
                    if (stockOwnerId == props.stockOwnerId && articleId == props.articleId)
                        newIdOpts.push({ text: name!, key: id! });
                }
            );
            setArticleLus(newIdOpts);
        }
    }, [articleLuData.data]);

    // Retrieve sort types
    const sortTypesList = useListParametersForAScopeQuery(graphqlRequestClient, {
        language: router.locale,
        scope: 'stock_sort_type'
    });
    useEffect(() => {
        if (sortTypesList) {
            const newSortType: Array<FormOptionType> = [];

            const parameters = sortTypesList?.data?.listParametersForAScope;
            if (parameters) {
                parameters.forEach((item) => {
                    newSortType.push({ key: parseInt(item.code), text: item.text });
                });
                setSortTypes(newSortType);
            }
        }
    }, [sortTypesList.data]);

    // Retrieve picking types
    const pickingTypesList = useListParametersForAScopeQuery(graphqlRequestClient, {
        language: router.locale,
        scope: 'picking_type'
    });
    useEffect(() => {
        if (pickingTypesList) {
            const newPickingType: Array<FormOptionType> = [];

            const parameters = pickingTypesList?.data?.listParametersForAScope;
            if (parameters) {
                parameters.forEach((item) => {
                    newPickingType.push({ key: parseInt(item.code), text: item.text });
                });
                setPickingTypes(newPickingType);
            }
        }
    }, [pickingTypesList.data]);

    // Retrieve locations list
    useEffect(() => {
        if (locationData.data) {
            const newIdOpts: Array<FormOptionType> = [];
            locationData.data.locations?.results.forEach(({ id, name, status, category }) => {
                if (
                    status != configs.LOCATION_STATUS_DISABLED &&
                    category === configs.LOCATION_CATEGORY_PICKING
                )
                    newIdOpts.push({ text: name!, key: id! });
            });
            setLocations(newIdOpts);
        }
    }, [locationData.data]);

    // Retrieve patterns list
    useEffect(() => {
        if (patternData.data) {
            const newIdOpts: Array<FormOptionType> = [];
            patternData.data.patterns?.results.forEach(({ id, name }) => {
                newIdOpts.push({ text: name!, key: id! });
            });
            setPatterns(newIdOpts);
        }
    }, [patternData.data]);

    //manage call back on LU Model change
    const handleLUModelChange = (key: any, value: any) => {
        // if we clear the select, we clear the form
        if (value === null || value === undefined) {
            form.setFieldsValue({
                name: null,
                length: null,
                width: null,
                height: null,
                baseUnitWeight: null
            });
        }

        // if we select a new value, we fill the form
        if (logisticUnitModelData.data) {
            logisticUnitModelData.data.logisticUnits?.results.forEach((luModel: any) => {
                if (luModel.id == key) {
                    form.setFieldsValue({
                        name: luModel.name,
                        length: luModel.length,
                        width: luModel.width,
                        height: luModel.height,
                        baseUnitWeight: luModel.baseUnitWeight
                    });
                }
            });
        }
    };

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

    const [isPickingLocationDisplay, setIsPickingLocationDisplay] = useState<boolean>(false);
    // handle call back on Cycle Count Type change for displays
    const handlePickingTypeChange = (value: any) => {
        console.log(value);
        setIsPickingLocationDisplay(false);

        if (value == parameters.PICKING_TYPE_FIXED) {
            setIsPickingLocationDisplay(true);
        }
    };

    // Create Mutation
    const { mutate, isPending: createLoading } = useCreateArticleLuMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: CreateArticleLuMutation,
                _variables: CreateArticleLuMutationVariables,
                _context: any
            ) => {
                router.push(`/articles/lu/${data.createArticleLu.id}`);
                showSuccess(t('messages:success-created'));
            },
            onError: (err) => {
                showError(t('messages:error-creating-data'));
            }
        }
    );

    const createArticleLu = ({ input }: CreateArticleLuMutationVariables) => {
        mutate({ input });
    };

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                // Here make api call of something else
                const formData = form.getFieldsValue(true);

                if (formData['stockOwnerId'] == '') formData['stockOwnerId'] = null;
                formData.luIdStr = formData.logisticUnit;
                formData.status = configs.ARTICLE_LU_STATUS_IN_PROGRESS;

                delete formData.articleName;
                delete formData.stockOwnerName;
                delete formData.logisticUnit;
                createArticleLu({ input: formData });
                setUnsavedChanges(false);
            })
            .catch((err) => {
                showError(t('messages:error-creating-data'));
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
            articleName: props.articleName,
            articleId: props.articleId,
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
                        <Form.Item label={logisticUnitModel} name="logisticUnit">
                            <Select
                                allowClear
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('d:logisticUnitModel')
                                })}`}
                                onChange={handleLUModelChange}
                            >
                                {logisticUnitModels?.map((lu: any) => (
                                    <Option key={lu.key} value={lu.key}>
                                        {lu.text}
                                    </Option>
                                ))}
                            </Select>
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
                            label={quantity}
                            name="quantity"
                            rules={[{ required: true, message: errorMessageEmptyInput }]}
                        >
                            <InputNumber />
                        </Form.Item>
                    </Col>
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
                            >
                                {replenish}
                            </Checkbox>
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Form.Item label={sortType} name="sortType">
                            <Select
                                allowClear
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('d:sortType')
                                })}`}
                            >
                                {sortTypes?.map((sortType: any) => (
                                    <Option key={sortType.key} value={sortType.key}>
                                        {sortType.text}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item label={pickingType} name="pickingType">
                            <Select
                                allowClear
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('d:pickingType')
                                })}`}
                                onChange={handlePickingTypeChange}
                            >
                                {pickingTypes?.map((pickingType: any) => (
                                    <Option key={pickingType.key} value={pickingType.key}>
                                        {pickingType.text}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Form.Item label={description} name="description">
                            <TextArea />
                        </Form.Item>
                    </Col>
                    {isPickingLocationDisplay && (
                        <Col xs={8} xl={12}>
                            <Form.Item label={pickingLocation} name="pickingLocationId">
                                <Select
                                    allowClear
                                    placeholder={`${t('messages:please-select-a', {
                                        name: t('d:pickingLocation')
                                    })}`}
                                >
                                    {locations?.map((location: any) => (
                                        <Option key={location.key} value={location.key}>
                                            {location.text}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    )}
                </Row>
                <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                    <Col xs={8} xl={12}>
                        <Form.Item
                            label={automaticPickingLocationPattern}
                            name="automaticPickingLocationPatternId"
                        >
                            <Select
                                allowClear
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('d:automaticPickingLocationPattern')
                                })}`}
                            >
                                {patterns?.map((pattern: any) => (
                                    <Option key={pattern.key} value={pattern.key}>
                                        {pattern.text}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Form.Item
                            label={automaticStorageLocationPattern}
                            name="automaticStorageLocationPatternId"
                        >
                            <Select
                                allowClear
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('d:automaticStorageLocationPattern')
                                })}`}
                            >
                                {patterns?.map((pattern: any) => (
                                    <Option key={pattern.key} value={pattern.key}>
                                        {pattern.text}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Form.Item label={expansionCoefficient} name="expansionCoefficient">
                            <InputNumber />
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Form.Item label={emptyCoefficient} name="emptyCoefficient">
                            <InputNumber />
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Form.Item
                            label={minimumReplenishmentThreshold}
                            name="minimumReplenishmentThreshold"
                        >
                            <InputNumber min={0} />
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Form.Item
                            label={maximumReplenishmentThreshold}
                            name="maximumReplenishmentThreshold"
                        >
                            <InputNumber min={0} />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
            <div style={{ textAlign: 'center' }}>
                <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                    <Col xs={24} xl={12}>
                        <Button type="primary" loading={createLoading} onClick={onFinish}>
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
