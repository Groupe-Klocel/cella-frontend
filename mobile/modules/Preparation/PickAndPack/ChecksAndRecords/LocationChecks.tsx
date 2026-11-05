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
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect } from 'react';
import { useAppDispatch, useAppState } from 'context/AppContext';
import {
    getExpectedArticleId,
    isContentOfExpectedLine
} from 'modules/Preparation/PickAndPack/Elements/expectedArticle';

export interface ILocationChecksProps {
    dataToCheck: any;
}

export const LocationChecks = ({ dataToCheck }: ILocationChecksProps) => {
    const { t } = useTranslation();

    const {
        processName,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        locationInfos,
        showSimilarLocations,
        setResetForm,
        isHuClosureLoading
    } = dataToCheck;

    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};

    const proposedRoundAdvisedAddress =
        storedObject['step10']?.data?.proposedRoundAdvisedAddresses?.[0];

    // Same article as the locations query that produced locationInfos (ScanLocation filters the
    // contents on the delivery line): checking another reference here rejects a correct location.
    const expectedArticleId = getExpectedArticleId(proposedRoundAdvisedAddress);

    // What step30 requires of the location it is handed (isContentOfExpectedLine, shared with the
    // quantity ScanLocation displays). This step used to stop at "the location holds the article",
    // quantity and stock attributes left aside, so it validated a location step30 then refused
    // with an ON_BACK to this very step - and, both steps being automatic when the round advises a
    // location, the two bounced the operator back and forth forever on "unexpected scanned item".
    const isExpectedContent = isContentOfExpectedLine(proposedRoundAdvisedAddress);

    // TYPED SAFE ALL
    useEffect(() => {
        if (scannedInfo && locationInfos) {
            if (locationInfos.locations?.count === 0) {
                console.log('locationInfos', locationInfos);
                dispatch({
                    type: 'UPDATE_BY_STEP',
                    processName,
                    stepName: `step${stepNumber}`,
                    customFields: [{ key: 'currentStep', value: stepNumber }]
                });
                showError(t('messages:no-location'));
                setResetForm(true);
                setScannedInfo(undefined);
            }
            if (locationInfos.locations?.count > 0) {
                const data: { [label: string]: any } = {};
                data['locations'] = locationInfos.locations?.results.map(
                    ({
                        id,
                        name,
                        barcode,
                        level,
                        handlingUnits,
                        category
                    }: {
                        id: string;
                        name: string;
                        barcode: string;
                        level: number;
                        handlingUnits: any;
                        category: any;
                    }) => {
                        return { id, name, barcode, level, handlingUnits, category };
                    }
                );
                if (expectedArticleId) {
                    const contents = data['locations'].flatMap((location: any) =>
                        (location.handlingUnits ?? []).flatMap(
                            (hu: any) => hu.handlingUnitContents ?? []
                        )
                    );
                    const holdsExpectedArticle = contents.some(
                        (huc: any) => (huc.articleId ?? huc.article?.id) == expectedArticleId
                    );
                    // A location that does not carry the article at all is a wrong location; one
                    // that carries it without anything left to pick (quantity fallen to 0, other
                    // stock owner / status / reservation) is the right place with nothing in it.
                    // Two distinct dead-ends, so two distinct messages - and in both cases the
                    // operator stays on this step, where "Empl." offers the locations that do hold
                    // the stock and "next" moves on to another line.
                    if (!holdsExpectedArticle || !contents.some(isExpectedContent)) {
                        console.log('No matching handling unit content', {
                            expectedArticleId,
                            ...data
                        });
                        showError(
                            holdsExpectedArticle
                                ? t('messages:no-huc-quantity-in-location')
                                : t('messages:unexpected-scanned-item')
                        );
                        setResetForm(true);
                        setScannedInfo(undefined);
                        return;
                    }
                }
                showSimilarLocations?.showSimilarLocations.setShowSimilarLocations(false);
                dispatch({
                    type: 'UPDATE_BY_STEP',
                    processName,
                    stepName: `step${stepNumber}`,
                    object: {
                        ...storedObject[`step${stepNumber}`],
                        data
                    }
                });
            }
        }
    }, [locationInfos]);

    return (
        <WrapperForm>
            {(scannedInfo && !locationInfos) || isHuClosureLoading ? <ContentSpin /> : <></>}
        </WrapperForm>
    );
};
