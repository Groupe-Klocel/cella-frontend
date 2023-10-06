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
import { useHandlingUnits, useLocationIds } from '@helpers';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';
import configs from '../../../../../common/configs.json';
import { useRouter } from 'next/router';

export interface IEmptyLocationsProps {
    withAvailableHU?: boolean;
}

export const EmptyLocations = ({ withAvailableHU }: IEmptyLocationsProps) => {
    const { t } = useTranslation();
    const router = useRouter();

    const [displayedLocations, setDisplayedLocations] = useState<Array<any>>();
    const [nbMaxLocations, setNbMaxLocations] = useState<number>(3);
    const {
        isLoading: emptyLocLoading,
        data: emptyLocData,
        error
    } = useLocationIds({ autocountHandlingUnit: 0 }, 1, 100, null, router.locale);
    const {
        isLoading: availableHULoading,
        data: availableHUData,
        error: availableHUError
    } = useHandlingUnits(
        { autocountHandlingUnitContent: 0, location_Category: 20710 },
        1,
        100,
        null
    );

    //When location
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
        if (emptyLocData) {
            const locData: Array<any> = [];
            emptyLocData?.locations?.results.slice(0, nbMaxLocations).forEach((e: any) => {
                locData.push({
                    locationId: e.id,
                    locationName: e.name,
                    type: e.category === configs.LOCATION_CATEGORY_PICKING ? 'Picking' : 'Stock',
                    withHU: false
                });
            });
            if (withAvailableHU) {
                availableHUData?.handlingUnits?.results
                    .slice(0, nbMaxLocations)
                    .forEach((e: any) => {
                        locData.push({
                            locationId: e.locationId,
                            locationName: e.location.name,
                            type:
                                e.location.category === configs.LOCATION_CATEGORY_PICKING
                                    ? 'Picking'
                                    : 'Stock',
                            withHU: true
                        });
                    });
            }
            locData.sort(compare);
            setDisplayedLocations(locData);
        }
    }, [emptyLocData]);

    const columns = [
        {
            title: t('common:locations-empty_abbr'),
            dataIndex: 'locationName',
            key: 'location'
        },
        {
            title: t('common:type'),
            dataIndex: 'type',
            key: 'type'
        }
    ];

    return (
        <PageTableContentWrapper>
            {emptyLocData && !emptyLocLoading && !availableHULoading ? (
                <RadioSimpleTable columns={columns} displayedLocations={displayedLocations} />
            ) : (
                <ContentSpin />
            )}
        </PageTableContentWrapper>
    );
};
