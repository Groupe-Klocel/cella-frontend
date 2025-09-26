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

export interface ICommentChecksProps {
    dataToCheck: any;
}

export const CommentChecks = ({ dataToCheck }: ICommentChecksProps) => {
    const { t } = useTranslation();
    const storage = LsIsSecured();

    const {
        process,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        trigger: { triggerRender, setTriggerRender },
        triggerAlternativeSubmit1: { triggerAlternativeSubmit1, setTriggerAlternativeSubmit1 },
        required
    } = dataToCheck;

    const storedObject = JSON.parse(storage.get(process) || '{}');

    // TYPED SAFE ALL

    useEffect(() => {
        if (scannedInfo) {
            let commentInfo = scannedInfo;
            if (!required && scannedInfo === 'undefined') {
                commentInfo = null;
            }
            const data: { [label: string]: any } = {};
            data['comment'] = commentInfo;
            storedObject[`step${stepNumber}`] = {
                ...storedObject[`step${stepNumber}`],
                data: data
            };
            setTriggerRender(!triggerRender);
            setTriggerAlternativeSubmit1(!triggerAlternativeSubmit1);
            storage.set(process, JSON.stringify(storedObject));
        }
    }, [scannedInfo, triggerAlternativeSubmit1]);

    return <WrapperForm>{scannedInfo ? <ContentSpin /> : <></>}</WrapperForm>;
};
