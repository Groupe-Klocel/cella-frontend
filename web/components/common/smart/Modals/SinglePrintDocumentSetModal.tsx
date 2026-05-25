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
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Form, Input, InputNumber, Modal, Select, Checkbox } from 'antd';
import { useEffect, useState } from 'react';
import { showError, showSuccess } from '@helpers';
import { useListParametersForAScopeQuery } from 'generated/graphql';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { useRouter } from 'next/router';
import { FormOptionType } from 'models/ModelsV2';
import Text from 'antd/lib/typography/Text';

const { Option } = Select;

export interface ISinglePrintDocumentSetModalProps {
    dataToPrint: any;
    showModal: any;
    allDocumentName: string[];
    documentReference?: string | any;
    customLanguage?: string;
    documentAttachmentsData?: any;
    setAllDocumentName?: any;
}

const SinglePrintDocumentSetModal = ({
    showModal,
    dataToPrint,
    allDocumentName,
    documentReference,
    customLanguage,
    documentAttachmentsData,
    setAllDocumentName
}: ISinglePrintDocumentSetModalProps) => {
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

    const documentPlusDocumentAttachments = [
        ...(allDocumentName?.map((allDocument: any) => {
            return {
                id: allDocument.name,
                name: allDocument.description
            };
        }) ?? []),
        ...(documentAttachmentsData ?? [])
    ];

    useEffect(() => {
        if (customLanguage) {
            setPrintLanguage(customLanguage);
        } else if (defaultPrintLanguage) {
            setPrintLanguage(defaultPrintLanguage.data?.listParametersForAScope[0].text);
        }
    }, [defaultPrintLanguage.data, customLanguage]);

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
    const [selectAllDocuments, setSelectAllDocuments] = useState(false);
    const printData = async (
        inputForPrinting: any,
        printer: string,
        recipients: string,
        reference: string,
        documents: any,
        documentAttachments: any
    ) => {
        const documentMutation = gql`
            mutation generateDocuments(
                $documents: [DocumentsInput!]!
                $language: String!
                $printer: String
                $recipients: String
                $reference: String
                $documentAttachments: [String!]
            ) {
                generateDocuments(
                    documents: $documents
                    language: $language
                    printer: $printer
                    mailRecipients: $recipients
                    reference: $reference
                    documentAttachments: $documentAttachments
                ) {
                    __typename
                    ... on RenderedDocuments {
                        results {
                            url
                            filename
                        }
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
            documents: documents.map((document: any) => ({
                documentName: document,
                context: inputForPrinting
            })),
            language: printLanguage,
            printer,
            recipients,
            reference,
            documentAttachments
        };

        const documentResult = await graphqlRequestClient.request(
            documentMutation,
            documentVariables
        );

        if (documentResult.generateDocuments.__typename !== 'RenderedDocuments') {
            showError(t('messages:error-print-data'));
            console.error('Error details:', documentResult.generateDocuments);
        } else {
            printer || recipients
                ? showSuccess(t('messages:success-print-data'))
                : documentResult.generateDocuments.results.map((result: any) => {
                      window.open(result.url, '_blank');
                  });
        }
    };

    const handleSelectAllDocuments = (checked: boolean) => {
        setSelectAllDocuments(checked);
        if (checked) {
            const allDocumentIds = documentPlusDocumentAttachments.map((doc: any) => doc.id);
            form.setFieldValue('documents', allDocumentIds);
        } else {
            form.setFieldValue('documents', []);
        }
    };

    const handleCancel = () => {
        showModal.setShowSinglePrintModal(false);
        form.resetFields();
        setSelectAllDocuments(false);
        if (setAllDocumentName) {
            setAllDocumentName(undefined);
        }
    };

    const onClickOk = () => {
        setIsPrintingLoading(true);
        form.validateFields()
            .then(() => {
                const formData = form.getFieldsValue(true);
                printData(
                    dataToPrint,
                    formData.printer,
                    formData.recipients,
                    documentReference,
                    formData.documents.filter((attachmentId: any) =>
                        allDocumentName?.some((doc: any) => doc.name === attachmentId)
                    ),
                    formData.documents.filter((attachmentId: any) =>
                        documentAttachmentsData?.some((doc: any) => doc.id === attachmentId)
                    )
                );
            })
            .catch((err) => {
                showError(t('messages:error-print-data'));
                console.log('printError', err);
            })
            .finally(() => {
                form.resetFields();
                setSelectAllDocuments(false);
            });
        setIsPrintingLoading(false);
        showModal.setShowSinglePrintModal(false);
    };

    return (
        <Modal
            title={t('actions:set-printer')}
            open={showModal.showSinglePrintModal}
            onOk={onClickOk}
            onCancel={handleCancel}
            width={'80%'}
            confirmLoading={isPrintingLoading}
            okText={t('actions:submit')}
            cancelText={t('actions:cancel')}
        >
            <WrapperForm>
                <Form form={form} layout="vertical" scrollToFirstError>
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
                    <Form.Item label={t('d:documents')} name="documents">
                        <Select
                            mode="multiple"
                            placeholder={`${t('messages:please-select-one-or-more', {
                                name: t('d:documents')
                            })}`}
                            allowClear
                            disabled={selectAllDocuments}
                        >
                            {documentPlusDocumentAttachments?.map((attachment: any) => (
                                <Option key={attachment.id} value={attachment.id}>
                                    {attachment.name}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item>
                        <Checkbox
                            checked={selectAllDocuments}
                            onChange={(e) => handleSelectAllDocuments(e.target.checked)}
                        >
                            {t('actions:select-all-documents')}
                        </Checkbox>
                    </Form.Item>
                    <Text disabled italic style={{ fontSize: '10px' }}>
                        {t('messages:no-printer-behaviour')}
                    </Text>
                    <Form.Item label={t('d:recipients-mail-adresses')} name="recipients">
                        <Input />
                    </Form.Item>
                </Form>
            </WrapperForm>
        </Modal>
    );
};

export { SinglePrintDocumentSetModal };
