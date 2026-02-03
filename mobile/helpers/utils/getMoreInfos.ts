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

import { arrayOfInfosToAdd } from './getMoreInfosUtils/arrayOfInfosToAdd';

export function getMoreInfos(headerDisplay: any, storedObject: any, processName: string, t: any) {
    arrayOfInfosToAdd.forEach((info) => {
        try {
            const func = require(`./getMoreInfosUtils/${info.functionName}`)[info.functionName];
            if (func) {
                const result = func(processName, storedObject);
                if (result) {
                    // Insert the new info just under the targeted position, or at the end if targeted position is null
                    const entries = Object.entries(headerDisplay);
                    let insertIndex = entries.length;
                    if (info.newHeaderInfoTargetedPosition) {
                        const targetIndex = entries.findIndex(
                            ([key, value]) => value === result[info.newHeaderInfoTargetedPosition!]
                        );
                        insertIndex = targetIndex >= 0 ? targetIndex + 1 : entries.length;
                    }
                    entries.splice(insertIndex, 0, [t(info.key), result[info.newHeaderInfoName]]);
                    headerDisplay = Object.fromEntries(entries);
                }
            } else {
                console.warn(`Function ${info.functionName} not found in function map`);
            }
        } catch (error) {
            console.error(`Error calling function ${info.functionName}:`, error);
        }
    });
    return headerDisplay;
}
