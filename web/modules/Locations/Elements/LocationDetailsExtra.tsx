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
import { getModesFromPermissions } from '@helpers';
import { useAppState } from 'context/AppContext';
import { ModeEnum, Table } from 'generated/graphql';
import { LocationExtrasListComponent } from './LocationExtrasListComponent';
import { useMemo } from 'react';

export interface IItemDetailsProps {
    locationId?: string | any;
    locationName?: string | any;
    locationCategory?: number | any;
    details?: any;
}

const LocationDetailsExtra = ({
    locationId,
    locationName,
    locationCategory
}: IItemDetailsProps) => {
    const { permissions, configs } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.Location);

    const configsParamsCodes = useMemo(() => {
        const findCodeByScopeAndValue = (items: any[], scope: string, value: string) => {
            return items.find(
                (item: any) =>
                    item.scope === scope && item.value.toLowerCase() === value.toLowerCase()
            )?.code;
        };
        return {
            locationCategoryDockCode: findCodeByScopeAndValue(
                configs ?? [],
                'location_category',
                'Dock'
            )
        };
    }, [configs]);

    return (
        <>
            {modes.length > 0 &&
            modes.includes(ModeEnum.Read) &&
            locationCategory == parseInt(configsParamsCodes.locationCategoryDockCode) ? (
                <>
                    <LocationExtrasListComponent
                        locationId={locationId}
                        locationName={locationName}
                    />
                </>
            ) : (
                <></>
            )}
        </>
    );
};

export { LocationDetailsExtra };
