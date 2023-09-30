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
import { PageTableContentWrapper, ContentSpin, RadioSimpleTable } from '@components';
import { useHandlingUnitContents } from '@helpers';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';
import configs from '../../../../../common/configs.json';

export interface ISimilarLocationsProps {
    articleId: string;
    chosenContentId: string;
}

export const SimilarLocations = ({ articleId, chosenContentId }: ISimilarLocationsProps) => {
    const { t } = useTranslation();

    const [displayedLocations, setDisplayedLocations] = useState<Array<any>>();
    //ENHANCEMENT: nbMaxLocations will be used to change according to a parameter
    const [nbMaxLocations, setNbMaxLocations] = useState<number>(3);
    const {
        isLoading: huContentLoading,
        data: huContentData,
        error: huContentError
    } = useHandlingUnitContents({ articleId: `${articleId}` }, 1, 100, null);

    useEffect(() => {
        function compare(a: any, b: any) {
            if (a.locationName < b.locationName) {
                return -1;
            }
            if (a.locationName > b.locationName) {
                return 1;
            }
            return 0;
        }
        if (huContentData) {
            const locData: Array<any> = [];
            huContentData?.handlingUnitContents?.results
                .filter(
                    (e: any) =>
                        e.id !== chosenContentId && e.handlingUnit.location?.category === configs.LOCATION_CATEGORY_STOCK
                )
                .slice(0, nbMaxLocations)
                .forEach((e: any) => {
                    locData.push({
                        locationId: e.handlingUnit.locationId,
                        locationName: e.handlingUnit.location.name,
                        quantity: e.quantity,
                        type: 'Stock'
                    });
                });
            huContentData?.handlingUnitContents?.results
                .filter(
                    (e: any) =>
                        e.id !== chosenContentId && e.handlingUnit.location?.category === configs.LOCATION_CATEGORY_PICKING
                )
                .slice(0, nbMaxLocations)
                .forEach((e: any) => {
                    locData.push({
                        locationId: e.handlingUnit.locationId,
                        locationName: e.handlingUnit.location.name,
                        quantity: e.quantity,
                        type: 'Picking'
                    });
                });
            locData.sort(compare);
            setDisplayedLocations(locData);
        }
    }, [huContentData]);

    const columns = [
        {
            title: t('common:location_abbr'),
            dataIndex: 'locationName',
            key: 'location'
        },
        {
            title: t('common:quantity_abbr'),
            dataIndex: 'quantity',
            key: 'quantity'
        },
        {
            title: t('common:type'),
            dataIndex: 'type',
            key: 'type'
        }
    ];

    return (
        <PageTableContentWrapper>
            {huContentData && !huContentLoading ? (
                <RadioSimpleTable columns={columns} displayedLocations={displayedLocations} />
            ) : (
                <ContentSpin />
            )}
        </PageTableContentWrapper>
    );
};
