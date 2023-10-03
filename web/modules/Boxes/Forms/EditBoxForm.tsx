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

export interface IEditBoxFormProps {
    id: string;
    details: any;
    dataModel: ModelType;
    routeAfterSuccess: string;
    editSteps: Array<Array<FilterFieldType>>;
}

export const EditBoxForm: FC<IEditBoxFormProps> = (props: IEditBoxFormProps) => {
    const { t } = useTranslation();
    const router = useRouter();

    const [form] = Form.useForm();

    useEffect(() => {
        form.setFieldsValue({ ...props.details });
    }, []);

    const updateBox = async () => {
        const formData = form.getFieldsValue(true);
        //split formData according to inputs:
        const inputHU = {
            stockOwnerId: formData.stockOwnerId,
            name: formData.name,
            warehouseCode: formData.warehouseCode
        };
        const inputHUOutbound = {
            name: formData.name,
            deliveryId: formData.deliveryId,
            handlingUnitModelId: formData.handlingUnitModelId,
            carrierId: formData.carrierId,
            carrierService: formData.carrierService,
            theoriticalWeight: formData.theoreticalWeight,
            intermediateWeight1: formData.intermediateWeight1,
            intermediateWeight2: formData.intermediateWeight2,
            finalWeight: formData.finalWeight,
            carrierBox: formData.carrierBox,
            comment: formData.comment
        };
        const res = await fetch(`/api/boxes/update/${props.id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                hu_id: formData.handlingUnitId,
                hu_body: inputHU,
                hu_outbound_id: props.id,
                hu_outbound_body: inputHUOutbound
            })
        });
        if (!res.ok) {
            const message = t('An error has occured: ') + res.status;
            showError(t('messages:error-update-data'));
        }
        const response = await res.json();

        showSuccess(t('messages:success-updated'));
        router.push(props.routeAfterSuccess.replace(':id', props.id));
    };

    return (
        <StyledForm>
            <Form form={form} scrollToFirstError>
                {props.editSteps.map((item) => (
                    <FormGroup inputs={item} key={props.id} />
                ))}
                <div style={{ textAlign: 'right' }}>
                    <Space>
                        <Button onClick={() => updateBox()} type="primary">
                            {t('actions:update')}
                        </Button>
                        <Button onClick={() => router.back()}>{t('actions:cancel')}</Button>
                    </Space>
                </div>
            </Form>
        </StyledForm>
    );
};
