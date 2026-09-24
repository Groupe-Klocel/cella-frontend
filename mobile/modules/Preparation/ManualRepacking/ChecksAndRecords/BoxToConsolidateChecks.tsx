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
import { findCodeByScopeAndValue, showError, showSuccess } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect } from 'react';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';
import { useAppDispatch, useAppState } from 'context/AppContext';

export interface IBoxToConsolidateChecksProps {
    dataToCheck: any;
}

export const BoxToConsolidateChecks = ({ dataToCheck }: IBoxToConsolidateChecksProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();

    const {
        processName,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        handlingUnitOutboundInfos,
        setHandlingUnitOutboundInfos,
        originalBox,
        setResetForm
    } = dataToCheck;

    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    const consolidatedBoxes = storedObject.consolidatedBoxes ?? [];

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
        // Cancelled lines are left as they are: they are not merged into the original box
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
                setHandlingUnitOutboundInfos(undefined);
            };
            // Box exists?
            if (handlingUnitOutboundInfos.handlingUnitOutbounds?.count === 0) {
                handleError(t('messages:unknown-box'));
                return;
            }
            const handlingUnitOutbound = handlingUnitOutboundInfos.handlingUnitOutbounds.results[0];
            // Box not already scanned (nor the original one)?
            if (
                handlingUnitOutbound.id === originalBox?.id ||
                consolidatedBoxes.some((box: any) => box.id === handlingUnitOutbound.id)
            ) {
                handleError(t('messages:box-already-scanned'));
                return;
            }
            // Box from the same delivery?
            if (handlingUnitOutbound.deliveryId !== originalBox?.deliveryId) {
                handleError(t('messages:unexpected-scanned-item'));
                return;
            }
            // Update HUO/HUCO status to "Manual packing" and add the box to the
            // consolidation list, then stay on the same step for the next scan.
            const recordBox = async () => {
                try {
                    const updatedHuo = await updateBoxToManualPacking(handlingUnitOutbound);
                    dispatch({
                        type: 'UPDATE_BY_STEP',
                        processName,
                        stepName: `step${stepNumber}`,
                        object: storedObject[`step${stepNumber}`],
                        customFields: [
                            {
                                key: 'consolidatedBoxes',
                                value: [...consolidatedBoxes, updatedHuo]
                            }
                        ]
                    });
                    showSuccess(t('messages:box-added-to-consolidation'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                    setHandlingUnitOutboundInfos(undefined);
                } catch (error) {
                    console.log('updateBoxToManualPackingError', error);
                    handleError(t('messages:error-updating-data'));
                }
            };
            recordBox();
        }
    }, [handlingUnitOutboundInfos]);

    return (
        <WrapperForm>
            {scannedInfo && !handlingUnitOutboundInfos ? <ContentSpin /> : <></>}
        </WrapperForm>
    );
};
