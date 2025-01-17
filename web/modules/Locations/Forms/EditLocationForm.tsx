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
import configs from '../../../../common/configs.json';
import { Button, Input, Form, Checkbox, Select, Space, Modal } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import {
    useUpdateLocationMutation,
    UpdateLocationMutation,
    UpdateLocationMutationVariables,
    useGetReplenishTypesConfigsQuery,
    GetReplenishTypesConfigsQuery,
    useGetRotationsParamsQuery,
    GetRotationsParamsQuery,
    useListConfigsForAScopeQuery,
    useListParametersForAScopeQuery
} from 'generated/graphql';
import { showError, showSuccess, showInfo, checkUndefinedValues } from '@helpers';
import { CheckboxChangeEvent } from 'antd/lib/checkbox';

const { Option } = Select;
const { TextArea } = Input;

export type EditLocationFormProps = {
    locationId: string;
    details: any;
};

//FIXME: regarder pourquoi pas de delete de baseRotationUNit
export const EditLocationForm: FC<EditLocationFormProps> = ({
    locationId,
    details
}: EditLocationFormProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();

    // TYPED SAFE ALL
    const [form] = Form.useForm();
    const [replenishValue, setReplenishValue] = useState(details.replenish);
    const [stockMinValue, setStockMinValue] = useState(details.allowCycleCountStockMin);
    const [categoriesTexts, setCategoriesTexts] = useState<any>();
    const [replenishTypes, setReplenishTypes] = useState<any>();
    const [rotations, setRotations] = useState<any>();
    const [selectedReplenish, setSelectedReplenish] = useState<any>(details.replenish);
    const [selectedReplenishType, setSelectedReplenishType] = useState<any>(details.replenishType);
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes
    const [huManagementValue, setHuManagement] = useState(details.huManagement);
    const [stockStatusesTexts, setStockStatusesTexts] = useState<any>();
    const [locationGroupsTexts, setLocationGroupsTexts] = useState<any>();

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

    useEffect(() => {
        if (details) {
            setHuManagement(details?.huManagement);
            setStockMinValue(details?.allowCycleCountStockMin);
            setReplenishValue(details?.replenish);
        }
    }, [details]);

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

    //To render Simple stock statuses list
    const stockStatusesTextList = useListParametersForAScopeQuery(graphqlRequestClient, {
        scope: 'stock_statuses',
        language: router.locale
    });

    useEffect(() => {
        if (stockStatusesTextList) {
            setStockStatusesTexts(stockStatusesTextList?.data?.listParametersForAScope);
        }
    }, [stockStatusesTextList.data]);

    //To render Simple location groups list
    const locationGroupsTextList = useListParametersForAScopeQuery(graphqlRequestClient, {
        scope: 'location_location_group_id',
        language: router.locale
    });

    useEffect(() => {
        if (locationGroupsTextList) {
            setLocationGroupsTexts(locationGroupsTextList?.data?.listParametersForAScope);
        }
    }, [locationGroupsTextList.data]);

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

    const { mutate, isPending: updateLoading } = useUpdateLocationMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: UpdateLocationMutation,
                _variables: UpdateLocationMutationVariables,
                _context: any
            ) => {
                router.push(`/locations/${data.updateLocation?.id}`);
                showSuccess(t('messages:success-updated'));
            },
            onError: () => {
                showError(t('messages:error-update-data'));
            }
        }
    );

    const updateLocation = ({ id, input }: UpdateLocationMutationVariables) => {
        mutate({ id, input });
    };

    const onReplenishChange = (e: CheckboxChangeEvent) => {
        setReplenishValue(!replenishValue);
        setSelectedReplenish(e.target.checked);
        form.setFieldsValue({ replenish: e.target.checked });
    };

    const onStockMinChange = (e: CheckboxChangeEvent) => {
        setStockMinValue(!stockMinValue);
        form.setFieldsValue({ allowCycleCountStockMin: e.target.checked });
    };

    const onHuManagementChange = (e: CheckboxChangeEvent) => {
        setHuManagement(!huManagementValue);
        form.setFieldsValue({ huManagement: e.target.checked });
    };

    // to validate empty field when replenish is false
    useEffect(() => {
        form.validateFields(['replenishType']);
    }, [replenishValue, form]);

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                checkUndefinedValues(form);
                // Here make api call of something else
                const formData = form.getFieldsValue(true);
                //update replenish type
                const replenishTypeCode =
                    formData.replenishTypeText == '-' || formData.replenishTypeText == ''
                        ? null
                        : parseInt(
                              replenishTypes?.find((e: any) => e.text == formData.replenishTypeText)
                                  .code
                          );
                formData.replenishType = replenishTypeCode;
                // // update rotation
                const rotationCode =
                    formData.baseUnitRotationText == '-' || formData.baseUnitRotationText == ''
                        ? null
                        : parseInt(
                              rotations?.find((e: any) => e.text == formData.baseUnitRotationText)
                                  .code
                          );
                formData.baseUnitRotation = rotationCode;

                //check if replenish has been unchecked and remove replenishType value if yes
                if (formData.replenish == false) {
                    formData['replenishType'] = null;
                }
                if (formData.replenishType != configs.LOCATION_REPLENISH_TYPE_SAME_ROTATION) {
                    formData['baseUnitRotation'] = null;
                }
                formData.huManagement = huManagementValue;
                formData.allowCycleCountStockMin = stockMinValue;
                formData.replenish = replenishValue;

                delete formData['associatedBlock'];
                delete formData['replenishTypeText'];
                delete formData['baseUnitRotationText'];
                updateLocation({ id: locationId, input: formData });
                setUnsavedChanges(false);
            })
            .catch((err) => {
                showError(t('messages:error-update-data'));
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
            associatedBlock: details.block.name,
            replenishTypeText: details.replenishType
                ? replenishTypes?.find((e: any) => e.code == details.replenishType).text
                : '-',
            baseUnitRotationText: details.baseUnitRotation
                ? rotations?.find((e: any) => e.code == details.baseUnitRotation).text
                : '-'
        };
        delete tmp_details['id'];
        delete tmp_details['created'];
        delete tmp_details['createdBy'];
        delete tmp_details['modified'];
        delete tmp_details['modifiedBy'];
        delete tmp_details['block'];
        form.setFieldsValue(tmp_details);
        if (updateLoading) {
            showInfo(t('messages:info-create-wip'));
        }
    }, [updateLoading, replenishTypes, rotations, details]);

    return (
        <WrapperForm>
            <Form
                form={form}
                layout="vertical"
                scrollToFirstError
                onValuesChange={() => setUnsavedChanges(true)}
            >
                <Form.Item
                    label={t('d:associatedBlock')}
                    name="associatedBlock"
                    rules={[
                        {
                            required: true
                        }
                    ]}
                >
                    <Input disabled={true} />
                </Form.Item>
                <Form.Item
                    label={t('d:location_name')}
                    name="name"
                    rules={[
                        { required: true, message: `${t('messages:error-message-empty-input')}` }
                    ]}
                >
                    <Input />
                </Form.Item>
                <Form.Item
                    label={t('d:barcode')}
                    name="barcode"
                    rules={[
                        { required: true, message: `${t('messages:error-message-empty-input')}` }
                    ]}
                >
                    <Input />
                </Form.Item>
                <Form.Item
                    label={t('d:category')}
                    name="category"
                    rules={[
                        { required: true, message: `${t('messages:error-message-empty-input')}` }
                    ]}
                >
                    <Select>
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
                <Form.Item name="replenish">
                    <Checkbox checked={replenishValue} onChange={onReplenishChange}>
                        {t('d:replenish')}
                    </Checkbox>
                </Form.Item>
                {selectedReplenish && (
                    <Form.Item
                        label={t('d:replenishType')}
                        name="replenishTypeText"
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
                        <Select onChange={handleReplenishTypeChange}>
                            <Option value="">-</Option>
                            {replenishTypes?.map((replenishType: any) => (
                                <Option key={replenishType.id} value={replenishType.text}>
                                    {replenishType.text}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                )}
                {selectedReplenish &&
                    (selectedReplenishType === 'Same rotation' ||
                        selectedReplenishType ===
                            configs.LOCATION_REPLENISH_TYPE_SAME_ROTATION) && (
                        <Form.Item label={t('d:baseUnitRotation')} name="baseUnitRotationText">
                            <Select>
                                <Option value="">-</Option>
                                {rotations?.map((rotation: any) => (
                                    <Option key={rotation.id} value={rotation.text}>
                                        {rotation.text}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}
                <Form.Item name="allowCycleCountStockMin">
                    <Checkbox checked={stockMinValue} onChange={onStockMinChange}>
                        {t('d:allowCycleCountStockMin')}
                    </Checkbox>
                </Form.Item>
                <Form.Item name="huManagement">
                    <Checkbox checked={huManagementValue} onChange={onHuManagementChange}>
                        {t('d:huManagement')}
                    </Checkbox>
                </Form.Item>
                <Form.Item label={t('d:blockingStatus')} name="stockStatus" rules={[]}>
                    <Select allowClear>
                        {stockStatusesTexts?.map((stockStatus: any) => (
                            <Option key={stockStatus.id} value={parseInt(stockStatus.code)}>
                                {stockStatus.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item label={t('d:locationGroupIdText')} name="locationGroupId" rules={[]}>
                    <Select allowClear>
                        {locationGroupsTexts?.map((locationGroupId: any) => (
                            <Option key={locationGroupId.id} value={locationGroupId.code}>
                                {locationGroupId.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
            </Form>
            <div style={{ textAlign: 'center' }}>
                <Space>
                    <Button type="primary" loading={updateLoading} onClick={onFinish}>
                        {t('actions:submit')}
                    </Button>
                    <Button onClick={onCancel}>{t('actions:cancel')}</Button>
                </Space>
            </div>
        </WrapperForm>
    );
};
