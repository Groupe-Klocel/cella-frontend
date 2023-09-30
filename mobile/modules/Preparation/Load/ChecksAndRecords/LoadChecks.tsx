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
import useTranslation from 'next-translate/useTranslation';
import { useEffect } from 'react';
import configs from '../../../../../common/configs.json';

export interface ILoadChecksProps {
    dataToCheck: any;
}

export const LoadChecks = ({ dataToCheck }: ILoadChecksProps) => {
    const { t } = useTranslation();
    const storage = LsIsSecured();

    const {
        process,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        loadInfos,
        trigger: { triggerRender, setTriggerRender },
        setResetForm
    } = dataToCheck;

    const storedObject = JSON.parse(storage.get(process) || '{}');

    useEffect(() => {
        if (scannedInfo && loadInfos.data) {
            if (
                // Condition
                loadInfos.data.loads?.count !== 0 &&
                loadInfos.data.loads?.results[0].status === configs.LOAD_STATUS_CREATED
            ) {
                // Save data in Local Storage
                const data: { [label: string]: any } = {};
                data['load'] = loadInfos.data?.loads?.results[0];
                const countLoop = 0;
                setTriggerRender(!triggerRender);
                storedObject[`step${stepNumber}`] = {
                    ...storedObject[`step${stepNumber}`],
                    data,
                    countLoop
                };
            } else {
                if (loadInfos.data.loads?.count === 0) {
                    showError(t('messages:no-load'));
                } else {
                    showError(t('messages:load-dispatched'));
                }
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
    }, [loadInfos]);

    return <WrapperForm>{scannedInfo && !loadInfos ? <ContentSpin /> : <></>}</WrapperForm>;
};
