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
import { Form, Input, Modal, Card, Row, Col, Space } from 'antd';
import { useEffect } from 'react';
import { showError, showSuccess, useUpdate, showInfo } from '@helpers';
import { useRouter } from 'next/router';
import Text from 'antd/lib/typography/Text';

export interface ICrontabModalV2Props {
    idToUpdate: any;
    showModal: any;
    model: any;
    fields: any;
}

const CrontabModalV2 = ({ showModal, idToUpdate, model, fields }: ICrontabModalV2Props) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const errorMessageEmptyInput = t('messages:error-message-empty-input');
    const router = useRouter();

    //UPDATE schedulerConfig argument
    const {
        isLoading: updateLoading,
        result: updateResult,
        mutate: updateSchedulerConfigArgument
    } = useUpdate(model.resolverName, model.endpoints.update, fields);

    useEffect(() => {
        if (!(updateResult && updateResult.data)) return;

        if (updateResult.success) {
            router.push(`/scheduler-configs`);
            showSuccess(t('messages:success-updated'));
        } else {
            showError(t('messages:error-update-data'));
        }
    }, [updateResult]);

    const handleCancel = () => {
        showModal.setOpen(false);
        router.push(`/scheduler-configs/${idToUpdate.id}`);
    };

    const onClickOk = () => {
        form.validateFields()
            .then(() => {
                const { minute, hour, dayofmonth, month, dayofweek } = form.getFieldsValue(true);
                //check crontab
                const cron = `${minute} ${hour} ${dayofmonth} ${month} ${dayofweek}`;
                const cronData = {
                    cron: `${minute} ${hour} ${dayofmonth} ${month} ${dayofweek}`
                };
                updateSchedulerConfigArgument({
                    id: idToUpdate.id,
                    input: { ...cronData }
                });
            })
            .catch((err) => {
                showError(t('messages:error-creating-data'));
            });
        showModal.setOpen(false);
    };

    useEffect(() => {
        const tmp_details = { ...idToUpdate };

        form.setFieldsValue(tmp_details);
        if (updateLoading) {
            showInfo(t('messages:info-create-wip'));
        }
    }, [updateLoading]);

    const CheckMinuteRule = (_: any, value: string) => {
        //eslint-disable-next-line
        const regex =
            /^(\*|[1-5]?[0-9](-[1-5]?[0-9])?)(\/[1-9][0-9]*)?(,(\*|[1-5]?[0-9](-[1-5]?[0-9])?)(\/[1-9][0-9]*)?)*$/;
        if (value && !regex.test(value)) {
            return Promise.reject(t('messages:not-allowed-value'));
        }
        return Promise.resolve();
    };
    const CheckHourRule = (_: any, value: string) => {
        //eslint-disable-next-line
        const regex =
            /^(\*|(1?[0-9]|2[0-3])(-(1?[0-9]|2[0-3]))?)(\/[1-9][0-9]*)?(,(\*|(1?[0-9]|2[0-3])(-(1?[0-9]|2[0-3]))?)(\/[1-9][0-9]*)?)*$/;
        if (value && !regex.test(value)) {
            return Promise.reject(t('messages:not-allowed-value'));
        }
        return Promise.resolve();
    };
    const CheckDayOfMonthRule = (_: any, value: string) => {
        //eslint-disable-next-line
        const regex =
            /^(\*|([1-9]|[1-2][0-9]?|3[0-1])(-([1-9]|[1-2][0-9]?|3[0-1]))?)(\/[1-9][0-9]*)?(,(\*|([1-9]|[1-2][0-9]?|3[0-1])(-([1-9]|[1-2][0-9]?|3[0-1]))?)(\/[1-9][0-9]*)?)*$/;
        if (value && !regex.test(value)) {
            return Promise.reject(t('messages:not-allowed-value'));
        }
        return Promise.resolve();
    };
    const CheckMonthRule = (_: any, value: string) => {
        //eslint-disable-next-line
        const regex =
            /^(\*|([1-9]|1[0-2]?)(-([1-9]|1[0-2]?))?)(\/[1-9][0-9]*)?(,(\*|([1-9]|1[0-2]?)(-([1-9]|1[0-2]?))?)(\/[1-9][0-9]*)?)*$/;
        if (value && !regex.test(value)) {
            return Promise.reject(t('messages:not-allowed-value'));
        }
        return Promise.resolve();
    };
    const CheckDayOfWeekRule = (_: any, value: string) => {
        //eslint-disable-next-line
        const regex =
            /^(\*|[0-6](-[0-6])?)(\/[1-9][0-9]*)?(,(\*|[0-6](-[0-6])?)(\/[1-9][0-9]*)?)*$/;
        if (value && !regex.test(value)) {
            return Promise.reject(t('messages:not-allowed-value'));
        }
        return Promise.resolve();
    };
    const CheckCrontabRule = (_: any, value: string) => {
        //eslint-disable-next-line
        const regex =
            /^((\*(?!(-))|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])(?!(-)))(?!(-\d-)))(([-]{1}(\*(?!(-))|[0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9]))|([,]{1}(\*(?!(-))|[0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9]|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])(?!(-))))(?!(-\d-)))* ((\*(?!(-))|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])(?!(-)))(?!(-\d-)))(([-]{1}(\*(?!(-))|[0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9]))|([,]{1}(\*(?!(-))|[0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9]|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])(?!(-))))(?!(-\d-)))* ((\*(?!(-))|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])(?!(-)))(?!(-\d-)))(([-]{1}(\*(?!(-))|[0-9]|1[0-9]|2[0-3]))|([,]{1}(\*(?!(-))|[0-9]|1[0-9]|2[0-3]|\*\/([0-9]|1[0-9]|2[0-3])(?!(-))))(?!(-\d-)))* ((\*(?!(-))|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])(?!(-)))(?!(-\d-)))(([-]{1}(\*(?!(-))|[1-9]|1[0-9]|2[0-9]|3[0-1]))|([,]{1}(\*(?!(-))|[1-9]|1[0-9]|2[0-9]|3[0-1]|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])(?!(-))))(?!(-\d-)))* ((\*(?!(-))|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])(?!(-)))(?!(-\d-)))(([-]{1}(\*(?!(-))|[1-9]|1[0-2]))|([,]{1}(\*(?!(-))|[1-9]|1[0-2]|\*\/([1-9]|1[0-2])(?!(-))))(?!(-\d-)))* ((\*(?!(-))|([0-6])|\*\/([0-6])(?!(-)))(?!(-\d-)))(([-]{1}(\*(?!(-))|[0-6]))|([,]{1}(\*(?!(-))|[0-6]|\*\/([0-6])(?!(-))))(?!(-\d-)))*$/;

        if (value && !regex.test(value)) {
            return false;
        }
        return true;
    };

    return (
        <Modal
            title={t('actions:edit-crontab')}
            open={showModal.open}
            onOk={onClickOk}
            onCancel={handleCancel}
            width={850}
            bodyStyle={{ marginBottom: 65 }}
            confirmLoading={updateLoading}
        >
            <WrapperForm>
                <Form form={form} layout="vertical" scrollToFirstError>
                    <Row gutter={[8, 8]}>
                        <Col span={8}>
                            <Card title={t('d:minute')} style={{ height: 145 }}>
                                <Text disabled italic style={{ fontSize: '12px' }}>
                                    {'0-59 ' + t(`d:allowed-values`)}
                                </Text>
                                <Form.Item
                                    name="minute"
                                    rules={[
                                        { required: true, message: errorMessageEmptyInput },
                                        { validator: CheckMinuteRule }
                                    ]}
                                    initialValue={'*'}
                                >
                                    <Input />
                                </Form.Item>
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card title={t('d:hour')} style={{ height: 145 }}>
                                <Text disabled italic style={{ fontSize: '12px' }}>
                                    {'0-23 ' + t(`d:allowed-values`)}
                                </Text>
                                <Form.Item
                                    name="hour"
                                    rules={[
                                        { required: true, message: errorMessageEmptyInput },
                                        { validator: CheckHourRule }
                                    ]}
                                    initialValue={'*'}
                                >
                                    <Input />
                                </Form.Item>
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card title={t('d:dayofmonth')} style={{ height: 145 }}>
                                <Text disabled italic style={{ fontSize: '12px' }}>
                                    {'1-31 ' + t(`d:allowed-values`)}
                                </Text>
                                <Form.Item
                                    name="dayofmonth"
                                    rules={[
                                        { required: true, message: errorMessageEmptyInput },
                                        { validator: CheckDayOfMonthRule }
                                    ]}
                                    initialValue={'*'}
                                >
                                    <Input />
                                </Form.Item>
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card title={t('d:month')} style={{ height: 145 }}>
                                <Text disabled italic style={{ fontSize: '12px' }}>
                                    {'1-12 ' + t(`d:allowed-values`)}
                                </Text>
                                <Form.Item
                                    name="month"
                                    rules={[
                                        { required: true, message: errorMessageEmptyInput },
                                        { validator: CheckMonthRule }
                                    ]}
                                    initialValue={'*'}
                                >
                                    <Input />
                                </Form.Item>
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card title={t('d:dayofweek')} style={{ height: 145 }}>
                                <Text disabled italic style={{ fontSize: '12px' }}>
                                    {'0-6  ' + t(`d:allowed-values`)}
                                </Text>
                                <Form.Item
                                    name="dayofweek"
                                    rules={[
                                        { required: true, message: errorMessageEmptyInput },
                                        { validator: CheckDayOfWeekRule }
                                    ]}
                                    initialValue={'*'}
                                >
                                    <Input />
                                </Form.Item>
                            </Card>
                        </Col>
                        <Col span={8} style={{ marginBottom: 50 }}>
                            <Card style={{ height: 145 }}>
                                <Space direction="vertical">
                                    <Text code style={{ fontSize: '10px' }}>
                                        {t(`d:any-value`)}
                                    </Text>
                                    <Text code style={{ fontSize: '10px' }}>
                                        {t(`d:value-list-separator`)}
                                    </Text>
                                    <Text code style={{ fontSize: '10px' }}>
                                        {t(`d:range-of-values`)}
                                    </Text>
                                    <Text code style={{ fontSize: '10px' }}>
                                        {t(`d:step-values`)}
                                    </Text>
                                </Space>
                            </Card>
                        </Col>
                    </Row>
                </Form>
            </WrapperForm>
        </Modal>
    );
};

export { CrontabModalV2 };
