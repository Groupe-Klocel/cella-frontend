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
import { Button, Col, Input, InputNumber, Row, Form, Checkbox, Select, Space, Modal } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import { showError, showSuccess, showInfo, checkUndefinedValues } from '@helpers';
import { CheckboxChangeEvent } from 'antd/lib/checkbox';
import {
    GetAllPatternsQuery,
    GetListOfPrioritiesQuery,
    SimpleGetInProgressStockOwnersQuery,
    UpdateEquipmentMutation,
    UpdateEquipmentMutationVariables,
    useGetAllPatternsQuery,
    useGetListOfPrioritiesQuery,
    useListConfigsForAScopeQuery,
    useListParametersForAScopeQuery,
    useSimpleGetInProgressStockOwnersQuery,
    useUpdateEquipmentMutation
} from 'generated/graphql';
import configs from '../../../../common/configs.json';
import { gql } from 'graphql-request';

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
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes
    const [stockOwners, setStockOwners] = useState<any>();
    const [pattern, setPattern] = useState<any>();
    const [equipmentLimitTypes, setEquipmentLimitTypes] = useState<any>();
    const [equipmentMechanizedSystem, setEquipmentMechanizedSystem] = useState<any>();
    const [equipmentAutomaticLabelPrinting, setEquipmentAutomaticLabelPrinting] = useState<any>();
    const [printers, setPrinter] = useState<any>();
    const [disableTypeRelated] = useState<boolean>(
        details.type === configs['EQUIPMENT_TYPE_MONO-PRODUCT_EQUIPMENT'] ? true : false
    );
    const [displayLimitTypeRelated, setDisplayLimitTypeRelated] = useState<boolean>(
        details.limitType === configs.EQUIPMENT_LIMIT_TYPE_MAXIMUM_QUANTITY ? false : true
    );
    const [availableValue, setAvailableValue] = useState(details.available);
    const [patternIdValue, setPatternIdValue] = useState(details.patternId);
    const [reservationPatternIdValue, setReservationPatternIdValue] = useState(
        details.reservationPatternId
    );
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
    const [monoDeliveryValue, setMonoDeliveryValue] = useState(details.monoDelivery);
    const [forceRepackingValue, setForceRepackingValue] = useState(details.forceRepacking);
    const [forcePickingCheckValue, setForcePickingCheckValue] = useState(details.forcePickingCheck);
    const [equipmentWithPriorities, setEquipmentWithPriorities] = useState<any>();
    const [maxPriority, setMaxPriority] = useState<number>(details.priority);

    useEffect(() => {
        setAvailableValue(details.available);
        setPatternIdValue(details.patternId);
        setReservationPatternIdValue(details.reservationPatternId);
        setDistributedValue(details.distributed);
        setMonoCompanyValue(details.monoCompany);
        setMonoCarrierValue(details.monoCarrier);
        setBoxLineGroupValue(details.boxLineGrouped);
        setBoxMonoArticleValue(details.boxMonoArticle);
        setCheckPositionValue(details.checkPosition);
        setVirtualValue(details.virtual);
        setAllowPickingOrderFreeValue(details.allowPickingOrderFree);
        setMonoDeliveryValue(details.monoDelivery);
        setForceRepackingValue(details.forceRepacking);
        setForcePickingCheckValue(details.forcePickingCheck);
        setMaxPriority(details.priority);
    }, [details]);

    // TYPED SAFE ALL
    const [form] = Form.useForm();

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

    //To render Equipment Limit types list configs
    const equipmentLimitTypeList = useListConfigsForAScopeQuery(graphqlRequestClient, {
        scope: 'equipment_limit_type',
        language: router.locale
    });

    useEffect(() => {
        if (equipmentLimitTypeList) {
            setEquipmentLimitTypes(equipmentLimitTypeList?.data?.listConfigsForAScope);
        }
    }, [equipmentLimitTypeList]);

    //To render Pattern list configs
    const patternList = useGetAllPatternsQuery<Partial<GetAllPatternsQuery>, Error>(
        graphqlRequestClient,
        {
            page: 1,
            itemsPerPage: 100
        }
    );
    const filteredPatterns = patternList?.data?.patterns?.results.filter(
        (pattern: any) => pattern.type === configs.PATTERN_TYPE_ROUNDS
    );
    useEffect(() => {
        if (filteredPatterns) {
            setPattern;
        }
    }, [filteredPatterns]);

    //To render Equipment mechanizedSystem list configs
    const equipmentMechanizedSystemList = useListConfigsForAScopeQuery(graphqlRequestClient, {
        scope: 'equipment_mechanized_system',
        language: router.locale
    });

    useEffect(() => {
        if (equipmentMechanizedSystemList) {
            setEquipmentMechanizedSystem(equipmentMechanizedSystemList?.data?.listConfigsForAScope);
        }
    }, [equipmentMechanizedSystemList]);

    //To render Equipment automaticLabelPrinting list configs
    const equipmentAutomaticLabelPrintingList = useListConfigsForAScopeQuery(graphqlRequestClient, {
        scope: 'equipment_automatic_label_printing',
        language: router.locale
    });

    useEffect(() => {
        if (equipmentAutomaticLabelPrintingList) {
            setEquipmentAutomaticLabelPrinting(
                equipmentAutomaticLabelPrintingList?.data?.listConfigsForAScope
            );
        }
    }, [equipmentAutomaticLabelPrintingList]);

    //To render printers list params
    const printersList = useListParametersForAScopeQuery(graphqlRequestClient, {
        scope: 'printer',
        language: router.locale
    });

    useEffect(() => {
        if (printersList) {
            setPrinter(printersList?.data?.listParametersForAScope);
        }
    }, [printersList]);

    //To render existing priorities list
    const priorityList = useGetListOfPrioritiesQuery<Partial<GetListOfPrioritiesQuery>, Error>(
        graphqlRequestClient
    );
    useEffect(() => {
        setEquipmentWithPriorities(priorityList?.data?.equipments?.results);
        const receivedList = priorityList?.data?.equipments?.results.map((e: any) => e.priority);
        if (receivedList) {
            setMaxPriority(Math.max(...receivedList));
        }
    }, [priorityList]);

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
    const onMonoDeliveryChange = (e: CheckboxChangeEvent) => {
        setMonoDeliveryValue(!monoDeliveryValue);
        form.setFieldsValue({ monoDelivery: e.target.checked });
    };
    const onForceRepackingChange = (e: CheckboxChangeEvent) => {
        setForceRepackingValue(!forceRepackingValue);
        form.setFieldsValue({ forceRepacking: e.target.checked });
    };
    const onForcePickingCheckChange = (e: CheckboxChangeEvent) => {
        setForcePickingCheckValue(!forcePickingCheckValue);
        form.setFieldsValue({ forcePickingCheck: e.target.checked });
    };
    //handle call back on equipment Type change for displays
    const handleEquipmentLimitTypeChange = (value: any) => {
        if (value === configs.EQUIPMENT_LIMIT_TYPE_MAXIMUM_QUANTITY) {
            setDisplayLimitTypeRelated(false);
        } else {
            setDisplayLimitTypeRelated(true);
        }
    };
    const onPatternIdChange = (value: any) => {
        setPatternIdValue(!patternIdValue);
        form.setFieldsValue({ patternId: value });
    };
    const onReservationPatternIdChange = (value: any) => {
        setReservationPatternIdValue(!reservationPatternIdValue);
        form.setFieldsValue({ reservationPatternId: value });
    };
    // Call api to create new group
    const onFinish = () => {
        form.validateFields()
            .then(() => {
                checkUndefinedValues(form);
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

                delete formData['stockOwnerName'];
                delete formData['stockOwner'];
                delete formData['typeText'];
                delete formData['limitTypeText'];
                delete formData['mechanizedSystemText'];
                delete formData['automaticLabelPrintingText'];
                delete formData['statusText'];
                const updateWithOrder = gql`
                            mutation executeFunction($id: String!, $fieldsInfos: JSON!) {
                                executeFunction(
                                    functionName: "reorder_priority"
                                    event: {
                                        input: {
                                            ids: $id
                                            tableName: "equipment"
                                            orderingField: "priority"
                                            operation: "update"
                                            parentId: "*"
                                            newOrder: ${formData.priority}
                                            fieldsInfos: $fieldsInfos
                                        }
                                    }
                                ) {
                                    status
                                    output
                                }
                            }
                        `;
                graphqlRequestClient
                    .request(updateWithOrder, {
                        id: equipmentId,
                        fieldsInfos: formData
                    })
                    .then((result: any) => {
                        if (result.executeFunction.status === 'ERROR') {
                            showError(result.executeFunction.output);
                        } else if (
                            result.executeFunction.status === 'OK' &&
                            result.executeFunction.output.status === 'KO'
                        ) {
                            showError(t(`errors:${result.executeFunction.output.output.code}`));
                            console.log('Backend_message', result.executeFunction.output.output);
                        } else {
                            showInfo(t('messages:info-create-wip'));
                            showSuccess(t('messages:success-updated'));
                            setUnsavedChanges(false);
                            router.push(
                                `/equipment/${equipmentId}`.replace(':id', equipmentId.toString())
                            );
                        }
                    });
            })
            .catch((err) => {
                showError(t('error-update-data'));
            });
    };

    useEffect(() => {
        const tmp_details = {
            ...details,
            stockOwnerName: details?.stockOwner?.name
        };
        delete tmp_details['id'];
        delete tmp_details['created'];
        delete tmp_details['createdBy'];
        delete tmp_details['modified'];
        delete tmp_details['modifiedBy'];
        form.setFieldsValue(tmp_details);
    }, [details]);

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
    return (
        <WrapperForm>
            <Form form={form} layout="vertical" scrollToFirstError>
                <Form.Item label={t('common:stock-owner')} name="stockOwnerId">
                    <Select
                        placeholder={`${t('messages:please-select-a', {
                            name: t('common:stock-owner')
                        })}`}
                        allowClear
                    >
                        {stockOwners?.map((stockOwner: any) => (
                            <Option key={stockOwner.id} value={stockOwner.id}>
                                {stockOwner.name}
                            </Option>
                        ))}
                    </Select>
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
                        label={t('d:pattern')}
                        name="patternId"
                        rules={[
                            {
                                message: `${t('messages:error-message-empty-input')}`
                            }
                        ]}
                    >
                        <Select
                            allowClear
                            defaultValue={patternIdValue}
                            onChange={onPatternIdChange}
                        >
                            {filteredPatterns?.map((patternList: any) => (
                                <Option key={patternList.id} value={patternList.id}>
                                    {patternList.name}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item
                        label={t('d:reservationPattern')}
                        name="reservationPatternId"
                        rules={[
                            {
                                message: `${t('messages:error-message-empty-input')}`
                            }
                        ]}
                    >
                        <Select
                            allowClear
                            defaultValue={reservationPatternIdValue}
                            placeholder={`${t('messages:please-select-a', {
                                name: t('d:reservationPattern')
                            })}`}
                            onChange={onReservationPatternIdChange}
                        >
                            {filteredPatterns?.map((patternList: any) => (
                                <Option key={patternList.id} value={patternList.id}>
                                    {patternList.name}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
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
                <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                    <Col xs={24} xl={12}>
                        <Form.Item name="allowPickingOrderFree">
                            <Checkbox
                                checked={allowPickingOrderFreeValue}
                                onChange={onAllowPickingOrderFreeChange}
                                disabled={!disableTypeRelated}
                            >
                                {t('d:allow-picking-order-free')}
                            </Checkbox>
                        </Form.Item>
                    </Col>
                    <Col xs={24} xl={12}>
                        <Form.Item name="monoDelivery">
                            <Checkbox onChange={onMonoDeliveryChange}>
                                {t('d:monoDelivery')}
                            </Checkbox>
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item label={t('d:mechanizedSystem')} name="mechanizedSystem">
                    <Select
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:mechanizedSystem')
                        })}`}
                        allowClear
                    >
                        {equipmentMechanizedSystem?.map(
                            // think about changing once configs available
                            (mechanizedSystem: any) => (
                                <Option
                                    key={mechanizedSystem.id}
                                    value={parseInt(mechanizedSystem.code)}
                                >
                                    {mechanizedSystem.text}
                                </Option>
                            )
                        )}
                    </Select>
                </Form.Item>
                <Form.Item label={t('d:automaticLabelPrinting')} name="automaticLabelPrinting">
                    <Select
                        placeholder={`${t('messages:please-select-an', {
                            name: t('d:automaticLabelPrinting')
                        })}`}
                        allowClear
                    >
                        {equipmentAutomaticLabelPrinting?.map((automaticLabelPrinting: any) => (
                            <Option
                                key={automaticLabelPrinting.id}
                                value={parseInt(automaticLabelPrinting.code)}
                            >
                                {automaticLabelPrinting.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item label={t('d:printer')} name="printer">
                    <Select
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:printer')
                        })}`}
                        allowClear
                    >
                        {printers?.map((printer: any) => (
                            <Option key={printer.id} value={printer.code}>
                                {printer.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                    <Col xs={24} xl={12}>
                        <Form.Item name="forceRepacking">
                            <Checkbox
                                checked={forceRepackingValue}
                                onChange={onForceRepackingChange}
                            >
                                {t('d:forceRepacking')}
                            </Checkbox>
                        </Form.Item>
                    </Col>
                    <Col xs={24} xl={12}>
                        <Form.Item name="forcePickingCheck">
                            <Checkbox
                                checked={forcePickingCheckValue}
                                onChange={onForcePickingCheckChange}
                            >
                                {t('d:forcePickingCheck')}
                            </Checkbox>
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item label={t('common:comment')} name="comment">
                    <TextArea></TextArea>
                </Form.Item>
            </Form>
            <div style={{ textAlign: 'center' }}>
                <Space>
                    <Button type="primary" onClick={onFinish}>
                        {t('actions:submit')}
                    </Button>
                    <Button onClick={onCancel}>{t('actions:cancel')}</Button>
                </Space>
            </div>
        </WrapperForm>
    );
};
