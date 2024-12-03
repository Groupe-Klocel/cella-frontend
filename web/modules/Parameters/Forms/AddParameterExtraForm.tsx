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
import { Button, Input, Form, Select, Modal, Space } from 'antd';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState, FC } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import { showError, showSuccess, showInfo, useUpdate } from '@helpers';
import { ParameterModelV2 } from 'models/ParameterModelV2';
import { ConfigModelV2 } from 'models/ConfigModelV2';

export interface ISingleItemProps {
    urlBack: string | any;
}

export const AddParameterExtraForm: FC<ISingleItemProps> = ({ urlBack }: ISingleItemProps) => {
    const { t } = useTranslation('common');
    const router = useRouter();
    const id = router.query.id;
    const model = router.query.url === 'configurations' ? ConfigModelV2 : ParameterModelV2;
    const detailsFields = Object.keys(model.fieldsInfo).filter(
        (key) => model.fieldsInfo[key].isDetailRequested
    );

    const keyLbl = t('d:key');
    const valueLbl = t('d:value');
    const submitBtn = t('actions:submit');
    // END TEXTS TRANSLATION

    // TYPED SAFE ALL
    const [form] = Form.useForm();
    const [unsavedChanges, setUnsavedChanges] = useState(false);

    //UPDATE parameter Extra
    const {
        isLoading: updateLoading,
        result: updateResult,
        mutate: updateParameterExtra
    } = useUpdate(model.resolverName, model.endpoints.update, detailsFields);

    useEffect(() => {
        if (!(updateResult && updateResult.data)) return;

        if (updateResult.success) {
            router.push(`${urlBack}/${id}`);
            showSuccess(t('messages:success-updated'));
        } else {
            showError(t('messages:error-update-data'));
        }
    }, [updateResult]);

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                const formData = form.getFieldsValue(true);
                const new_element: any = {};
                new_element[formData.key] = formData.value;
                updateParameterExtra({
                    id: id,
                    input: { extras: new_element }
                });
            })
            .catch((err) => {
                showError(t('messages:error-creating-data'));
            });
    };

    useEffect(() => {
        if (updateLoading) {
            showInfo(t('messages:info-create-wip'));
        }
    }, [updateLoading]);

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
                <Form.Item label={keyLbl} name="key">
                    <Input />
                </Form.Item>
                <Form.Item label={valueLbl} name="value">
                    <Input />
                </Form.Item>
            </Form>
            <div style={{ textAlign: 'center' }}>
                <Space>
                    <Button type="primary" loading={updateLoading} onClick={onFinish}>
                        {submitBtn}
                    </Button>
                    <Button onClick={onCancel}>{t('actions:cancel')}</Button>
                </Space>
            </div>
        </WrapperForm>
    );
};
