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
import { checkUndefinedValues, showError, showInfo, showSuccess } from '@helpers';
import { AutoComplete, Button, Col, Form, Input, Row, Select } from 'antd';
import Checkbox, { CheckboxChangeEvent } from 'antd/lib/checkbox';
import { useAuth } from 'context/AuthContext';
import {
    SimpleGetAllStockOwnersQuery,
    UpdateArticleMutationVariables,
    UpdateBarcodeMutation,
    UpdateBarcodeMutationVariables,
    useSimpleGetAllStockOwnersQuery,
    useUpdateBarcodeMutation
} from 'generated/graphql';
import useTranslation from 'next-translate/useTranslation';
import { useRouter } from 'next/router';
import { FC, useEffect, useState } from 'react';

export type EditBarcodeFormProps = {
    barcodeId: string;
    details: any;
};

const { Option } = Select;

interface IOption {
    value: string;
    id: string;
}

export const EditBarcodeForm: FC<EditBarcodeFormProps> = ({
    barcodeId,
    details
}: EditBarcodeFormProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const [form] = Form.useForm();

    const stockOwner = t('d:stockOwner');
    const rotation = t('d:rotation');
    const preparationMode = t('d:preparationMode');
    const supplierName = t('d:supplierName');
    const supplierArticleCode = t('d:supplierArticleCode');
    const article = t('common:article');
    const blacklisted = t('d:blacklisted');
    const logisticUnit = t('d:logisticUnit');
    const name = t('common:name');
    const errorMessageEmptyInput = t('messages:error-message-empty-input');
    const errorMessageUpdateData = t('messages:error-update-data');
    const successMessageUpdateData = t('messages:success-updated');
    const infoMessageUpdateData = t('messages:info-update-wip');
    const update = t('actions:update');
    const cancel = t('actions:cancel');

    const [barcodeRotationsValue, setBarcodeRotationsValue] = useState(details.barcodeRotation);
    const [barcodePreparationModesValue, setBarcodePreparationModesValue] = useState(
        details.barcodePreparationMode
    );
    const [stockOwnersValue, setStockOwnersValue] = useState(details.stockOwnerId);
    const [logisticUnitValue, setLogisticUnitValue] = useState(details.stockOwnerId);
    const [blacklistedValue, setBlacklistedValue] = useState(details.blacklisted);
    const [stockOwners, setStockOwners] = useState<any>();
    const [barcodeRotations, setBarcodeRotations] = useState<any>();
    const [barcodePreparationModes, setBarcodePreparationModes] = useState<any>();

    const stockOwnersList = useSimpleGetAllStockOwnersQuery<
        Partial<SimpleGetAllStockOwnersQuery>,
        Error
    >(graphqlRequestClient);

    useEffect(() => {
        if (stockOwnersList) {
            setStockOwners(stockOwnersList?.data?.stockOwners?.results);
        }
    }, [stockOwnersList]);

    const {
        mutate,
        isLoading: updateLoading,
        data
    } = useUpdateBarcodeMutation<Error>(graphqlRequestClient, {
        onSuccess: (
            data: UpdateBarcodeMutation,
            _variables: UpdateArticleMutationVariables,
            _context: any
        ) => {
            router.push(`/barcode/${data.updateBarcode?.id}`);
            showSuccess(successMessageUpdateData);
        },
        onError: () => {
            showError(errorMessageUpdateData);
        }
    });

    const updateBarcode = ({ id, input }: UpdateBarcodeMutationVariables) => {
        mutate({ id, input });
    };

    const onBlacklistedChange = (e: CheckboxChangeEvent) => {
        setBlacklistedValue(!blacklistedValue);
        form.setFieldsValue({ blacklisted: e.target.checked });
    };

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                checkUndefinedValues(form);
                const formData = form.getFieldsValue(true);
                if (formData['rotation'] == '') {
                    formData['rotation'] = null;
                }
                delete formData['associatedStockOwner'];
                delete formData['article'];
                delete formData['lu'];
                delete formData['stockOwner'];
                delete formData['preparationModeText'];
                delete formData['rotationText'];
                delete formData['articleLuBarcodes'];
                updateBarcode({ input: formData, id: barcodeId });
            })
            .catch((err) => showError(errorMessageUpdateData));
    };

    useEffect(() => {
        const tmp_details = {
            ...details,
            associatedStockOwner: details.stockOwner.name,
            article: details.articleLuBarcodes[0].article.name,
            lu: details.articleLuBarcodes[0].articleLu.lu.name
        };
        delete tmp_details['id'];
        delete tmp_details['created'];
        delete tmp_details['createdBy'];
        delete tmp_details['modified'];
        delete tmp_details['modifiedBy'];
        form.setFieldsValue(tmp_details);
        if (updateLoading) {
            showInfo(infoMessageUpdateData);
        }
    }, [updateLoading]);

    return (
        <WrapperForm>
            <Form form={form} scrollToFirstError>
                <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                    <Col xs={8} xl={12}>
                        <Form.Item name="associatedStockOwner" label={stockOwner}>
                            <Input disabled />
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Form.Item label={article} name="article">
                            {<Input disabled />}
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Form.Item label={name} name="name">
                            <Input disabled />
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Form.Item label={logisticUnit} name="lu">
                            <Input disabled />
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Form.Item
                            name="preparationMode"
                            label={preparationMode}
                            rules={[{ required: true, message: errorMessageEmptyInput }]}
                        >
                            <Select>
                                {barcodePreparationModes?.map((barcodePreparationMode: any) => (
                                    <Option
                                        key={barcodePreparationMode.id}
                                        value={parseInt(barcodePreparationMode.code)}
                                    >
                                        {barcodePreparationMode.text}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Form.Item name="rotation" label={rotation}>
                            <Select defaultValue="">
                                <Option value=""> </Option>
                                {barcodeRotations?.map((barcodeRotation: any) => (
                                    <Option
                                        key={barcodeRotation.id}
                                        value={parseInt(barcodeRotation.code)}
                                    >
                                        {barcodeRotation.text}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Form.Item label={supplierName} name="supplierName">
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Form.Item label={supplierArticleCode} name="supplierArticleCode">
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Checkbox checked={blacklistedValue} onChange={onBlacklistedChange}>
                            {blacklisted}
                        </Checkbox>
                    </Col>
                </Row>
            </Form>
            <div style={{ textAlign: 'center' }}>
                <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                    <Col xs={24} xl={12}>
                        <Button type="primary" loading={updateLoading} onClick={onFinish}>
                            {update}
                        </Button>
                    </Col>
                    <Col xs={24} xl={12}>
                        <Button danger onClick={() => router.back()}>
                            {cancel}
                        </Button>
                    </Col>
                </Row>
            </div>
        </WrapperForm>
    );
};
