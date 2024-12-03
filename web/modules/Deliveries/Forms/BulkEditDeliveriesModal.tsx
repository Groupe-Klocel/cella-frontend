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
import { Form, Modal } from 'antd';
import { useState } from 'react';
import {
    BulkUpdateDeliveriesMutation,
    BulkUpdateDeliveriesMutationVariables,
    useBulkUpdateDeliveriesMutation
} from 'generated/graphql';
import { showError, showSuccess } from '@helpers';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import { CalendarForm } from 'components/common/dumb/Calendar/CalendarForm';
import dayjs from 'dayjs';

export interface IBulkEditDeliveriesRenderModalProps {
    visible: boolean;
    rows: any;
    showhideModal: () => void;
}

const BulkEditDeliveriesRenderModal = ({
    visible,
    showhideModal,
    rows
}: IBulkEditDeliveriesRenderModalProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const [form] = Form.useForm();
    const [isModalVisible, setIsModalVisible] = useState(visible);
    const errorMessageUpdateData = t('messages:error-update-data');
    const successMessageUpdateData = t('messages:success-updated');

    // UPDATE Delivery Line
    const {
        mutate,
        isPending: updateLoading,
        data
    } = useBulkUpdateDeliveriesMutation<Error>(graphqlRequestClient, {
        onSuccess: (
            data: BulkUpdateDeliveriesMutation,
            _variables: BulkUpdateDeliveriesMutationVariables,
            _context: any
        ) => {
            showSuccess(successMessageUpdateData);
            router.reload();
        },
        onError: (err) => {
            showError(errorMessageUpdateData);
        }
    });

    const bulkUpdateDeliveries = ({
        inputs,
        deliveriesId
    }: BulkUpdateDeliveriesMutationVariables) => {
        mutate({ inputs, deliveriesId });
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        showhideModal();
    };

    const onClickOk = () => {
        form.validateFields()
            .then(() => {
                const formData = form.getFieldsValue(true);
                bulkUpdateDeliveries({ inputs: formData, deliveriesId: rows.selectedRowKeys });
            })
            .catch((err) => {
                showError(errorMessageUpdateData);
            });
        showhideModal();
    };

    return (
        <Modal
            title={t('actions:edit-deliveries')}
            open={visible}
            onOk={onClickOk}
            onCancel={handleCancel}
        >
            <WrapperForm>
                <Form form={form} layout="vertical" scrollToFirstError>
                    <CalendarForm
                        label={t('d:anticipatedDeliveryDate')}
                        name="anticipatedDeliveryDate"
                        format="YYYY-MM-DD HH:mm:ss"
                        showTime={{ defaultValue: dayjs('00:00:00', 'HH:mm:ss') }}
                        defaultValue={dayjs()}
                    />
                </Form>
            </WrapperForm>
        </Modal>
    );
};

export { BulkEditDeliveriesRenderModal };
