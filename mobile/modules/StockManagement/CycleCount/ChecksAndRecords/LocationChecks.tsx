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
import { Modal } from 'antd';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { createCycleCountError } from 'helpers/utils/crudFunctions/cycleCount';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';

export interface ILocationChecksProps {
    dataToCheck: any;
}

export const LocationChecks = ({ dataToCheck }: ILocationChecksProps) => {
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const { graphqlRequestClient } = useAuth();

    const {
        process,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        locationInfos,
        trigger: { triggerRender, setTriggerRender },
        triggerAlternativeSubmit,
        alternativeSubmitInput,
        setResetForm
    } = dataToCheck;

    const storedObject = JSON.parse(storage.get(process) || '{}');

    // TYPED SAFE ALL
    //retrieve necessary values for CC specifc checks
    const currentCycleCount = storedObject.step10?.data?.cycleCount;
    const currentCycleCountId: string = storedObject.step10?.data?.cycleCount?.id;
    const locationIdToCheck: string = storedObject.step10?.data?.currentCycleCountLine?.locationId;

    useEffect(() => {
        if (scannedInfo && locationInfos.data) {
            if (locationInfos.data.locations?.count !== 0) {
                const location = locationInfos.data?.locations?.results[0];
                if (locationIdToCheck === location.id) {
                    const data: { [label: string]: any } = {};
                    data['cycleCountLines'] =
                        storedObject.step10?.data?.cycleCount?.cycleCountLines.filter(
                            (line: any) => line.locationId === location.id
                        );
                    data['location'] = locationInfos.data?.locations?.results.map(
                        ({ id, name }: { id: string; name: string }) => {
                            return { id, name };
                        }
                    )[0];

                    setTriggerRender(!triggerRender);
                    storedObject[`step${stepNumber}`] = {
                        ...storedObject[`step${stepNumber}`],
                        data
                    };
                } else {
                    createCycleCountError(
                        currentCycleCountId,
                        `Step ${stepNumber} - ${t(
                            'messages:unexpected-scanned-item'
                        )} - ${scannedInfo}`
                    );
                    showError(t('messages:unexpected-scanned-item'));
                    setResetForm(true);
                    setScannedInfo(undefined);
                }
            } else {
                showError(t('messages:no-location'));
                setResetForm(true);
                setScannedInfo(undefined);
            }
        }
        if (
            storedObject[`step${stepNumber}`] &&
            Object.keys(storedObject[`step${stepNumber}`]).length != 0
        ) {
            storage.set(process, JSON.stringify(storedObject));
        }
    }, [locationInfos]);

    // Location closure function
    const [isCcClosureLoading, setIsCcClosureLoading] = useState(false);
    async function closeHU(CclInputs: any) {
        setIsCcClosureLoading(true);
        const query = gql`
            mutation executeFunction($functionName: String!, $event: JSON!) {
                executeFunction(functionName: $functionName, event: $event) {
                    status
                    output
                }
            }
        `;

        const variables = {
            functionName: 'K_updateCycleCountLines',
            event: {
                input: CclInputs
            }
        };

        try {
            const cc_result = await graphqlRequestClient.request(query, variables);
            if (cc_result.executeFunction.status === 'ERROR') {
                showError(cc_result.executeFunction.output);
            } else if (
                cc_result.executeFunction.status === 'OK' &&
                cc_result.executeFunction.output.status === 'KO'
            ) {
                showError(t(`errors:${cc_result.executeFunction.output.output.code}`));
                console.log('Backend_message', cc_result.executeFunction.output.output);
            } else {
                const storedObject = JSON.parse(storage.get(process) || '{}');
                storage.remove(process);
                const newStoredObject = JSON.parse(storage.get(process) || '{}');
                newStoredObject[`step10`] = storedObject[`step10`];
                storage.set(process, JSON.stringify(newStoredObject));
                setTriggerRender(!triggerRender);
            }
            setIsCcClosureLoading(false);
        } catch (error) {
            showError(t('messages:error-executing-function'));
            console.log('executeFunctionError', error);
            setIsCcClosureLoading(false);
        }
    }

    useEffect(() => {
        if (triggerAlternativeSubmit.triggerAlternativeSubmit) {
            if (!alternativeSubmitInput) {
                showError(t('messages:no-cc-to-close'));
                triggerAlternativeSubmit.setTriggerAlternativeSubmit(false);
            }
            const CCLineslowerStatusIds: any[] = [];
            currentCycleCount.cycleCountLines.forEach((ccLine: any) => {
                if (ccLine.status < currentCycleCount.status) {
                    CCLineslowerStatusIds.push(ccLine.id);
                }
            });
            if (CCLineslowerStatusIds.length > 0) {
                Modal.confirm({
                    title: (
                        <span style={{ fontSize: '14px' }}>
                            {t('messages:counting-finished-confirmation')}
                        </span>
                    ),
                    onOk: () => {
                        console.log('ConfirmCcFinished');
                        closeHU(CCLineslowerStatusIds);
                        triggerAlternativeSubmit.setTriggerAlternativeSubmit(false);
                        storage.remove(process);
                    },
                    onCancel: () => {
                        console.log('CancelCcFinished');
                        setResetForm(true);
                        setIsCcClosureLoading(false);
                        setScannedInfo(undefined);
                        triggerAlternativeSubmit.setTriggerAlternativeSubmit(false);
                    },
                    okText: t('messages:confirm'),
                    cancelText: t('messages:cancel'),
                    bodyStyle: { fontSize: '2px' }
                });
            }
        }
    }, [triggerAlternativeSubmit.triggerAlternativeSubmit]);

    return (
        <WrapperForm>
            {(scannedInfo && !locationInfos) || isCcClosureLoading ? <ContentSpin /> : <></>}
        </WrapperForm>
    );
};
