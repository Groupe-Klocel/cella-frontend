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
import useTranslation from 'next-translate/useTranslation';
import { Modal } from 'antd';
import { useState } from 'react';
import { showError, showSuccess } from '@helpers';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';

export interface IMagentoImportModalProps {
    showModal: any;
    triggerRefresh?: any;
    setTriggerRefresh: () => void;
}

const MagentoImportModal = ({
    showModal,
    triggerRefresh,
    setTriggerRefresh
}: IMagentoImportModalProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();

    const [isRequestLoading, setIsRequestLoading] = useState(false);

    async function sendMagentoImportRequest() {
        const query = gql`
            mutation executeFunction($functionName: String!, $event: JSON!) {
                executeFunction(functionName: $functionName, event: $event) {
                    status
                    output
                }
            }
        `;

        const variables = {
            functionName: 'CGP_magento_get_orders',
            event: {}
        };

        try {
            const MagentoImportResult = await graphqlRequestClient.request(query, variables);

            if (MagentoImportResult.executeFunction.status === 'ERROR') {
                showError(MagentoImportResult.executeFunction.output);
                setIsRequestLoading(false);
            } else if (
                MagentoImportResult.executeFunction.status === 'OK' &&
                MagentoImportResult.executeFunction.output.status === 'KO'
            ) {
                showError(t(`errors:${MagentoImportResult.executeFunction.output.output.code}`));
                console.log('Backend_message', MagentoImportResult.executeFunction.output.output);
            } else {
                console.log('MagentoImportResult', MagentoImportResult);
                showSuccess(t('messages:success-sending-magento-request'));
                setTriggerRefresh();
                setIsRequestLoading(false);
                showModal.setShowMagentoModal(false);
            }
        } catch (error) {
            showError(t('messages:error-executing-function'));
            setIsRequestLoading(false);
        }
    }

    const handleCancel = () => {
        showModal.setShowMagentoModal(false);
    };

    const onClickOk = () => {
        setIsRequestLoading(true);
        sendMagentoImportRequest();
    };

    return (
        <Modal
            title={t('messages:mangento-get-orders-confirm')}
            visible={showModal.showMagentoModal}
            onOk={onClickOk}
            onCancel={handleCancel}
            width={450}
            confirmLoading={isRequestLoading}
        ></Modal>
    );
};

export { MagentoImportModal };
