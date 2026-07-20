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

import { Modal, Button } from 'antd';
import { gql } from 'graphql-request';
import { FC, useMemo, useState } from 'react';
import { useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import {
    getAppointmentTypeCodesForDirection,
    getInboundAppointmentTypeCodes,
    getOutboundAppointmentTypeCodes,
    showError,
    showSuccess,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import type { LoadDirection } from '@helpers';
import DatedEntitySelect from 'modules/Preload/DatedEntitySelect';

export interface IAssignToAppointmentModalProps {
    open: boolean;
    onClose: () => void;
    // entities that will get an appointmentLine pointing back to the chosen appointment
    entityIds: string[];
    // which foreign key on the appointmentLine identifies this entity type
    fkField: 'loadId' | 'deliveryId' | 'orderId' | 'purchaseOrderId';
    // only appointments of the matching direction are proposed; when omitted (e.g. a bulk of
    // mixed-type loads) all non-visit appointments are proposed
    direction?: LoadDirection;
    // narrow to the entity carrier when it has one
    carrierId?: string | null;
    onDone?: () => void;
}

const AssignToAppointmentModal: FC<IAssignToAppointmentModalProps> = ({
    open,
    onClose,
    entityIds,
    fkField,
    direction,
    carrierId,
    onDone
}) => {
    const { t } = useTranslation();
    const { configs } = useAppState();
    const { graphqlRequestClient } = useAuth();
    const [selectedAppointment, setSelectedAppointment] = useState<string | undefined>();
    const [isLoading, setIsLoading] = useState(false);

    const appointmentAdvancedFilters = useMemo(() => {
        const typeCodes = direction
            ? getAppointmentTypeCodesForDirection(direction, configs)
            : [
                  ...getOutboundAppointmentTypeCodes(configs),
                  ...getInboundAppointmentTypeCodes(configs)
              ];
        const filters: any[] = [];
        // fail-closed: if the direction's appointment types can't be resolved, filter on an
        // impossible code so NO appointment is proposed rather than every type/direction.
        filters.push({
            filter: [
                {
                    searchType: 'EQUAL',
                    field: { appointmentType: typeCodes.length > 0 ? typeCodes : [-1] }
                }
            ]
        });
        if (carrierId) {
            filters.push({ filter: [{ searchType: 'EQUAL', field: { carrierId } }] });
        }
        return filters;
    }, [configs, direction, carrierId]);

    const handleConfirm = async () => {
        if (!selectedAppointment) {
            showError(t('messages:please-select-one-element'));
            return;
        }
        if (!entityIds || entityIds.length === 0) {
            showError(t('messages:please-select-at-least-one-element'));
            return;
        }
        setIsLoading(true);
        try {
            const mutation = gql`
                mutation cLine($input: CreateAppointmentLineInput!) {
                    createAppointmentLine(input: $input) {
                        id
                    }
                }
            `;
            // Only appointmentId is required on CreateAppointmentLineInput (schema-confirmed);
            // stockOwnerId is optional. This bulk flow links entities that may span several stock
            // owners, so we don't force a single one — the line is tied to its entity via [fkField].
            for (const entityId of entityIds) {
                await graphqlRequestClient.request(mutation, {
                    input: { appointmentId: selectedAppointment.toString(), [fkField]: entityId }
                });
            }
            showSuccess(t('messages:success-assigned'));
            setSelectedAppointment(undefined);
            onDone?.();
            onClose();
        } catch (error) {
            console.error('Error assigning to appointment:', error);
            showError(t('messages:error-assigning-data'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setSelectedAppointment(undefined);
        onClose();
    };

    return (
        <Modal
            title={t('actions:assign-to-appointment')}
            open={open}
            onCancel={handleCancel}
            footer={[
                <Button key="cancel" onClick={handleCancel}>
                    {t('actions:cancel')}
                </Button>,
                <Button key="confirm" type="primary" loading={isLoading} onClick={handleConfirm}>
                    {t('actions:confirm')}
                </Button>
            ]}
            destroyOnClose
        >
            <div style={{ marginBottom: 12 }}>
                {t('messages:selected-items-number', { number: entityIds.length })}
            </div>
            <DatedEntitySelect
                key={`assign-appointment-${direction ?? 'any'}-${carrierId ?? 'any'}`}
                table="Appointment"
                dateField="appointmentDateBegin"
                advancedFilters={appointmentAdvancedFilters}
                value={selectedAppointment}
                onChange={setSelectedAppointment}
                placeholder={t('messages:please-select-a', { name: t('d:appointment') })}
            />
        </Modal>
    );
};

AssignToAppointmentModal.displayName = 'AssignToAppointmentModal';

export default AssignToAppointmentModal;
