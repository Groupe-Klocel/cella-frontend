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
import { showError } from '@helpers';
import { gql } from 'graphql-request';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { Modal } from 'antd';

export interface IRoundOrHuOrPositionChecksProps {
    dataToCheck: any;
}

export const RoundOrHuOrPositionCheck = ({ dataToCheck }: IRoundOrHuOrPositionChecksProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient, user } = useAuth();

    const {
        processName,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        setResetForm
    } = dataToCheck;

    const state = useAppState();
    const { configs } = state;
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const configsParamsCodes = useMemo(() => {
        const findCodeByScopeAndValue = (items: any[], scope: string, value: string) => {
            return parseInt(
                items.find(
                    (item: any) =>
                        item.scope === scope && item.value.toLowerCase() === value.toLowerCase()
                )?.code
            );
        };

        const roundInPreparation = findCodeByScopeAndValue(
            configs,
            'round_status',
            'In preparation'
        );

        const roundToBePacked = findCodeByScopeAndValue(configs, 'round_status', 'To be packed');

        const roundToBeRepacked = findCodeByScopeAndValue(
            configs,
            'round_status',
            'To be repacked'
        );

        const roundPackingInProgress = findCodeByScopeAndValue(
            configs,
            'round_status',
            'Packing in progress'
        );

        const roundToBeChecked = findCodeByScopeAndValue(configs, 'round_status', 'To be checked');

        const HUOInPreparation = findCodeByScopeAndValue(
            configs,
            'handling_unit_outbound_status',
            'In preparation'
        );

        const HUOToBePacked = findCodeByScopeAndValue(
            configs,
            'handling_unit_outbound_status',
            'To be packed'
        );

        const HUOToBeRepacked = findCodeByScopeAndValue(
            configs,
            'handling_unit_outbound_status',
            'To be repacked'
        );

        const HUOPackingInProgress = findCodeByScopeAndValue(
            configs,
            'handling_unit_outbound_status',
            'Packing in progress'
        );

        const HUOPackingWithControlInProgress = findCodeByScopeAndValue(
            configs,
            'handling_unit_outbound_status',
            'Packing with control in progress'
        );

        return {
            roundInPreparation,
            roundToBePacked,
            roundToBeRepacked,
            roundPackingInProgress,
            roundToBeChecked,
            HUOInPreparation,
            HUOToBePacked,
            HUOToBeRepacked,
            HUOPackingInProgress,
            HUOPackingWithControlInProgress
        };
    }, [configs]);

    async function scanRoundOrEquipment(scannedItem: any) {
        const query = gql`
            mutation executeFunction($functionName: String!, $event: JSON!) {
                executeFunction(functionName: $functionName, event: $event) {
                    status
                    output
                }
            }
        `;

        const {
            roundInPreparation,
            roundToBePacked,
            roundToBeRepacked,
            roundPackingInProgress,
            roundToBeChecked,
            HUOInPreparation,
            HUOToBePacked,
            HUOToBeRepacked,
            HUOPackingInProgress,
            HUOPackingWithControlInProgress
        } = configsParamsCodes;

        const variables = {
            functionName: 'RF_scan_round_or_equipment_or_position',
            event: {
                input: {
                    scannedItem,
                    roundStatus: [
                        roundInPreparation,
                        roundToBePacked,
                        roundToBeRepacked,
                        roundPackingInProgress,
                        roundToBeChecked
                    ],
                    huoStatus: [
                        HUOInPreparation,
                        HUOToBePacked,
                        HUOToBeRepacked,
                        HUOPackingInProgress,
                        HUOPackingWithControlInProgress
                    ]
                }
            }
        };
        console.log(
            'AXC - RoundOrHuOrPositionChecks.tsx - scanRoundOrEquipment - variables:',
            variables
        );

        try {
            const result = await graphqlRequestClient.request(query, variables);
            return result;
        } catch (error) {
            showError(t('messages:error-executing-function'));
            console.log('executeFunctionError', error);
        }
    }

    useEffect(() => {
        const processScannedInfo = async () => {
            if (!scannedInfo) return;

            setIsLoading(true);
            try {
                const response: any = await scanRoundOrEquipment(scannedInfo);
                const result = response.executeFunction;

                if (result.status === 'ERROR') {
                    showError(result.output);
                    return;
                }

                if (result.status === 'OK' && result.output.status === 'KO') {
                    showError(t(`errors:${result.output.output.code}`));
                    console.log('Backend_message', result.output.output);
                    setResetForm(true);
                    setScannedInfo(undefined);
                    return;
                }

                dispatch({
                    type: 'UPDATE_BY_STEP',
                    processName,
                    stepName: `step${stepNumber}`,
                    object: { ...storedObject[`step${stepNumber}`], data: result.output.response },
                    customFields: [{ key: 'currentStep', value: stepNumber }]
                });
            } catch (error) {
                console.error('Error in fetchData:', error);
                showError(t('messages:error-executing-function'));
            } finally {
                setIsLoading(false);
            }
        };

        processScannedInfo();
    }, [scannedInfo]);

    return <WrapperForm>{scannedInfo || isLoading ? <ContentSpin /> : <></>}</WrapperForm>;
};
