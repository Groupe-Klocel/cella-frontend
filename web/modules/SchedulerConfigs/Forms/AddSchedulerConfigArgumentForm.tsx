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
import {
    InputMaybe,
    Scalars,
    SimpleGetAllStockOwnersQuery,
    useSimpleGetAllStockOwnersQuery
} from 'generated/graphql';
import { showError, showSuccess, showInfo, useUpdate } from '@helpers';
import { SchedulerConfigModelV2 as model } from 'models/SchedulerConfigModelV2';
export interface ISingleItemProps {
    detailFields: string | any;
}

export const AddSchedulerConfigArgumentForm: FC<ISingleItemProps> = ({
    detailFields
}: ISingleItemProps) => {
    const { t } = useTranslation('common');
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const id = router.query.id;
    const schedulerConfigName = router.query.schedulerConfigName;
    const schedulerConfigArgument: any = router.query.schedulerConfigArgument;
    const keyLbl = t('d:key');
    const valueLbl = t('d:value');
    const submitBtn = t('actions:submit');
    // END TEXTS TRANSLATION

    // TYPED SAFE ALL
    const [form] = Form.useForm();
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const [inputArgument, setinputArgument] = useState<any>();

    useEffect(() => {
        const jsonData: any = {};
        schedulerConfigArgument.split(',').forEach((element: any) => {
            if (element !== '') {
                const [key, value] = element.split('=');
                jsonData[key] = value;
            }
        });
        if (jsonData) setinputArgument(jsonData);
    }, [schedulerConfigArgument]);

    //UPDATE schedulerConfig argument
    const {
        isLoading: updateLoading,
        result: updateResult,
        mutate: updateSchedulerConfigArgument
    } = useUpdate(model.resolverName, model.endpoints.update, detailFields);

    useEffect(() => {
        if (!(updateResult && updateResult.data)) return;

        if (updateResult.success) {
            router.push(`/scheduler-configs/${id}`);
            showSuccess(t('messages:success-updated'));
        } else {
            showError(t('messages:error-update-data'));
        }
    }, [updateResult]);

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                const formData = form.getFieldsValue(true);
                const input_tmp: InputMaybe<Scalars['JSON']> = {};
                const new_element: any = {};
                new_element[formData.key] = formData.value;
                if (Object.entries(inputArgument).length !== 0) {
                    input_tmp['argument'] = Object.assign(new_element, inputArgument);
                } else {
                    input_tmp['argument'] = new_element;
                }
                updateSchedulerConfigArgument({
                    id: id,
                    input: { ...input_tmp }
                });
            })
            .catch((err) => {
                showError(t('messages:error-creating-data'));
            });
    };

    useEffect(() => {
        const tmp_details = {
            //id: id
        };

        form.setFieldsValue(tmp_details);
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
