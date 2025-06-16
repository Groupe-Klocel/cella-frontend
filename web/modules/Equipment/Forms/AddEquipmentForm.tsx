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
import { Button, Col, Input, InputNumber, Row, Form, Checkbox, Select, Modal, Space } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import {
    useCreateEquipmentMutation,
    CreateEquipmentMutation,
    CreateEquipmentMutationVariables,
    useSimpleGetInProgressStockOwnersQuery,
    SimpleGetInProgressStockOwnersQuery,
    useGetListOfPrioritiesQuery,
    GetListOfPrioritiesQuery,
    useUpdateEquipmentMutation,
    UpdateEquipmentMutation,
    UpdateEquipmentMutationVariables,
    useListConfigsForAScopeQuery,
    useListParametersForAScopeQuery,
    useGetAllPatternsQuery,
    GetAllPatternsQuery
} from 'generated/graphql';
import { showError, showSuccess, showInfo } from '@helpers';
import { CheckboxChangeEvent } from 'antd/lib/checkbox';
import configs from '../../../../common/configs.json';
import { gql } from 'graphql-request';

const { Option } = Select;
const { TextArea } = Input;

export const AddEquipmentForm = () => {
    const { t } = useTranslation('common');
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();

    const name = t('common:name');
    const comment = t('common:comment');
    const errorMessageEmptyInput = t('messages:error-message-empty-input');
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes

    const [stockOwners, setStockOwners] = useState<any>();
    const [equipmentTypes, setEquipmentTypes] = useState<any>();
    const [pattern, setPattern] = useState<any>();
    const [equipmentLimitTypes, setEquipmentLimitTypes] = useState<any>();
    const [equipmentMechanizedSystem, setEquipmentMechanizedSystem] = useState<any>();
    const [equipmentAutomaticLabelPrinting, setEquipmentAutomaticLabelPrinting] = useState<any>();
    const [printers, setPrinter] = useState<any>();
    const [boxLineGroupedValue, setBoxLineGroupValue] = useState<boolean>(false);
    const [boxMonoArticleChange, setBoxMonoArticleChange] = useState<boolean>();
    const [freePickingOrderChange, setFreePickingOrderChange] = useState<boolean>();
    const [disableTypeRelated, setDisableTypeRelated] = useState<boolean>(false);
    const [displayLimitTypeRelated, setDisplayLimitTypeRelated] = useState<boolean>(false);
    const [maxPriority, setMaxPriority] = useState<number>(0);

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

    useEffect(() => {
        const equipementPriorityList = gql`
            query getEquipmentPriorities {
                equipments {
                    results {
                        priority
                    }
                }
            }
        `;
        graphqlRequestClient
            .request(equipementPriorityList)
            .then((data: any) => {
                const receivedList = data?.equipments?.results.map((e: any) => e.priority);
                if (receivedList) {
                    setMaxPriority(Math.max(...receivedList) + 1);
                    form.setFieldsValue({ priority: Math.max(...receivedList) + 1 });
                }
            })
            .catch((error: any) => {
                console.error('Error fetching equipment priorities:', error);
                showError(t('messages:error-fetching-priorities'));
            });
    }, []);

    //To render Equipment types list configs
    const equipmentTypesList = useListConfigsForAScopeQuery(graphqlRequestClient, {
        scope: 'equipment_type',
        language: router.locale
    });

    useEffect(() => {
        if (equipmentTypesList) {
            setEquipmentTypes(equipmentTypesList?.data?.listConfigsForAScope);
        }
    }, [equipmentTypesList]);

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

    // TYPED SAFE ALL
    const [form] = Form.useForm();

    //handle call back on equipment Type change for displays
    const handleEquipmentTypeChange = (value: any) => {
        if (value === configs['EQUIPMENT_TYPE_MONO-PRODUCT_EQUIPMENT']) {
            setDisableTypeRelated(true);
            setBoxLineGroupValue(true);
            setBoxMonoArticleChange(true);
            form.setFieldsValue({
                qtyMaxArticle: 1,
                boxLineGrouped: true,
                boxMonoArticle: true
            });
        } else {
            setDisableTypeRelated(false);
            setBoxLineGroupValue(false);
            setBoxMonoArticleChange(false);
            setFreePickingOrderChange(false);
            form.setFieldsValue({
                boxLineGrouped: false,
                limitType: configs.EQUIPMENT_LIMIT_TYPE_MAXIMUM_QUANTITY,
                limitTypeText: equipmentLimitTypes?.find(
                    (e: any) => e.code == configs.EQUIPMENT_LIMIT_TYPE_MAXIMUM_QUANTITY
                ).text
            });
            setDisplayLimitTypeRelated(false);
            delete form.getFieldsValue(true)['boxMonoArticle'];
            delete form.getFieldsValue(true)['qtyMaxArticle'];
        }
    };

    //handle call back on equipment Type change for displays
    const handleEquipmentLimitTypeChange = (value: any) => {
        if (value === configs.EQUIPMENT_LIMIT_TYPE_MAXIMUM_QUANTITY) {
            setDisplayLimitTypeRelated(false);
        } else {
            setDisplayLimitTypeRelated(true);
        }
    };

    //manage call back on change boxes
    const onPriorityChange = (value: number | null) => {
        form.setFieldsValue({ priority: value });
    };
    const onPatternIdChange = (value: string) => {
        form.setFieldsValue({ patternId: value });
    };
    const onReservationPatternIdChange = (value: string) => {
        form.setFieldsValue({ reservationPatternId: value });
    };
    const onAvailableChange = (e: CheckboxChangeEvent) => {
        form.setFieldsValue({ available: e.target.checked });
    };
    const onDistributedChange = (e: CheckboxChangeEvent) => {
        form.setFieldsValue({ distributed: e.target.checked });
    };
    const onMonoCompanyChange = (e: CheckboxChangeEvent) => {
        form.setFieldsValue({ monoCompany: e.target.checked });
    };
    const onMonoCarrierChange = (e: CheckboxChangeEvent) => {
        form.setFieldsValue({ monoCarrier: e.target.checked });
    };
    const onBoxLineGroupChange = (e: CheckboxChangeEvent) => {
        form.setFieldsValue({ boxLineGroup: e.target.checked });
    };
    const onBoxMonoArticleChange = (e: CheckboxChangeEvent) => {
        form.setFieldsValue({ boxMonoArticle: e.target.checked });
        setBoxMonoArticleChange(e.target.checked);
    };
    const onCheckPositionChange = (e: CheckboxChangeEvent) => {
        form.setFieldsValue({ checkPosition: e.target.checked });
    };
    const onVirtualChange = (e: CheckboxChangeEvent) => {
        form.setFieldsValue({ virtual: e.target.checked });
    };
    const onMonoDeliveryChange = (e: CheckboxChangeEvent) => {
        form.setFieldsValue({ monoDelivery: e.target.checked });
    };
    const onAllowPickingOrderFreeChange = (e: CheckboxChangeEvent) => {
        form.setFieldsValue({ allowPickingOrderFree: e.target.checked });
        setFreePickingOrderChange(e.target.checked);
    };
    const onForceRepackingChange = (e: CheckboxChangeEvent) => {
        form.setFieldsValue({ forceRepacking: e.target.checked });
    };
    const onForcePickingCheckChange = (e: CheckboxChangeEvent) => {
        form.setFieldsValue({ forcePickingCheck: e.target.checked });
    };

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                // Here make api call of something else
                const formData = form.getFieldsValue(true);
                formData['status'] = configs.EQUIPMENT_STATUS_IN_PROGRESS;
                delete formData['limitTypeText'];
                const updateWithOrder = gql`
                    mutation executeFunction($id: String!, $fieldsInfos: JSON!) {
                        executeFunction(
                            functionName: "reorder_priority"
                            event: {
                                input: {
                                    ids: $id
                                    tableName: "equipment"
                                    orderingField: "priority"
                                    operation: "create"
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
                        id: 'new',
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
                            setUnsavedChanges(false);
                            router.push('/equipment');
                            showSuccess(t('messages:success-created'));
                        }
                    });
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

    return (
        <WrapperForm>
            <Form
                form={form}
                layout="vertical"
                scrollToFirstError
                onValuesChange={() => {
                    setUnsavedChanges(true);
                }}
            >
                <Form.Item label={t('common:stock-owner')} name="stockOwnerId">
                    <Select
                        placeholder={`${t('messages:please-select-a', {
                            name: t('common:stock-owner')
                        })}`}
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
                    name="type"
                    rules={[
                        {
                            required: true,
                            message: `${t('messages:error-message-empty-input')}`
                        }
                    ]}
                >
                    <Select
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:type')
                        })}`}
                        onChange={handleEquipmentTypeChange}
                    >
                        {equipmentTypes?.map((equipmentType: any) => (
                            <Option key={equipmentType.id} value={parseInt(equipmentType.code)}>
                                {equipmentType.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item
                    label={name}
                    name="name"
                    rules={[{ required: true, message: errorMessageEmptyInput }]}
                >
                    <Input />
                </Form.Item>
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
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:pattern')
                        })}`}
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
                        <InputNumber min={1} max={maxPriority} onChange={onPriorityChange} />
                    </Form.Item>
                </Col>
                <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                    <Col xs={24} xl={12}>
                        <Form.Item name="available">
                            <Checkbox onChange={onAvailableChange}>{t('d:available')}</Checkbox>
                        </Form.Item>
                        <Form.Item name="distributed">
                            <Checkbox onChange={onDistributedChange}>{t('d:distributed')}</Checkbox>
                        </Form.Item>
                        <Form.Item name="monoCompany">
                            <Checkbox onChange={onMonoCompanyChange}>
                                {t('d:mono-company')}
                            </Checkbox>
                        </Form.Item>
                    </Col>
                    <Col xs={24} xl={12}>
                        <Form.Item name="monoCarrier">
                            <Checkbox onChange={onMonoCarrierChange}>
                                {t('d:mono-carrier')}
                            </Checkbox>
                        </Form.Item>
                        <Form.Item name="boxLineGroup">
                            <Checkbox
                                disabled
                                checked={boxLineGroupedValue}
                                onChange={onBoxLineGroupChange}
                            >
                                {t('d:box-line-group')}
                            </Checkbox>
                        </Form.Item>
                        <Form.Item name="boxMonoArticle">
                            <Checkbox
                                disabled={disableTypeRelated === true ? true : false}
                                checked={boxMonoArticleChange}
                                onChange={onBoxMonoArticleChange}
                            >
                                {t('d:mono-product-box')}
                            </Checkbox>
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item label={t('d:qty-max-article')} name="qtyMaxArticle">
                    <InputNumber disabled value={1} />
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
                        disabled={disableTypeRelated === true ? false : true}
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
                            <Checkbox onChange={onCheckPositionChange}>
                                {t('d:check-position')}
                            </Checkbox>
                        </Form.Item>
                    </Col>
                    <Col xs={24} xl={12}>
                        <Form.Item name="virtual">
                            <Checkbox onChange={onVirtualChange}>{t('d:virtual')}</Checkbox>
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                    <Col xs={24} xl={12}>
                        <Form.Item name="allowPickingOrderFree">
                            <Checkbox
                                onChange={onAllowPickingOrderFreeChange}
                                disabled={disableTypeRelated === true ? false : true}
                                checked={freePickingOrderChange}
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
                    >
                        {printers?.map((printer: any) => (
                            <Option key={printer.id} value={parseInt(printer.code)}>
                                {printer.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                    <Col xs={24} xl={12}>
                        <Form.Item name="forceRepacking">
                            <Checkbox onChange={onForceRepackingChange}>
                                {t('d:forceRepacking')}
                            </Checkbox>
                        </Form.Item>
                    </Col>
                    <Col xs={24} xl={12}>
                        <Form.Item name="forcePickingCheck">
                            <Checkbox onChange={onForcePickingCheckChange}>
                                {t('d:forcePickingCheck')}
                            </Checkbox>
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item label={comment} name="comment">
                    <TextArea>{comment}</TextArea>
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
