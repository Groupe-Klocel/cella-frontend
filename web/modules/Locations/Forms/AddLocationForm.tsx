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
import { showError, showInfo, showSuccess } from '@helpers';
import { Button, Checkbox, Divider, Form, Input, InputNumber, Modal, Select, Space } from 'antd';
import { CheckboxChangeEvent } from 'antd/lib/checkbox';
import { useAuth } from 'context/AuthContext';
import {
    GetReplenishTypesConfigsQuery,
    GetRotationsParamsQuery,
    SimpleGetAllBLocksQuery,
    useGetReplenishTypesConfigsQuery,
    useGetRotationsParamsQuery,
    useListConfigsForAScopeQuery,
    useListParametersForAScopeQuery,
    useSimpleGetAllBLocksQuery
} from 'generated/graphql';
import { FormOptionType } from 'models/Models';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import configs from '../../../../common/configs.json';
import { gql } from 'graphql-request';

const { Option } = Select;
const { TextArea } = Input;

export const AddLocationForm = () => {
    const { t } = useTranslation();
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();
    const { id } = router.query;
    const [blocks, setBlocks] = useState<any>();
    const [defaultBlock, setDefaultBlock] = useState<any>();
    const [replenishTypes, setReplenishTypes] = useState<any>();
    const [rotations, setRotations] = useState<any>();
    const [selectedReplenish, setSelectedReplenish] = useState<any>();
    const [selectedReplenishType, setSelectedReplenishType] = useState<any>(null);
    const [categoriesTexts, setCategoriesTexts] = useState<any>();
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes
    const [stockStatusesTexts, setStockStatusesTexts] = useState<any>();
    const [locationGroupIdsTexts, setLocationGroupIdsTexts] = useState<any>();
    const [createLoading, setCreateLoading] = useState(false);

    // TYPED SAFE ALL
    const [form] = Form.useForm();

    //To render replenish types from config table for the given scope
    const replenishTypesList = useGetReplenishTypesConfigsQuery<
        Partial<GetReplenishTypesConfigsQuery>,
        Error
    >(graphqlRequestClient);

    useEffect(() => {
        if (replenishTypesList) {
            setReplenishTypes(replenishTypesList?.data?.listConfigsForAScope);
        }
    }, [replenishTypesList]);

    //To render rotations from parameters table for the given scope
    const rotationsList = useGetRotationsParamsQuery<Partial<GetRotationsParamsQuery>, Error>(
        graphqlRequestClient
    );

    useEffect(() => {
        if (rotationsList) {
            setRotations(rotationsList?.data?.listParametersForAScope);
        }
    }, [rotationsList]);

    //To render Simple categories list
    const categoriesTextList = useListConfigsForAScopeQuery(graphqlRequestClient, {
        scope: 'location_category'
    });

    useEffect(() => {
        if (categoriesTextList) {
            setCategoriesTexts(categoriesTextList?.data?.listConfigsForAScope);
        }
    }, [categoriesTextList.data]);

    //To render Simple stock statuses list
    const stockStatusesTextList = useListParametersForAScopeQuery(graphqlRequestClient, {
        scope: 'stock_statuses'
    });

    useEffect(() => {
        if (stockStatusesTextList) {
            setStockStatusesTexts(stockStatusesTextList?.data?.listParametersForAScope);
        }
    }, [stockStatusesTextList.data]);

    //To render Simple location groups list
    const locationGroupIdsTextList = useListParametersForAScopeQuery(graphqlRequestClient, {
        scope: 'location_location_group_id'
    });

    useEffect(() => {
        if (locationGroupIdsTextList) {
            setLocationGroupIdsTexts(locationGroupIdsTextList?.data?.listParametersForAScope);
        }
    }, [locationGroupIdsTextList.data]);

    //To render simple blocks list for attached block selection (id and name without any filter)
    const blocksList = useSimpleGetAllBLocksQuery<Partial<SimpleGetAllBLocksQuery>, Error>(
        graphqlRequestClient,
        {
            itemsPerPage: 1000
        }
    );

    useEffect(() => {
        if (id != undefined) {
            setDefaultBlock(blocksList?.data?.blocks?.results.find((e: any) => (e.id = id)));
            const formData = form.getFieldsValue(true);
            formData['blockId'] = id;
        }
        if (blocksList) {
            setBlocks(blocksList?.data?.blocks?.results);
        }
    }, [blocksList, id]);

    // to handle display of rotations
    const handleReplenishTypeChange = (value: string) => {
        setSelectedReplenishType(value);
    };

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

    const bulkCreateLocation = async (formData: any) => {
        const blockId = formData['input']['blockId'];
        setCreateLoading(true);
        try {
            const query = gql`
                mutation executeFunction($functionName: String!, $event: JSON!) {
                    executeFunction(functionName: $functionName, event: $event) {
                        status
                        output
                    }
                }
            `;
            const variables = {
                functionName: 'bulk_create_locations',
                event: {
                    ...formData
                }
            };

            const response = await graphqlRequestClient.request(query, variables);

            if (response.executeFunction.status === 'ERROR') {
                showError(response.executeFunction.output);
            } else if (
                response.executeFunction.status === 'OK' &&
                response.executeFunction.output.status === 'KO'
            ) {
                showError(t(`errors:${response.executeFunction.output.output.code}`));
                console.log('Backend_message', response.executeFunction.output.output);
            } else {
                showSuccess(t('messages:success-created'));
                router.push(`/blocks/${blockId}`);
            }
            setCreateLoading(false);
        } catch (error) {
            showError(t('messages:error-executing-function'));
            console.log('executeFunctionError', error);
            setCreateLoading(false);
        }
    };

    const onReplenishChange = (e: CheckboxChangeEvent) => {
        setSelectedReplenish(e.target.checked);
        form.setFieldsValue({ replenish: e.target.checked });
    };

    const onStockMiniChange = (e: CheckboxChangeEvent) => {
        form.setFieldsValue({ allowCycleCountStockMin: e.target.checked });
    };

    const onHuManagementChange = (e: CheckboxChangeEvent) => {
        form.setFieldsValue({ huManagement: e.target.checked });
    };

    const onlocationGroupIdChange = (e: CheckboxChangeEvent) => {
        form.setFieldsValue({ locationGroupId: e.target.checked });
    };

    // Call api to create new group
    const onFinish = () => {
        form.validateFields()
            .then(() => {
                // Here make api call of something else
                const formData = form.getFieldsValue(true);
                formData.replenishType = parseInt(formData.replenishType);
                if (formData['replenish'] == false) formData.replenishType = 0;
                formData.replenish = formData.replenish ? true : false;
                formData.allowCycleCountStockMin = formData.allowCycleCountStockMin ? true : false;
                formData.huManagement = formData.huManagement ? true : false;
                formData.baseUnitRotation = parseInt(formData.rotation);
                formData.status = configs.LOCATION_STATUS_AVAILABLE;
                delete formData.rotation;
                delete formData.handlingUnits;

                bulkCreateLocation({ input: formData });
                setUnsavedChanges(false);
            })
            .catch((err) => {
                showError(t('error-creating-data'));
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
        if (createLoading) {
            showInfo(t('messages:info-create-wip'));
        }
    }, [createLoading]);

    const NoSpecialCharacterRule = (_: any, value: string) => {
        if (value && !/^[a-zA-Z0-9]+$/.test(value)) {
            return Promise.reject(t('messages:no-special-characters'));
        }
        return Promise.resolve();
    };

    return (
        <WrapperForm>
            <Form
                form={form}
                layout="vertical"
                scrollToFirstError
                onValuesChange={() => setUnsavedChanges(true)}
            >
                <>
                    {defaultBlock ? (
                        <Form.Item label={t('d:associatedBlock')} name="associatedBlock">
                            <Input disabled={true} defaultValue={defaultBlock?.name} />
                        </Form.Item>
                    ) : (
                        <Form.Item
                            label={t('d:associatedBlock')}
                            name="blockId"
                            rules={[
                                {
                                    required: true,
                                    message: `${t('messages:error-message-select-a', {
                                        name: t('d:block')
                                    })}`
                                }
                            ]}
                        >
                            <Select
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('d:block')
                                })}`}
                                showSearch
                                allowClear
                                filterOption={(input, option) =>
                                    option?.props.children
                                        .toLowerCase()
                                        .indexOf(input.toLowerCase()) >= 0
                                }
                            >
                                {blocks?.map((block: any) => (
                                    <Option key={block.id} value={block.id}>
                                        {block.name}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}
                </>
                <Divider />
                <Form.Item
                    label={t('d:aisle')}
                    name="aisle"
                    rules={[
                        { required: true, message: `${t('messages:error-message-empty-input')}` },
                        { validator: NoSpecialCharacterRule }
                    ]}
                >
                    <Input />
                </Form.Item>
                <Form.Item
                    label={t('d:nb-aisle')}
                    name="numberOfAisle"
                    rules={[
                        { required: true, message: `${t('messages:error-message-empty-input')}` }
                    ]}
                >
                    <InputNumber min={0} />
                </Form.Item>
                <Divider />
                <Form.Item
                    label={t('common:column')}
                    name="column"
                    rules={[
                        { required: true, message: `${t('messages:error-message-empty-input')}` },
                        { validator: NoSpecialCharacterRule }
                    ]}
                >
                    <Input />
                </Form.Item>
                <Form.Item
                    label={t('d:nb-column')}
                    name="numberOfColumn"
                    rules={[
                        {
                            required: true,
                            message: `${t('messages:error-message-empty-input')}`
                        }
                    ]}
                >
                    <InputNumber min={0} />
                </Form.Item>
                <Divider />
                <Form.Item
                    label={t('d:level')}
                    name="level"
                    rules={[
                        {
                            required: true,
                            message: `${t('messages:error-message-empty-input')}`
                        },
                        { validator: NoSpecialCharacterRule }
                    ]}
                >
                    <Input />
                </Form.Item>
                <Form.Item
                    label={t('d:nb-level')}
                    name="numberOfLevel"
                    rules={[
                        { required: true, message: `${t('messages:error-message-empty-input')}` }
                    ]}
                >
                    <InputNumber min={0} />
                </Form.Item>
                <Divider />
                <Form.Item
                    label={t('d:position')}
                    name="position"
                    rules={[
                        { required: true, message: `${t('messages:error-message-empty-input')}` },
                        { validator: NoSpecialCharacterRule }
                    ]}
                >
                    <Input />
                </Form.Item>
                <Form.Item
                    label={t('d:nb-position')}
                    name="numberOfPosition"
                    rules={[
                        { required: true, message: `${t('messages:error-message-empty-input')}` }
                    ]}
                >
                    <InputNumber min={0} />
                </Form.Item>
                <Divider />
                <Form.Item label={t('d:length')} name="length">
                    <InputNumber />
                </Form.Item>
                <Form.Item label={t('d:width')} name="width">
                    <InputNumber />
                </Form.Item>
                <Form.Item label={t('d:height')} name="height">
                    <InputNumber />
                </Form.Item>
                <Form.Item label={t('d:maxWeight')} name="weight">
                    <InputNumber />
                </Form.Item>
                <Divider />
                <Form.Item name="replenish" initialValue={false}>
                    <Checkbox onChange={onReplenishChange}>{t('d:replenish')}</Checkbox>
                </Form.Item>
                {selectedReplenish && (
                    <Form.Item
                        label={t('d:replenishType')}
                        name="replenishType"
                        rules={[
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (value !== null && getFieldValue('replenish') === false) {
                                        return Promise.reject(
                                            new Error(t('messages:replenish-validation-error'))
                                        );
                                    }
                                    return Promise.resolve();
                                }
                            })
                        ]}
                    >
                        <Select defaultValue="" onChange={handleReplenishTypeChange}>
                            <Option value="">-</Option>
                            {replenishTypes?.map((replenishType: any) => (
                                <Option key={replenishType.id} value={replenishType.code}>
                                    {replenishType.text}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                )}
                {selectedReplenish && selectedReplenishType === '20610' && (
                    <Form.Item label={t('d:rotation')} name="rotation">
                        <Select defaultValue="">
                            <Option value="">-</Option>
                            {rotations?.map((rotation: any) => (
                                <Option key={rotation.id} value={rotation.code}>
                                    {rotation.text}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                )}
                <Form.Item
                    label={t('d:category')}
                    name="category"
                    rules={[
                        { required: true, message: `${t('messages:error-message-empty-input')}` }
                    ]}
                >
                    <Select defaultValue="">
                        <Option value="">-</Option>
                        {categoriesTexts?.map((category: any) => (
                            <Option key={category.id} value={parseInt(category.code)}>
                                {category.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item label={t('d:constraint')} name="constraint">
                    <Input />
                </Form.Item>
                <Form.Item label={t('d:comment')} name="comment">
                    <TextArea />
                </Form.Item>
                <Form.Item name="allowCycleCountStockMin">
                    <Checkbox onChange={onStockMiniChange}>
                        {t('d:allowCycleCountStockMin')}
                    </Checkbox>
                </Form.Item>
                <Form.Item name="huManagement">
                    <Checkbox onChange={onHuManagementChange}>{t('d:huManagement')}</Checkbox>
                </Form.Item>
                <Form.Item label={t('d:stockStatus')} name="stockStatus" rules={[]}>
                    <Select defaultValue="">
                        <Option value="">-</Option>
                        {stockStatusesTexts?.map((stockStatus: any) => (
                            <Option key={stockStatus.id} value={parseInt(stockStatus.code)}>
                                {stockStatus.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item label={t('d:locationGroupIdText')} name="locationGroupId" rules={[]}>
                    <Select defaultValue="">
                        <Option value="">-</Option>
                        {locationGroupIdsTexts?.map((locationGroupId: any) => (
                            <Option key={locationGroupId.id} value={locationGroupId.code}>
                                {locationGroupId.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
            </Form>
            <div style={{ textAlign: 'center' }}>
                <Space>
                    <Button type="primary" loading={createLoading} onClick={onFinish}>
                        {t('actions:submit')}
                    </Button>
                    <Button onClick={onCancel}>{t('actions:cancel')}</Button>
                </Space>
            </div>
        </WrapperForm>
    );
};
