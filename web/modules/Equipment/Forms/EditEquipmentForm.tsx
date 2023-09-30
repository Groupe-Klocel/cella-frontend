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
import { Button, Col, Input, InputNumber, Row, Form, AutoComplete, Checkbox, Select } from 'antd';
import useTranslation from 'next-translate/useTranslation';
import { FC, useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import { showError, showSuccess, showInfo } from '@helpers';
import { CheckboxChangeEvent } from 'antd/lib/checkbox';
import {
    GetEquipmentLimitTypeConfigsQuery,
    GetListOfPrioritiesQuery,
    SimpleGetAllStockOwnersQuery,
    UpdateEquipmentMutation,
    UpdateEquipmentMutationVariables,
    useGetEquipmentLimitTypeConfigsQuery,
    useGetListOfPrioritiesQuery,
    useSimpleGetAllStockOwnersQuery,
    useUpdateEquipmentMutation
} from 'generated/graphql';
import configs from '../../../../common/configs.json';

const { Option } = Select;
const { TextArea } = Input;

export type EditEquipmentFormProps = {
    equipmentId: string;
    details: any;
};

export const EditEquipmentForm: FC<EditEquipmentFormProps> = ({
    equipmentId,
    details
}: EditEquipmentFormProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const [stockOwners, setStockOwners] = useState<any>();
    const [equipmentLimitTypes, setEquipmentLimitTypes] = useState<any>();
    const [disableTypeRelated] = useState<boolean>(details.type === configs["EQUIPMENT_TYPE_MONO-PRODUCT_EQUIPMENT"] ? true : false);
    const [displayLimitTypeRelated, setDisplayLimitTypeRelated] = useState<boolean>(
        details.limitType === configs.EQUIPMENT_LIMIT_TYPE_MAXIMUM_QUANTITY ? false : true
    );
    const [availableValue, setAvailableValue] = useState(details.available);
    const [distributedValue, setDistributedValue] = useState(details.distributed);
    const [monoCompanyValue, setMonoCompanyValue] = useState(details.monoCompany);
    const [monoCarrierValue, setMonoCarrierValue] = useState(details.monoCarrier);
    const [boxLineGroupValue, setBoxLineGroupValue] = useState(details.boxLineGrouped);
    const [boxMonoArticleValue, setBoxMonoArticleValue] = useState(details.boxMonoArticle);
    const [checkPositionValue, setCheckPositionValue] = useState(details.checkPosition);
    const [virtualValue, setVirtualValue] = useState(details.virtual);
    const [allowPickingOrderFreeValue, setAllowPickingOrderFreeValue] = useState(
        details.allowPickingOrderFree
    );
    const [equipmentWithPriorities, setEquipmentWithPriorities] = useState<any>();
    const [maxPriority, setMaxPriority] = useState<number>(details.priority);

    // TYPED SAFE ALL
    const [form] = Form.useForm();

    //To render Simple stockOwners list
    const stockOwnerList = useSimpleGetAllStockOwnersQuery<
        Partial<SimpleGetAllStockOwnersQuery>,
        Error
    >(graphqlRequestClient);

    useEffect(() => {
        if (stockOwnerList) {
            setStockOwners(stockOwnerList?.data?.stockOwners?.results);
        }
    }, [stockOwnerList]);

    //To render Equipment Limit types list configs
    const equipmentLimitTypeList = useGetEquipmentLimitTypeConfigsQuery<
        Partial<GetEquipmentLimitTypeConfigsQuery>,
        Error
    >(graphqlRequestClient);

    useEffect(() => {
        if (equipmentLimitTypeList) {
            setEquipmentLimitTypes(equipmentLimitTypeList?.data?.listConfigsForAScope);
        }
    }, [equipmentLimitTypeList]);

    //To render existing priorities list
    const priorityList = useGetListOfPrioritiesQuery<Partial<GetListOfPrioritiesQuery>, Error>(
        graphqlRequestClient
    );
    useEffect(() => {
        setEquipmentWithPriorities(priorityList?.data?.equipments?.results);
        const receivedList = priorityList?.data?.equipments?.results.map((e: any) => e.priority);
        if (receivedList) {
            setMaxPriority(Math.max(...receivedList) + 1);
        }
    }, [priorityList]);

    //rework priorities list
    function compare(a: any, b: any) {
        if (a.priority < b.priority) {
            return -1;
        }
        if (a.priority > b.priority) {
            return 1;
        }
        return 0;
    }
    const inCourseEquipment = equipmentWithPriorities
        ?.filter((e: any) => e.priority !== null)
        .sort(compare);

    const { mutate, isLoading: updateLoading } = useUpdateEquipmentMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: UpdateEquipmentMutation,
                _variables: UpdateEquipmentMutationVariables,
                _context: any
            ) => {
                router.push(`/equipment/${equipmentId}`);
                //showSuccess(t('messages:success-updated'));
            },
            onError: () => {
                showError(t('messages:error-update-data'));
            }
        }
    );

    const updateEquipment = ({ id, input }: UpdateEquipmentMutationVariables) => {
        mutate({ id, input });
    };

    //manage call back on change boxes
    const onAvailableChange = (e: CheckboxChangeEvent) => {
        setAvailableValue(!availableValue);
        form.setFieldsValue({ available: e.target.checked });
    };
    const onDistributedChange = (e: CheckboxChangeEvent) => {
        setDistributedValue(!distributedValue);
        form.setFieldsValue({ distributed: e.target.checked });
    };
    const onMonoCompanyChange = (e: CheckboxChangeEvent) => {
        setMonoCompanyValue(!monoCompanyValue);
        form.setFieldsValue({ monoCompany: e.target.checked });
    };
    const onMonoCarrierChange = (e: CheckboxChangeEvent) => {
        setMonoCarrierValue(!monoCarrierValue);
        form.setFieldsValue({ monoCarrier: e.target.checked });
    };
    const onBoxLineGroupChange = (e: CheckboxChangeEvent) => {
        setBoxLineGroupValue(!boxLineGroupValue);
        form.setFieldsValue({ boxLineGroup: e.target.checked });
    };
    const onBoxMonoArticleChange = (e: CheckboxChangeEvent) => {
        setBoxMonoArticleValue(!boxMonoArticleValue);
        form.setFieldsValue({ boxMonoArticle: e.target.checked });
        // setBoxMonoArticleChange(e.target.checked);
    };
    const onCheckPositionChange = (e: CheckboxChangeEvent) => {
        setCheckPositionValue(!checkPositionValue);
        form.setFieldsValue({ checkPosition: e.target.checked });
    };
    const onVirtualChange = (e: CheckboxChangeEvent) => {
        setVirtualValue(!virtualValue);
        form.setFieldsValue({ virtual: e.target.checked });
    };
    const onAllowPickingOrderFreeChange = (e: CheckboxChangeEvent) => {
        setAllowPickingOrderFreeValue(!allowPickingOrderFreeValue);
        form.setFieldsValue({ allowPickingOrderFree: e.target.checked });
    };
    //handle call back on equipment Type change for displays
    const handleEquipmentLimitTypeChange = (value: any) => {
        if (value === configs.EQUIPMENT_LIMIT_TYPE_MAXIMUM_QUANTITY) {
            setDisplayLimitTypeRelated(false);
        } else {
            setDisplayLimitTypeRelated(true);
        }
    };

    // Call api to create new group
    const onFinish = () => {
        form.validateFields()
            .then(() => {
                // Here make api call of something else
                const formData = form.getFieldsValue(true);
                if (formData.limitType === configs.EQUIPMENT_LIMIT_TYPE_MAXIMUM_QUANTITY) {
                    formData['length'] = null;
                    formData['width'] = null;
                    formData['height'] = null;
                    formData['toleranceDimension'] = null;
                } else {
                    formData['nbMaxBox'] = null;
                }
                if (formData['stockOwnerId'] == '') {
                    formData['stockOwnerId'] = null;
                }
                //part to update priorities on foreigners

                let equipmentToUpdate: any;
                let updateSide: number;
                if (formData.priority > details.priority && details.priority !== null) {
                    equipmentToUpdate = inCourseEquipment.filter(
                        (e: any) => e.priority <= formData.priority && e.priority > details.priority
                    );
                    updateSide = -1;
                } else if (details.priority !== null) {
                    equipmentToUpdate = inCourseEquipment.filter(
                        (e: any) => e.priority >= formData.priority && e.priority < details.priority
                    );
                    updateSide = 1;
                } else {
                    equipmentToUpdate = inCourseEquipment.filter(
                        (e: any) => e.priority >= formData.priority
                    );
                    updateSide = 1;
                }
                if (equipmentToUpdate) {
                    equipmentToUpdate.forEach((e: any) =>
                        updateEquipment({ id: e.id, input: { priority: e.priority + updateSide } })
                    );
                }
                //end part to update priorities on foreigners
                delete formData['stockOwnerName'];
                delete formData['stockOwner'];
                delete formData['typeText'];
                delete formData['limitTypeText'];
                delete formData['statusText'];
                updateEquipment({ id: equipmentId, input: formData });
            })
            .catch((err) => {
                showError(t('error-update-data'));
            });
    };

    useEffect(() => {
        const tmp_details = {
            ...details,
            stockOwnerName: details.stockOwner.name
        };
        delete tmp_details['id'];
        delete tmp_details['created'];
        delete tmp_details['createdBy'];
        delete tmp_details['modified'];
        delete tmp_details['modifiedBy'];
        form.setFieldsValue(tmp_details);
        if (updateLoading) {
            showInfo(t('messages:info-create-wip'));
            showSuccess(t('messages:success-updated'));
        }
    }, [updateLoading]);

    return (
        <WrapperForm>
            <Form form={form} layout="vertical" scrollToFirstError>
                <Form.Item name="stockOwnerName" label={t('common:stock-owner')}>
                    <Input disabled />
                </Form.Item>
                <Form.Item
                    label={t('d:type')}
                    name="typeText"
                    rules={[
                        {
                            required: true,
                            message: `${t('messages:error-message-empty-input')}`
                        }
                    ]}
                >
                    <Input disabled />
                </Form.Item>
                <Form.Item
                    label={t('common:name')}
                    name="name"
                    rules={[
                        { required: true, message: `${t('messages:error-message-empty-input')}` }
                    ]}
                >
                    <Input />
                </Form.Item>
                <Col xs={24} xl={12}>
                    <Form.Item
                        label={t('d:priority')}
                        name="priority"
                        rules={[
                            {
                                required: true,
                                message: `${t('messages:error-message-empty-input')}`
                            }
                        ]}
                    >
                        <InputNumber min={1} max={maxPriority} />
                    </Form.Item>
                </Col>
                <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                    <Col xs={24} xl={12}>
                        <Form.Item name="available">
                            <Checkbox checked={availableValue} onChange={onAvailableChange}>
                                {t('d:available')}
                            </Checkbox>
                        </Form.Item>
                        <Form.Item name="distributed">
                            <Checkbox checked={distributedValue} onChange={onDistributedChange}>
                                {t('d:distributed')}
                            </Checkbox>
                        </Form.Item>
                        <Form.Item name="monoCompany">
                            <Checkbox checked={monoCompanyValue} onChange={onMonoCompanyChange}>
                                {t('d:mono-company')}
                            </Checkbox>
                        </Form.Item>
                    </Col>
                    <Col xs={24} xl={12}>
                        <Form.Item name="monoCarrier">
                            <Checkbox checked={monoCarrierValue} onChange={onMonoCarrierChange}>
                                {t('d:mono-carrier')}
                            </Checkbox>
                        </Form.Item>
                        <Form.Item name="boxLineGroup">
                            <Checkbox
                                checked={boxLineGroupValue}
                                disabled
                                onChange={onBoxLineGroupChange}
                            >
                                {t('d:box-line-group')}
                            </Checkbox>
                        </Form.Item>
                        <Form.Item name="boxMonoArticle">
                            <Checkbox
                                disabled={disableTypeRelated}
                                checked={boxMonoArticleValue}
                                onChange={onBoxMonoArticleChange}
                            >
                                {t('d:mono-product-box')}
                            </Checkbox>
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item label={t('d:qty-max-article')} name="qtyMaxArticle">
                    <InputNumber disabled />
                </Form.Item>
                <Form.Item
                    label={t('d:limit-type')}
                    name="limitType"
                    rules={[
                        {
                            required: true,
                            message: `${t('messages:error-message-empty-input')}`
                        }
                    ]}
                >
                    <Select
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:limit-type')
                        })}`}
                        disabled={!disableTypeRelated}
                        onChange={handleEquipmentLimitTypeChange}
                    >
                        {equipmentLimitTypes?.map((equipmentLimitType: any) => (
                            <Option
                                key={equipmentLimitType.id}
                                value={parseInt(equipmentLimitType.code)}
                            >
                                {equipmentLimitType.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                {displayLimitTypeRelated == true ? (
                    <>
                        <Form.Item
                            label={t('common:length')}
                            name="length"
                            rules={[
                                {
                                    required: true,
                                    message: `${t('messages:error-message-empty-input')}`
                                }
                            ]}
                        >
                            <InputNumber />
                        </Form.Item>
                        <Form.Item
                            label={t('common:width')}
                            name="width"
                            rules={[
                                {
                                    required: true,
                                    message: `${t('messages:error-message-empty-input')}`
                                }
                            ]}
                        >
                            <InputNumber />
                        </Form.Item>
                        <Form.Item
                            label={t('common:height')}
                            name="height"
                            rules={[
                                {
                                    required: true,
                                    message: `${t('messages:error-message-empty-input')}`
                                }
                            ]}
                        >
                            <InputNumber />
                        </Form.Item>
                        <Form.Item
                            label={t('d:dimension-tolerance')}
                            name="toleranceDimension"
                            rules={[
                                {
                                    required: true,
                                    message: `${t('messages:error-message-empty-input')}`
                                }
                            ]}
                        >
                            <InputNumber />
                        </Form.Item>
                    </>
                ) : (
                    <Form.Item
                        label={t('d:nb-max-box')}
                        name="nbMaxBox"
                        rules={[
                            {
                                required: true,
                                message: `${t('messages:error-message-empty-input')}`
                            }
                        ]}
                    >
                        <InputNumber />
                    </Form.Item>
                )}

                <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                    <Col xs={24} xl={12}>
                        <Form.Item name="checkPosition">
                            <Checkbox checked={checkPositionValue} onChange={onCheckPositionChange}>
                                {t('d:check-position')}
                            </Checkbox>
                        </Form.Item>
                    </Col>
                    <Col xs={24} xl={12}>
                        <Form.Item name="virtual">
                            <Checkbox checked={virtualValue} onChange={onVirtualChange}>
                                {t('d:virtual')}
                            </Checkbox>
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item name="allowPickingOrderFree">
                    <Checkbox
                        checked={allowPickingOrderFreeValue}
                        onChange={onAllowPickingOrderFreeChange}
                        disabled={!disableTypeRelated}
                    >
                        {t('d:allow-picking-order-free')}
                    </Checkbox>
                </Form.Item>
                <Form.Item label={t('common:comment')} name="comment">
                    <TextArea></TextArea>
                </Form.Item>
            </Form>
            <div style={{ textAlign: 'center' }}>
                <Button type="primary" loading={updateLoading} onClick={onFinish}>
                    {t('actions:submit')}
                </Button>
            </div>
        </WrapperForm>
    );
};
