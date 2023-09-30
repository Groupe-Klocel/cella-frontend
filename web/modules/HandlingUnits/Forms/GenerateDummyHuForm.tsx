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
import { showError, showInfo, useHandlingUnitModels, useStockOwnerIds } from '@helpers';
import { Button, Col, Form, InputNumber, Row, Select, Typography } from 'antd';
import { useAuth } from 'context/AuthContext';
import { FormOptionType, idNameObjectType } from 'models/Models';
import useTranslation from 'next-translate/useTranslation';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const { Option } = Select;

export const GenerateDummyHuForm = () => {
    const { t } = useTranslation('common');

    // TYPED SAFE ALL
    const [form] = Form.useForm();
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Call api to generate HUs
    const onFinish = () => {
        form.validateFields()
            .then(() => {
                // Here make api call of something else
                const { huNb } = form.getFieldsValue(true);
                setIsLoading(true);
                const fetchData = async () => {
                    const res = await fetch(`/api/handling-units/dummy-hu-generator/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            huNb
                        })
                    });
                    if (!res.ok) {
                        setIsLoading(false);
                        showError(t('messages:error-print-data'));
                    }
                    const response = await res.json();
                    if (response.url) {
                        setIsLoading(false);
                        window.open(response.url, '_blank');
                    } else {
                        setIsLoading(false);
                        showError(t('messages:error-print-data'));
                    }
                    form.resetFields();
                };
                fetchData();
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
