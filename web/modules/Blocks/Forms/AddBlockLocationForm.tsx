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
    BulkCreateLocationsMutation,
    BulkCreateLocationsMutationVariables,
    GetReplenishTypesConfigsQuery,
    GetRotationsParamsQuery,
    useBulkCreateLocationsMutation,
    useGetReplenishTypesConfigsQuery,
    useGetRotationsParamsQuery,
    useListConfigsForAScopeQuery
} from 'generated/graphql';
import useTranslation from 'next-translate/useTranslation';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import configs from '../../../../common/configs.json';

const { Option } = Select;
const { TextArea } = Input;

export interface ISingleItemProps {
    blockId: string | any;
    blockName: string | any;
    buildingName: string;
}

export const AddBlockLocationForm = (props: ISingleItemProps) => {
    const { t } = useTranslation();
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();
    const { id } = router.query;
    const [replenishTypes, setReplenishTypes] = useState<any>();
    const [rotations, setRotations] = useState<any>();
    const [selectedReplenish, setSelectedReplenish] = useState<any>();
    const [selectedReplenishType, setSelectedReplenishType] = useState<any>(null);
    const [categoriesTexts, setCategoriesTexts] = useState<any>();
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes

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

    // to handle display of rotations
    const handleReplenishTypeChange = (value: string) => {
        setSelectedReplenishType(value);
    };

    //To render Simple categories list
    const categoriesTextList = useListConfigsForAScopeQuery(graphqlRequestClient, {
        scope: 'location_category',
        language: router.locale
    });

    useEffect(() => {
        if (categoriesTextList) {
            setCategoriesTexts(categoriesTextList?.data?.listConfigsForAScope);
        }
    }, [categoriesTextList.data]);

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

    const { mutate, isPending: createLoading } = useBulkCreateLocationsMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: BulkCreateLocationsMutation,
                _variables: BulkCreateLocationsMutationVariables,
                _context: any
            ) => {
                router.push(`/blocks/${props.blockId}`);
                showSuccess(t('messages:success-created'));
            },
            onError: () => {
                showError(t('messages:error-creating-data'));
            }
        }
    );

    const bulkCreateLocation = ({ input }: BulkCreateLocationsMutationVariables) => {
        mutate({ input });
    };

    const onReplenishChange = (e: CheckboxChangeEvent) => {
        setSelectedReplenish(e.target.checked);
        form.setFieldsValue({ replenish: e.target.checked });
    };

    const onStockMiniChange = (e: CheckboxChangeEvent) => {
        form.setFieldsValue({ allowCycleCountStockMin: e.target.checked });
    };

    // Call api to create new group
    const onFinish = () => {
        form.validateFields()
            .then(() => {
                // Here make api call of something else
                const formData = form.getFieldsValue(true);
                formData.replenishType = parseInt(formData.replenishType);
                if (formData['replenish'] == false) formData.replenishType = 0;
                formData.baseUnitRotation = parseInt(formData.rotation);
                formData.status = configs.LOCATION_STATUS_AVAILABLE;
                delete formData.rotation;
                delete formData.blockName;
                delete formData.buildingName;
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
        const tmp_details = {
            blockId: props.blockId,
            blockName: props.blockName,
            buildingName: props.buildingName
        };
        form.setFieldsValue(tmp_details);
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
                <Form.Item
                    name="buildingName"
                    label={t('d:associatedBuilding')}
                    rules={[{ required: true }]}
                >
                    <Input disabled />
                </Form.Item>
                <Form.Item
                    name="blockName"
                    label={t('d:associatedBlock')}
                    rules={[{ required: true }]}
                >
                    <Input disabled />
                </Form.Item>
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
                <Divider />
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
