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
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Col, Form, Input, Select, Modal, Row, Checkbox } from 'antd';
import { showError, showSuccess } from '@helpers';
import { useAuth } from 'context/AuthContext';
import { useState, useEffect } from 'react';
import { gql } from 'graphql-request';
import { useListParametersForAScopeQuery } from 'generated/graphql';
import { useRouter } from 'next/router';

export interface IEditHandlingUnitContentsRenderModalProps {
    visible: boolean;
    rows: any;
    showhideModal: () => void;
    refetch: boolean;
    setRefetch: () => void;
}

const EditHandlingUnitContentsRenderModal = ({
    visible,
    showhideModal,
    rows,
    setRefetch
}: IEditHandlingUnitContentsRenderModalProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const [form] = Form.useForm();
    const [stockStatus, setStockStatus] = useState<any>();
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const selectedRows = rows;
    const [enableReservation, setEnableReservation] = useState(false);
    const [deleteReservation, setDeleteReservation] = useState(false);

    const stockStatusTextList = useListParametersForAScopeQuery(graphqlRequestClient, {
        scope: 'stock_statuses',
        language: router.locale
    });

    useEffect(() => {
        if (stockStatusTextList?.data?.listParametersForAScope) {
            setStockStatus(stockStatusTextList.data.listParametersForAScope);
        }
    }, [stockStatusTextList.data]);

    const handleCancel = () => {
        if (!loading) {
            showhideModal();
            form.resetFields();
        }
    };

    const onClickOk = async () => {
        try {
            setLoading(true);

            const formData = await form.validateFields();

            if (deleteReservation) {
                formData.reservation = '';
            }

            const query = gql`
                mutation executeFunction($functionName: String!, $event: JSON!) {
                    executeFunction(functionName: $functionName, event: $event) {
                        status
                        output
                    }
                }
            `;

            const variables = {
                functionName: 'bulk_update_handling_unit_contents',
                event: {
                    input: {
                        formData,
                        selectedRows
                    }
                }
            };

            const queryResult = await graphqlRequestClient.request(query, variables);

            if (!queryResult || !queryResult.executeFunction) {
                showError(t('messages:error-executing-function'));
            } else if (queryResult.executeFunction.status === 'ERROR') {
                showError(queryResult.executeFunction.output);
            } else if (
                queryResult.executeFunction.status === 'OK' &&
                queryResult.executeFunction.output.status === 'KO'
            ) {
                const backendCode = queryResult.executeFunction.output.output?.code;
                showError(
                    backendCode
                        ? t(`errors:${backendCode}`)
                        : queryResult.executeFunction.output.output?.message
                );
                console.log('Backend_message', queryResult.executeFunction.output.output);
            } else {
                showSuccess(t('messages:success-updated'));
                showhideModal();
                form.resetFields();
                setRefetch();
            }

            form.resetFields();
            showhideModal();
            setEnableReservation(false);
            setDeleteReservation(false);
        } catch (error: any) {
            showError(error?.message || t('messages:error-executing-function'));
            console.log('executeFunctionError', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={t('actions:edit-huc')}
            open={visible}
            onOk={onClickOk}
            onCancel={handleCancel}
            width="25vw"
            okButtonProps={{ loading }}
            cancelButtonProps={{ disabled: loading }}
        >
            <Form form={form} layout="vertical" scrollToFirstError>
                <Row justify="center">
                    <Col>
                        <Form.Item label={t('d:stockStatus')} name="stockStatus">
                            <Select
                                allowClear
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('d:stockStatus')
                                })}`}
                            >
                                {stockStatus?.map((status: any) => (
                                    <Select.Option
                                        key={parseInt(status.code)}
                                        value={parseInt(status.code)}
                                    >
                                        {status.text}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item label={t('d:reservation')}>
                            <Row gutter={8} align="middle">
                                <Col>
                                    <Form.Item valuePropName="checked">
                                        <Checkbox
                                            checked={enableReservation}
                                            onChange={(e) => setEnableReservation(e.target.checked)}
                                            disabled={deleteReservation}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col flex="1">
                                    <Form.Item
                                        name="reservation"
                                        rules={[
                                            {
                                                required: enableReservation && !deleteReservation,
                                                message: t('messages:field-required', {
                                                    name: t('d:reservation')
                                                })
                                            }
                                        ]}
                                    >
                                        <Input disabled={!enableReservation || deleteReservation} />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Row gutter={8} align="middle">
                                <Col flex="none">
                                    <Form.Item valuePropName="checked" noStyle>
                                        <Checkbox
                                            checked={deleteReservation}
                                            onChange={(e) => setDeleteReservation(e.target.checked)}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col flex="auto">
                                    <span>{t('d:delete-reservation')}</span>
                                </Col>
                            </Row>
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
        </Modal>
    );
};

export { EditHandlingUnitContentsRenderModal };
