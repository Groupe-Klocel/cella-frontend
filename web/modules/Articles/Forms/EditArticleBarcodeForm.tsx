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
import { getRulesWithNoSpacesValidator, showError, showInfo, showSuccess } from '@helpers';
import { Button, Col, Form, Input, Row, Select } from 'antd';
import Checkbox, { CheckboxChangeEvent } from 'antd/lib/checkbox';
import { useAuth } from 'context/AuthContext';
import {
    SimpleGetAllStockOwnersQuery,
    UpdateBarcodeMutation,
    UpdateBarcodeMutationVariables,
    useSimpleGetAllStockOwnersQuery,
    useUpdateBarcodeMutation
} from 'generated/graphql';
import useTranslation from 'next-translate/useTranslation';
import { useRouter } from 'next/router';
import { FC, useEffect, useState } from 'react';

export type EditArticleBarcodeFormProps = {
    barcodeId: any;
    articleId: string | undefined;
    details: any;
    articleLuBarcodeDetails: any;
};

const { Option } = Select;

interface IOption {
    value: string;
    id: string;
}

export const EditArticleBarcodeForm: FC<EditArticleBarcodeFormProps> = ({
    barcodeId,
    articleId,
    details,
    articleLuBarcodeDetails
}: EditArticleBarcodeFormProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const [form] = Form.useForm();

    const stockOwner = t('d:stockOwner');
    const article = t('common:article');
    const blacklisted = t('d:blacklisted');
    const master = t('d:master');
    const logisticUnit = t('d:logisticUnit');
    const name = t('common:name');
    const update = t('actions:update');
    const cancel = t('actions:cancel');

    const [blacklistedValue, setBlacklistedValue] = useState(details.blacklisted);
    const [masterValue, setMasterValue] = useState(articleLuBarcodeDetails.master);
    const [stockOwners, setStockOwners] = useState<any>();
    const stockOwnersList = useSimpleGetAllStockOwnersQuery<
        Partial<SimpleGetAllStockOwnersQuery>,
        Error
    >(graphqlRequestClient);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    useEffect(() => {
        if (stockOwnersList) {
            setStockOwners(stockOwnersList?.data?.stockOwners?.results);
        }
    }, [stockOwnersList]);

    const onBlacklistedChange = (e: CheckboxChangeEvent) => {
        setBlacklistedValue(!blacklistedValue);
        form.setFieldsValue({ blacklisted: e.target.checked });
    };
    const onMasterChange = (e: CheckboxChangeEvent) => {
        setMasterValue(!masterValue);
        form.setFieldsValue({ master: e.target.checked });
    };
    const onFinish = () => {
        form.validateFields()
            .then(() => {
                //Call Api front to update barcode and articleLuBarcode table
                const formData = form.getFieldsValue(true);
                setIsLoading(true);
                const fetchData = async () => {
                    const res = await fetch(`/api/barcodes/barcode_update/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            input: formData
                        })
                    });
                    if (res.ok) {
                        router.push(`/articles/${articleId}`);
                        showSuccess(t('messages:success-updated'));
                    }
                    if (!res.ok) {
                        const errorResponse = await res.json();
                        if (errorResponse.error.response.errors[0].extensions) {
                            showError(
                                t(
                                    `errors:${errorResponse.error.response.errors[0].extensions.code}`
                                )
                            );
                        } else {
                            showError(t('messages:error-update-data'));
                        }
                    }
                    if (res) {
                        setIsLoading(false);
                    }
                };
                fetchData();
            })
            .catch((err) => {
                showError(t('messages:error-update-data'));
            });
    };

    useEffect(() => {
        const tmp_details = {
            ...details,
            ...articleLuBarcodeDetails,
            associatedStockOwner: articleLuBarcodeDetails?.stockOwner?.name,
            article: articleLuBarcodeDetails?.article?.name,
            lu: articleLuBarcodeDetails?.articleLu?.name,
            name: details?.name
        };
        form.setFieldsValue(tmp_details);
    }, []);

    return (
        <WrapperForm>
            <Form form={form} scrollToFirstError>
                <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                    <Col xs={8} xl={12}>
                        <Form.Item label={name} name="name">
                            <Input disabled />
                        </Form.Item>
                    </Col>
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
                        <Form.Item label={logisticUnit} name="lu">
                            <Input disabled />
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Checkbox checked={blacklistedValue} onChange={onBlacklistedChange}>
                            {blacklisted}
                        </Checkbox>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Checkbox checked={masterValue} onChange={onMasterChange}>
                            {master}
                        </Checkbox>
                    </Col>
                </Row>
            </Form>
            <div style={{ textAlign: 'center' }}>
                <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                    <Col xs={24} xl={12}>
                        <Button type="primary" loading={isLoading} onClick={onFinish}>
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
