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
import useTranslation from 'next-translate/useTranslation';
import { Form, InputNumber, Modal, Select } from 'antd';
import { useEffect, useState } from 'react';
import { showError, showSuccess } from '@helpers';
import { useListParametersForAScopeQuery } from 'generated/graphql';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { useRouter } from 'next/router';
import { FormOptionType } from 'models/ModelsV2';
import Text from 'antd/lib/typography/Text';

const { Option } = Select;

export interface INumberOfPrintsModalV2Props {
    dataToPrint: any;
    showModal: any;
    documentName: string;
}

const NumberOfPrintsModalV2 = ({
    showModal,
    dataToPrint,
    documentName
}: INumberOfPrintsModalV2Props) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const errorMessageEmptyInput = t('messages:error-message-empty-input');
    const { graphqlRequestClient } = useAuth();
    const [printLanguage, setPrintLanguage] = useState<string>();
    const router = useRouter();
    const [printers, setPrinters] = useState<Array<FormOptionType>>();

    // Get default printing language
    const defaultPrintLanguage = useListParametersForAScopeQuery(graphqlRequestClient, {
        scope: 'global',
        code: 'default_print_language'
    });

    useEffect(() => {
        if (defaultPrintLanguage) {
            setPrintLanguage(defaultPrintLanguage.data?.listParametersForAScope[0].text);
        }
    }, [defaultPrintLanguage.data]);

    // Get all printers
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

    const [isPrintingLoading, setIsPrintingLoading] = useState(false);
    const printData = async (inputForPrinting: any, copies: number, printer: string) => {
        const documentMutation = gql`
            mutation generateDocument(
                $documentName: String!
                $language: String!
                $printer: String
                $context: JSON!
            ) {
                generateDocument(
                    documentName: $documentName
                    language: $language
                    printer: $printer
                    context: $context
                ) {
                    __typename
                    ... on RenderedDocument {
                        url
                    }
                    ... on TemplateDoesNotExist {
                        message
                    }
                    ... on TemplateError {
                        message
                    }
                    ... on MissingContext {
                        message
                    }
                }
            }
        `;

        const documentVariables = {
            documentName,
            language: printLanguage,
            printer,
            context: { ...inputForPrinting, copies }
        };

        const documentResult = await graphqlRequestClient.request(
            documentMutation,
            documentVariables
        );

        console.log('documentResult', documentResult);

        if (documentResult.generateDocument.__typename !== 'RenderedDocument') {
            showError(t('messages:error-print-data'));
        } else {
            printer
                ? showSuccess(t('messages:success-print-data'))
                : window.open(documentResult.generateDocument.url, '_blank');
        }
    };

    const handleCancel = () => {
        showModal.setShowNumberOfPrintsModal(false);
    };

    const onClickOk = () => {
        setIsPrintingLoading(true);
        form.validateFields()
            .then(() => {
                const formData = form.getFieldsValue(true);
                printData(dataToPrint, formData.copies, formData.printer);
            })
            .catch((err) => {
                showError(t('messages:error-print-data'));
            });
        setIsPrintingLoading(false);
        showModal.setShowNumberOfPrintsModal(false);
    };

    return (
        <Modal
            title={t('actions:number-of-copies')}
            visible={showModal.showNumberOfPrintsModal}
            onOk={onClickOk}
            onCancel={handleCancel}
            width={450}
            confirmLoading={isPrintingLoading}
        >
            <WrapperForm>
                <Form form={form} layout="vertical" scrollToFirstError>
                    <Form.Item
                        label={t('d:number-of-copies')}
                        name="copies"
                        rules={[{ required: true, message: errorMessageEmptyInput }]}
                        initialValue={1}
                    >
                        <InputNumber min={1} precision={0} />
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
                        <Text disabled italic style={{ fontSize: '10px' }}>
                            {t('messages:no-printer-behaviour')}
                        </Text>
                    </Form.Item>
                </Form>
            </WrapperForm>
        </Modal>
    );
};

export { NumberOfPrintsModalV2 };
