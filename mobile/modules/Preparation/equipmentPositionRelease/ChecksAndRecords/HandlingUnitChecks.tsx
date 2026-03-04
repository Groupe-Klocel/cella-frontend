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
import { showError, LsIsSecured } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect } from 'react';
import configs from '../../../../../common/configs.json';
import parameters from '../../../../../common/parameters.json';
import { useAppDispatch, useAppState } from 'context/AppContext';
import graphqlRequestClient from 'graphql/graphqlRequestClient';
import { gql } from 'graphql-request';

export interface IHandlingUnitChecksProps {
    dataToCheck: any;
}

export const HandlingUnitChecks = ({ dataToCheck }: IHandlingUnitChecksProps) => {
    const { t } = useTranslation();

    const {
        processName,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        setResetForm
    } = dataToCheck;

    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    // TYPED SAFE ALL

    const getHU = async (scannedInfo: any): Promise<any> => {
        const query = gql`
            query handlingUnits($filters: HandlingUnitSearchFilters) {
                handlingUnits(filters: $filters) {
                    count
                    itemsPerPage
                    totalPages
                    results {
                        id
                        name
                        type
                    }
                }
            }
        `;

        const variables = {
            filters: { barcode: [`${scannedInfo}`] }
        };
        const handlingUnitInfos = await graphqlRequestClient.request(query, variables);
        return handlingUnitInfos;
    };

    useEffect(() => {
        const fetchData = async () => {
            let data: { [label: string]: any } = {};
            const result = await getHU(scannedInfo);
            if (scannedInfo && result) {
                if (!(result as any).handlingUnits?.results[0]) {
                    const type =
                        scannedInfo[0] == '0' || scannedInfo[0] == 'P'
                            ? parameters.HANDLING_UNIT_TYPE_PALLET
                            : parameters.HANDLING_UNIT_TYPE_BOX;
                    data['handlingUnit'] = scannedInfo;
                    data['handlingUnitType'] = type;
                    data['isHUToCreate'] = true;
                    // specific to handle unique handling unit in selected location and back function for next step
                } else {
                    showError(t('messages:unexpected-scanned-item'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                }
            }
            if (storedObject[`step${stepNumber}`] && Object.keys(data).length != 0) {
                dispatch({
                    type: 'UPDATE_BY_STEP',
                    processName,
                    stepName: `step${stepNumber}`,
                    object: {
                        ...storedObject[`step${stepNumber}`],
                        data
                    },
                    customFields: [{ key: 'currentStep', value: stepNumber }]
                });
            }
        };
        if (scannedInfo) {
            fetchData();
        }
    }, [scannedInfo]);

    return <WrapperForm>{scannedInfo ? <ContentSpin /> : <></>}</WrapperForm>;
};
