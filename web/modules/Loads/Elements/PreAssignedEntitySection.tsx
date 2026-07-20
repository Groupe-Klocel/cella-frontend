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

import { LinkButton } from '@components';
import { EyeTwoTone, LinkOutlined } from '@ant-design/icons';
import {
    pathParams,
    showError,
    showSuccess,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { Button, Modal, Space } from 'antd';
import { gql } from 'graphql-request';
import { ListComponent } from 'modules/Crud/ListComponentV2';
import { FC, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import type { ModelType } from 'models/ModelsV2';

export interface IPreAssignedEntitySectionProps {
    // entity list pre-assigned to this load (delivery / order / purchaseOrder)
    dataModel: ModelType;
    loadId: string;
    loadName?: string;
    canModify: boolean;
    // header title (i18n key) and assign-button label (i18n key)
    title: string;
    assignTitle: string;
    // dedicated allocation page ("?loadId=" is appended)
    assignPath: string;
    // row detail route, e.g. '/deliveries/[id]'
    detailRoute: string;
    // singular update mutation used to detach one record
    removeMutation: { mutation: string; inputType: string };
}

const PreAssignedEntitySection: FC<IPreAssignedEntitySectionProps> = ({
    dataModel,
    loadId,
    loadName,
    canModify,
    title,
    assignTitle,
    assignPath,
    detailRoute,
    removeMutation
}) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const [refetchTrigger, setRefetchTrigger] = useState(false);

    const removeAssignment = (recordId: string, recordName: string) => {
        Modal.confirm({
            // generic message: this section is reused for deliveries / orders / purchase orders
            title: t('messages:remove-assignment-confirm'),
            content: `${recordName} — ${loadName || loadId}`,
            onOk: async () => {
                try {
                    const mutation = gql`
                        mutation ${removeMutation.mutation}($id: String!, $input: ${removeMutation.inputType}!) {
                            ${removeMutation.mutation}(id: $id, input: $input) {
                                id
                                preAssignedLoadId
                            }
                        }
                    `;
                    await graphqlRequestClient.request(mutation, {
                        id: recordId,
                        input: { preAssignedLoadId: null }
                    });
                    showSuccess(t('messages:success-removed-assignment'));
                    setRefetchTrigger((prev) => !prev);
                } catch (error) {
                    console.error('Error removing load assignment:', error);
                    showError(t('messages:error-removing-assignment'));
                }
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    return (
        <ListComponent
            searchCriteria={{ preAssignedLoadId: loadId }}
            dataModel={dataModel}
            headerData={{
                title,
                routes: [],
                actionsComponent: canModify ? (
                    <LinkButton
                        type="primary"
                        path={`${assignPath}?loadId=${loadId}`}
                        title={assignTitle}
                    />
                ) : null
            }}
            actionColumns={[
                {
                    title: 'actions:actions',
                    key: 'actions',
                    render: (record: { id: string; name: string }) => (
                        <Space>
                            <LinkButton
                                icon={<EyeTwoTone />}
                                path={pathParams(detailRoute, record.id)}
                            />
                            {canModify && (
                                <Button
                                    icon={<LinkOutlined />}
                                    danger
                                    onClick={() => removeAssignment(record.id, record.name)}
                                    title={t('actions:remove-from-load')}
                                />
                            )}
                        </Space>
                    )
                }
            ]}
            searchable={false}
            triggerDelete={undefined}
            triggerSoftDelete={undefined}
            refetch={refetchTrigger}
        />
    );
};

PreAssignedEntitySection.displayName = 'PreAssignedEntitySection';

export { PreAssignedEntitySection };
