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
import { WrapperForm, ContentSpin } from '@components';
import { findCodeByScopeAndValue, showError } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect } from 'react';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';
import { useAppDispatch, useAppState } from 'context/AppContext';

export interface IBoxChecksProps {
    dataToCheck: any;
}

export const BoxChecks = ({ dataToCheck }: IBoxChecksProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();

    const {
        processName,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        handlingUnitOutboundInfos,
        setResetForm
    } = dataToCheck;

    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};

    // Status "Manual packing" is customer-configurable (expected 1410): retrieved from the
    // DB-driven configs; when not configured, the status update is skipped.
    const manualPackingHuoStatus = findCodeByScopeAndValue(
        state.configs,
        'handling_unit_outbound_status',
        'Manual packing'
    );
    const manualPackingHucoStatus = findCodeByScopeAndValue(
        state.configs,
        'handling_unit_content_outbound_status',
        'Manual packing'
    );
    const cancelledHucoStatus = findCodeByScopeAndValue(
        state.configs,
        'handling_unit_content_outbound_status',
        'Cancelled'
    );
    const toBeLoadedHuoStatus = findCodeByScopeAndValue(
        state.configs,
        'handling_unit_outbound_status',
        'To be loaded'
    );

    const updateBoxToManualPacking = async (huo: any) => {
        if (!manualPackingHuoStatus) {
            console.warn('Manual packing status is not configured: HUO/HUCO update skipped');
            return huo;
        }
        const updateHuoMutation = gql`
            mutation updateHandlingUnitOutbound(
                $id: String!
                $input: UpdateHandlingUnitOutboundInput!
            ) {
                updateHandlingUnitOutbound(id: $id, input: $input) {
                    id
                    status
                    statusText
                }
            }
        `;
        await graphqlRequestClient.request(updateHuoMutation, {
            id: huo.id,
            input: { status: parseInt(manualPackingHuoStatus) }
        });

        const updateHucoMutation = gql`
            mutation updateHandlingUnitContentOutbound(
                $id: String!
                $input: UpdateHandlingUnitContentOutboundInput!
            ) {
                updateHandlingUnitContentOutbound(id: $id, input: $input) {
                    id
                    status
                    statusText
                }
            }
        `;
        const hucoStatus = parseInt(manualPackingHucoStatus ?? manualPackingHuoStatus);
        // Cancelled lines are left as they are: they are not repacked, and the box closure
        // (WAITING LABEL) does not touch them either
        const isCancelled = (huco: any) =>
            cancelledHucoStatus !== undefined && huco.status === parseInt(cancelledHucoStatus);
        for (const huco of huo.handlingUnitContentOutbounds ?? []) {
            if (isCancelled(huco)) continue;
            await graphqlRequestClient.request(updateHucoMutation, {
                id: huco.id,
                input: { status: hucoStatus }
            });
        }
        return {
            ...huo,
            status: parseInt(manualPackingHuoStatus),
            handlingUnitContentOutbounds: huo.handlingUnitContentOutbounds?.map((huco: any) =>
                isCancelled(huco) ? huco : { ...huco, status: hucoStatus }
            )
        };
    };

    // TYPED SAFE ALL
    useEffect(() => {
        if (scannedInfo && handlingUnitOutboundInfos) {
            const handleError = (message: string) => {
                showError(message);
                setResetForm(true);
                setScannedInfo(undefined);
            };
            // Box / HU exists?
            if (handlingUnitOutboundInfos.handlingUnitOutbounds?.count === 0) {
                handleError(t('messages:unknown-box'));
                return;
            }
            const handlingUnitOutbound = handlingUnitOutboundInfos.handlingUnitOutbounds.results[0];
            // Box / HU in state "To be loaded" (expected 1400) or "Manual packing" (expected
            // 1410: allows resuming a repacking abandoned after the box was taken over)?
            const allowedEntryStatuses = [toBeLoadedHuoStatus, manualPackingHuoStatus]
                .filter(Boolean)
                .map((status: string) => parseInt(status));
            if (!allowedEntryStatuses.includes(handlingUnitOutbound.status)) {
                handleError(t('messages:box-not-expected-status'));
                return;
            }
            // Update HUO/HUCO status to "Manual packing", then record the original box
            const recordData = async () => {
                try {
                    const updatedHuo = await updateBoxToManualPacking(handlingUnitOutbound);
                    const data: { [label: string]: any } = {};
                    data['originalBox'] = updatedHuo;
                    dispatch({
                        type: 'UPDATE_BY_STEP',
                        processName,
                        stepName: `step${stepNumber}`,
                        object: {
                            ...storedObject[`step${stepNumber}`],
                            data
                        }
                    });
                } catch (error) {
                    console.log('updateBoxToManualPackingError', error);
                    handleError(t('messages:error-updating-data'));
                }
            };
            recordData();
        }
    }, [handlingUnitOutboundInfos]);

    return (
        <WrapperForm>
            {scannedInfo && !storedObject[`step${stepNumber}`]?.data ? <ContentSpin /> : <></>}
        </WrapperForm>
    );
};
