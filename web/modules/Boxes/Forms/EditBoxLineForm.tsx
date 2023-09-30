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
import { FC, useEffect } from 'react';
import { Button, Form, Space } from 'antd';
import { StyledForm } from '@components';
import useTranslation from 'next-translate/useTranslation';

import { useRouter } from 'next/router';

import { showError, showSuccess, showInfo, useUpdate } from '@helpers';
import { FormGroup } from 'modules/Crud/submodules/FormGroup';
import { FilterFieldType, ModelType } from 'models/Models';

export interface IEditBoxLineFormProps {
    id: string;
    details: any;
    dataModel: ModelType;
    routeAfterSuccess: string;
    editSteps: Array<Array<FilterFieldType>>;
}

export const EditBoxLineForm: FC<IEditBoxLineFormProps> = (props: IEditBoxLineFormProps) => {
    const { t } = useTranslation();
    const router = useRouter();

    const [form] = Form.useForm();

    const {
        isLoading: updateLoading,
        result: updateResult,
        mutate
    } = useUpdate(
        props.dataModel.resolverName,
        props.dataModel.endpoints.update,
        props.dataModel.detailFields
    );

    useEffect(() => {
        if (!(updateResult && updateResult.data)) return;

        if (updateResult.success) {
            router.push(
                props.routeAfterSuccess.replace(
                    ':id',
                    updateResult.data[props.dataModel.endpoints.update]?.id
                )
            );
            showSuccess(t('messages:success-updated'));
        } else {
            showError(t('messages:error-update-data'));
        }
    }, [updateResult]);

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                const formData = form.getFieldsValue(true);
                mutate({
                    id: props.id,
                    input: { comment: formData.handlingUnitContentOutbound_comment }
                });
            })
            .catch((err) => showError(t('messages:error-update-data')));
    };

    useEffect(() => {
        const tmp_details = { ...props.details };
        form.setFieldsValue(tmp_details);
        if (updateLoading) {
            showInfo(t('messages:info-update-wip'));
        }
    }, [props, updateLoading]);

    return (
        <StyledForm>
            <Form form={form} scrollToFirstError>
                {props.editSteps.map((item) => (
                    <FormGroup inputs={item} key={props.id} />
                ))}
                <div style={{ textAlign: 'right' }}>
                    <Space>
                        <Button loading={updateLoading} onClick={onFinish} type="primary">
                            {t('actions:update')}
                        </Button>
                        <Button onClick={() => router.back()}>{t('actions:cancel')}</Button>
                    </Space>
                </div>
            </Form>
        </StyledForm>
    );
};
