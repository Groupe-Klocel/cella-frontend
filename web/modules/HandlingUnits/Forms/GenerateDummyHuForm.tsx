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
import { Button, Col, Form, InputNumber, Row, Select } from 'antd';
import { useAuth } from 'context/AuthContext';
import { useListParametersForAScopeQuery } from 'generated/graphql';
import { gql } from 'graphql-request';
import { FormOptionType } from 'models/Models';
import useTranslation from 'next-translate/useTranslation';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const { Option } = Select;

export const GenerateDummyHuForm = () => {
    const { t } = useTranslation('common');
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();

    // TYPED SAFE ALL
    const [form] = Form.useForm();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [handlingUnitType, setHandlingUnitType] = useState<Array<FormOptionType>>();
    const [printers, setPrinters] = useState<Array<FormOptionType>>();
    const [printLanguage, setPrintLanguage] = useState<string>();

    // Get default printing language
    const defaultPrintLanguage = useListParametersForAScopeQuery(graphqlRequestClient, {
        scope: 'default_print_language'
    });
    useEffect(() => {
        if (defaultPrintLanguage) {
            setPrintLanguage(defaultPrintLanguage.data?.listParametersForAScope[0].text);
        }
    }, [defaultPrintLanguage.data]);

    // Get all handling unit types
    const handlingUnitTypeList = useListParametersForAScopeQuery(graphqlRequestClient, {
        language: router.locale,
        scope: 'handling_unit_type'
    });
    useEffect(() => {
        if (handlingUnitTypeList) {
            const newHandlingUnitType: Array<FormOptionType> = [];

            const cData = handlingUnitTypeList?.data?.listParametersForAScope;
            if (cData) {
                cData.forEach((item) => {
                    newHandlingUnitType.push({ key: parseInt(item.code), text: item.text });
                });
                setHandlingUnitType(newHandlingUnitType);
            }
        }
    }, [handlingUnitTypeList.data]);

    // Get all handling unit types
    const printerList = useListParametersForAScopeQuery(graphqlRequestClient, {
        language: router.locale,
        scope: 'printer'
    });
    useEffect(() => {
        if (printerList) {
            const newPrinters: Array<FormOptionType> = [];

            const cData = printerList?.data?.listParametersForAScope;
            if (cData) {
                cData.forEach((item) => {
                    newPrinters.push({ key: item.code, text: item.text });
                });
                setPrinters(newPrinters);
            }
        }
    }, [printerList.data]);

    const [isGenerateDummyHULoading, setIsGenerateDummyHULoading] = useState(false);
    // call generateDummyHu function
    async function generateDummyHu(functionName: string, formData: any) {
        setIsGenerateDummyHULoading(true);
        const query = gql`
            mutation executeFunction($functionName: String!, $event: JSON!) {
                executeFunction(functionName: $functionName, event: $event) {
                    status
                    output
                }
            }
        `;

        const variables = {
            functionName,
            event: {
                input: formData
            }
        };

        try {
            const generateDummyHu_result = await graphqlRequestClient.request(query, variables);
            if (generateDummyHu_result.executeFunction.status === 'ERROR') {
                showError(generateDummyHu_result.executeFunction.output);
            } else if (
                generateDummyHu_result.executeFunction.status === 'OK' &&
                generateDummyHu_result.executeFunction.output.status === 'KO'
            ) {
                showError(t(`errors:${generateDummyHu_result.executeFunction.output.output.code}`));
                console.log(
                    'Backend_message',
                    generateDummyHu_result.executeFunction.output.output
                );
            } else {
                console.log('generateDummyHu_result', generateDummyHu_result);
                if (generateDummyHu_result.executeFunction.output.isPrinted) {
                    showSuccess(t('messages:success-generate-dummy-hu-on-printer'));
                } else {
                    window.open(generateDummyHu_result.executeFunction.output.url, '_blank');
                }
                form.resetFields();
            }
            setIsGenerateDummyHULoading(false);
        } catch (error) {
            showError(t('messages:error-executing-function'));
            setIsGenerateDummyHULoading(false);
        }
    }

    // Call api to generate HUs
    const onFinish = () => {
        form.validateFields()
            .then(() => {
                // Here make api call of something else
                const formData = form.getFieldsValue(true);
                generateDummyHu('K_generateDummyHu', {
                    type: formData.handlingUnitType,
                    printer: formData.printer,
                    huNb: formData.huNb,
                    language: printLanguage
                });
            })
            .catch((err) => {
                setIsLoading(false);
                form.resetFields();
                showError(t('messages:error-creating-data'));
            });
    };

    useEffect(() => {
        if (isLoading) {
            showInfo(t('messages:info-create-wip'));
        }
    }, [isLoading]);

    return (
        <WrapperForm>
            <Form form={form} scrollToFirstError layout="vertical">
                <Form.Item
                    label={t('d:handlingUnitType')}
                    name="handlingUnitType"
                    rules={[
                        { required: true, message: `${t('messages:error-message-empty-input')}` }
                    ]}
                >
                    <Select
                        allowClear
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:handlingUnitType')
                        })}`}
                    >
                        {handlingUnitType?.map((huType: any) => (
                            <Option key={huType.key} value={huType.key}>
                                {huType.text}
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
                            <Option key={printer.key} value={printer.key}>
                                {printer.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item
                    label={t('nb-generate')}
                    name="huNb"
                    initialValue={1}
                    rules={[
                        { required: true, message: `${t('messages:error-message-empty-input')}` }
                    ]}
                >
                    <InputNumber min={1} />
                </Form.Item>
                <Row>
                    <Col span={24} style={{ textAlign: 'center' }}>
                        <Button type="primary" loading={isLoading} onClick={onFinish}>
                            {t('actions:submit')}
                        </Button>
                    </Col>
                </Row>
            </Form>
        </WrapperForm>
    );
};
