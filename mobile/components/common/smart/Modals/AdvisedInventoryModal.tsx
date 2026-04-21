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

import { useTranslationWithFallback as useTranslation } from '@helpers';
import { showError } from '@helpers';
import { useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { Modal } from 'antd';

export interface IAdvisedInventoryModalProps {
    visible: boolean;
    locationId?: string;
    yesClick: () => void;
    noClick: () => void;
}

export const AdvisedInventoryModal = ({
    visible,
    locationId,
    yesClick,
    noClick
}: IAdvisedInventoryModalProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const [isConfirmLoading, setIsConfirmLoading] = useState<boolean>(false);

    const handleYes = async () => {
        setIsConfirmLoading(false);
        yesClick();
    };

    const handleCreateInventory = async () => {
        if (!locationId) {
            showError(t('messages:no-location-for-inventory'));
            noClick();
            return;
        }

        setIsConfirmLoading(true);
        try {
            const queryGetLocationById = gql`
                query locationById($id: String!) {
                    location(id: $id) {
                        id
                        name
                        blockId
                        aisle
                        column
                        level
                        position
                    }
                }
            `;

            const queryCC = gql`
                mutation executeFunction($functionName: String!, $event: JSON!) {
                    executeFunction(functionName: $functionName, event: $event) {
                        status
                        output
                    }
                }
            `;
            const resultLocation = await graphqlRequestClient.request(queryGetLocationById, {
                id: locationId
            });
            const variablesCC = {
                functionName: 'create_cycle_count_type_location',
                event: {
                    input: {
                        type: 10201,
                        model: 10301,
                        reason: 10356,
                        blockId: resultLocation?.location?.blockId,
                        originalAisle: resultLocation?.location?.aisle || '*',
                        originalColumn: resultLocation?.location?.column || '*',
                        originalLevel: resultLocation?.location?.level || '*',
                        originalPosition: resultLocation?.location?.position || '*',
                        finalAisle: resultLocation?.location?.aisle || '*',
                        finalColumn: resultLocation?.location?.column || '*',
                        finalLevel: resultLocation?.location?.level || '*',
                        finalPosition: resultLocation?.location?.position || '*',
                        emptyLocation: false
                    }
                }
            };
            const result = await graphqlRequestClient.request(queryCC, variablesCC);
            console.log(result);
        } catch (error) {
            showError(t('messages:error-creating-advised-inventory'));
        } finally {
            setIsConfirmLoading(false);
            noClick();
        }
    };

    return (
        <Modal
            title={t('common:is-location-empty')}
            open={visible}
            onOk={handleYes}
            onCancel={handleCreateInventory}
            maskClosable={false}
            closeIcon={false}
            confirmLoading={isConfirmLoading}
            okText={t('common:bool-yes')}
            cancelText={t('common:bool-no')}
        ></Modal>
    );
};
