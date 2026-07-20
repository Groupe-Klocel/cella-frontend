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
    findCodeByScopeAndValue,
    getLoadTypeCodesForDirection,
    showError,
    showSuccess,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import type { LoadDirection } from '@helpers';
import DatedEntitySelect from './DatedEntitySelect';

export interface IAssignLoadModalProps {
    open: boolean;
    onClose: () => void;
    // entities that will receive the preAssignedLoadId
    entityIds: string[];
    // outbound entities accept Pre-/Post-loading loads, inbound ones accept Inbound loads
    direction: LoadDirection;
    // narrow the candidate loads to the entity carrier when the entity has one (PO has none)
    carrierId?: string | null;
    // bulk update mutation for the entity type
    update: { mutation: string; inputType: string };
    onDone?: () => void;
}

const AssignLoadModal: FC<IAssignLoadModalProps> = ({
    open,
    onClose,
    entityIds,
    direction,
    carrierId,
    update,
    onDone
}) => {
    const { t } = useTranslation();
    const { configs } = useAppState();
    const { graphqlRequestClient } = useAuth();
    const [selectedLoad, setSelectedLoad] = useState<string | undefined>();
    const [isLoading, setIsLoading] = useState(false);

    // candidate loads: below "loaded" (status < Dispatched), matching the direction's load types,
    // and — when the entity carries a carrier — the same carrier.
    const loadAdvancedFilters = useMemo(() => {
        const dispatched = parseInt(
            findCodeByScopeAndValue(configs, 'load_status', 'Dispatched') ?? '0',
            10
        );
        const typeCodes = getLoadTypeCodesForDirection(direction, configs);
        const filters: any[] = [
            { filter: [{ searchType: 'INFERIOR', field: { status: dispatched } }] }
        ];
        // fail-closed: if the direction's load types can't be resolved (missing/mis-labeled
        // load_type configs), filter on an impossible code so NO load is proposed rather than
        // listing every load and allowing a wrong-direction pre-assignment.
        filters.push({
            filter: [
                { searchType: 'EQUAL', field: { type: typeCodes.length > 0 ? typeCodes : [-1] } }
            ]
        });
        if (carrierId) {
            filters.push({ filter: [{ searchType: 'EQUAL', field: { carrierId } }] });
        }
        return filters;
    }, [configs, direction, carrierId]);

    const handleConfirm = async () => {
        if (!selectedLoad) {
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
                mutation ${update.mutation}($ids: [String!]!, $input: ${update.inputType}!) {
                    ${update.mutation}(ids: $ids, input: $input)
                }
            `;
            await graphqlRequestClient.request(mutation, {
                ids: entityIds,
                input: { preAssignedLoadId: selectedLoad.toString() }
            });
            showSuccess(t('messages:success-assigned'));
            setSelectedLoad(undefined);
            onDone?.();
            onClose();
        } catch (error) {
            console.error('Error assigning load:', error);
            showError(t('messages:error-assigning-data'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setSelectedLoad(undefined);
        onClose();
    };

    return (
        <Modal
            title={t('actions:assign')}
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
                key={`assign-load-${direction}-${carrierId ?? 'any'}`}
                table="Load"
                dateField="loadExpectedShippingDate"
                advancedFilters={loadAdvancedFilters}
                value={selectedLoad}
                onChange={setSelectedLoad}
                placeholder={t('messages:please-select-a', { name: t('common:loads') })}
            />
        </Modal>
    );
};

AssignLoadModal.displayName = 'AssignLoadModal';

export default AssignLoadModal;
