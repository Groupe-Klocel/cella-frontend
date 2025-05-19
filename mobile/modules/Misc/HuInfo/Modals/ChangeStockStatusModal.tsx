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
import { Form, InputNumber, Modal, Select } from 'antd';
import { useEffect, useState } from 'react';
import { showError, showSuccess } from '@helpers';
import { useListParametersForAScopeQuery } from 'generated/graphql';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import TextArea from 'antd/es/input/TextArea';
import configs from '../../../../../common/configs.json';
import parameters from '../../../../../common/parameters.json';
import { gql } from 'graphql-request';

const { Option } = Select;
export interface IChangeStockStatusModalProps {
    id: string;
    setRefetch: any;
    visible: boolean;
    showhideModal: () => void;
    content: any;
}
const ChangeStockStatusModal = ({
    content,
    visible,
    showhideModal,
    id,
    setRefetch
}: IChangeStockStatusModalProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const errorMessageUpdateData = t('messages:error-update-data');
    const successMessageUpdateData = t('messages:success-updated');
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();

    const originalFeatures = content?.handlingUnitContentFeatures?.reduce(
        (acc: any, feature: any, index: number) => {
            const featureName = feature.featureCode?.name;
            const featureId = feature.featureCode?.id;
            const featureValue = feature.value;

            if (featureName && featureId && featureValue !== undefined) {
                acc[index + 1] = {
                    [featureName]: {
                        id: featureId,
                        value: featureValue
                    }
                };
            }

            return acc;
        },
        {}
    );

    const updateHandlingUnitContentQuery = gql`
        mutation UpdateHandlingUnitContent($id: String!, $input: UpdateHandlingUnitContentInput!) {
            updateHandlingUnitContent(id: $id, input: $input) {
                id
                handlingUnitId
                handlingUnit {
                    name
                    locationId
                    location {
                        name
                    }
                    stockOwnerId
                    stockOwner {
                        name
                    }
                }
                articleId
                article {
                    name
                    description
                }
                quantity
                stockStatus
                reservation
                stockOwner {
                    id
                    name
                }
                created
                createdBy
                modified
                modifiedBy
                lastTransactionId
            }
        }
    `;

    const executeFunctionQuery = gql`
        mutation executeFunction($functionName: String!, $event: JSON!) {
            executeFunction(functionName: $functionName, event: $event) {
                status
                output
            }
        }
    `;

    // Retrieve stock status list
    const stockStatusList = useListParametersForAScopeQuery(graphqlRequestClient, {
        language: router.locale,
        scope: 'stock_statuses'
    });

    useEffect(() => {
        form.setFieldsValue({
            stockStatus: content?.stockStatus,
            quantity: content?.quantity,
            comment: ''
        });
    }, [content, form]);

    const handleCancel = async () => {
        showhideModal();
        form.resetFields();
        setRefetch((prev: any) => !prev);
    };

    const onClickOk = async () => {
        const movementInfos: { [key: string]: any } = {
            locationId: content?.handlingUnit?.locationId,
            locationName: content?.handlingUnit?.location.name,
            handlingUnitId: content?.handlingUnitId,
            handlingUnitName: content?.handlingUnit.name,
            handlingUnitContentId: content?.id,
            features: originalFeatures,
            stockStatus: content?.stockStatus,
            reservation: content?.reservation,
            articleId: content?.articleId,
            articleName: content?.article.name,
            stockOwnerId: content?.stockOwnerId,
            stockOwnerName: content?.stockOwner.name,
            quantity: content?.quantity
        };
        form.validateFields()
            .then(async () => {
                const formData = form.getFieldsValue(true);
                // Remove 'comment' from formData before sending to mutation
                const { comment, ...formDataWithoutComment } = formData;
                // Compare formDataWithoutComment with movementInfos to check for changes
                const changedKeys = Object.keys(formDataWithoutComment).filter(
                    (key) => formDataWithoutComment[key] !== movementInfos[key]
                );
                if (changedKeys.length > 0) {
                    const updateHandlingUnitContentVariables = {
                        id: id,
                        input: formDataWithoutComment
                    };
                    const updateHandlingUnitContentResult = await graphqlRequestClient.request(
                        updateHandlingUnitContentQuery,
                        updateHandlingUnitContentVariables
                    );

                    let executeFunctionVariables = {
                        functionName: 'create_movements',
                        event: {
                            input: {
                                content: movementInfos,
                                data: formData,
                                type: 'update',
                                lastTransactionId:
                                    updateHandlingUnitContentResult?.updateHandlingUnitContent
                                        ?.lastTransactionId
                            }
                        }
                    };

                    const executeFunctionResult = await graphqlRequestClient.request(
                        executeFunctionQuery,
                        executeFunctionVariables
                    );

                    if (executeFunctionResult.executeFunction.status === 'ERROR') {
                        showError(executeFunctionResult.executeFunction.output);
                    } else if (
                        executeFunctionResult.executeFunction.status === 'OK' &&
                        executeFunctionResult.executeFunction.output.status === 'KO'
                    ) {
                        showError(
                            t(`errors:${executeFunctionResult.executeFunction.output.output.code}`)
                        );
                        console.log(
                            'Backend_message',
                            executeFunctionResult.executeFunction.output.output
                        );
                    } else {
                        showSuccess(successMessageUpdateData);
                    }
                }
                showhideModal();
                setRefetch((prev: any) => !prev);
            })
            .catch((err) => {
                showError(errorMessageUpdateData);
                console.log(err);
            });
    };
    //end of movement creation section */

    return (
        <Modal
            title={t('actions:change-content')}
            open={visible}
            onCancel={handleCancel}
            onOk={onClickOk}
            width={800}
        >
            <Form form={form} layout="vertical" scrollToFirstError size="small">
                <Form.Item
                    label={t('common:stock-status')}
                    name="stockStatus"
                    initialValue={content?.stockStatus}
                >
                    <Select
                        allowClear
                        placeholder={`${t('messages:please-select-a', {
                            name: t('common:stock-status')
                        })}`}
                    >
                        {stockStatusList.data?.listParametersForAScope?.map((stockStatus: any) => (
                            <Option key={stockStatus.code} value={Number(stockStatus.code)}>
                                {stockStatus.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item
                    label={t('common:quantity')}
                    name="quantity"
                    initialValue={content?.quantity}
                >
                    <InputNumber min={0} />
                </Form.Item>
                <Form.Item label={t('common:comment')} name="comment">
                    <TextArea />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export { ChangeStockStatusModal };
