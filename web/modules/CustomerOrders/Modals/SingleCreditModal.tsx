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
import {
    findCodeByScopeAndValue,
    showError,
    showSuccess,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { Button, Modal, Typography } from 'antd';
import { useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { useMemo, useState } from 'react';

const { Text } = Typography;

export interface ISingleCreditModalProps {
    orderId: string;
    showModal: any;
    triggerRefresh?: boolean;
    setTriggerRefresh?: any;
}

const SingleCreditModal = ({ showModal, orderId, setTriggerRefresh }: ISingleCreditModalProps) => {
    const { t } = useTranslation();
    const { configs } = useAppState();
    const { graphqlRequestClient } = useAuth();
    const [isCreditLoading, setIsCreditLoading] = useState<boolean>(false);

    const configsParamsCodes = useMemo(() => {
        const order_status_credit_to_be_issued = parseInt(
            findCodeByScopeAndValue(configs, 'order_status', `Credit to be issued`)
        );

        return {
            order_status_credit_to_be_issued
        };
    }, [configs]);

    const handleCancel = () => {
        setIsCreditLoading(false);
        showModal.setShowCreditModal(false);
    };

    const onClickOk = async () => {
        setIsCreditLoading(true);

        const updateMutation = gql`
            mutation updateOrder($id: String!, $input: UpdateOrderInput!) {
                updateOrder(id: $id, input: $input) {
                    id
                    name
                    status
                }
            }
        `;

        const updateVariables = {
            id: orderId,
            input: {
                status: configsParamsCodes.order_status_credit_to_be_issued
            }
        };

        try {
            const result = await graphqlRequestClient.request(updateMutation, updateVariables);
            if (result) {
                showSuccess(t('messages:success-updated'));
                if (setTriggerRefresh) {
                    setTriggerRefresh();
                }
            }
        } catch (error) {
            showError(t('messages:error-update-data'));
            console.log('generateCreditError', error);
        } finally {
            setIsCreditLoading(false);
            showModal.setShowCreditModal(false);
        }
    };

    return (
        <Modal
            title={t('actions:generate-credit')}
            open={showModal.showCreditModal}
            onCancel={handleCancel}
            width={450}
            footer={[
                <Button key="back" onClick={handleCancel}>
                    {t('common:no')}
                </Button>,
                <Button key="submit" type="primary" loading={isCreditLoading} onClick={onClickOk}>
                    {t('common:yes')}
                </Button>
            ]}
        >
            <Text>{t('messages:action-confirm')}</Text>
        </Modal>
    );
};

export { SingleCreditModal };
