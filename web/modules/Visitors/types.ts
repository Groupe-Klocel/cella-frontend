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
import { VisitStatusCodes } from '@helpers';

export type VisitEntry = {
    id: string;
    name: string;
    status: number;
    appointmentType: number;
    driverName?: string | null;
    driverEmail?: string | null;
    driverPhoneNumber?: string | null;
    entityName?: string | null;
    contactName?: string | null;
    comment?: string | null;
    allowedZones?: string[] | null;
    escortRequired?: boolean | null;
    otherRequirements?: string | null;
    truckLicensePlate?: string | null;
    denyReason?: string | null;
    appointmentDateBegin?: string | null;
    appointmentDateEnd?: string | null;
    extraText1?: string | null;
    extraText2?: string | null;
    extras?: any;
};

export const VISIT_ENTRY_FIELDS = `id name status appointmentType driverName driverEmail
    driverPhoneNumber entityName contactName comment allowedZones escortRequired
    otherRequirements truckLicensePlate denyReason appointmentDateBegin appointmentDateEnd
    extraText1 extraText2 extras`;

export type VisitDecision = 'pending' | 'approved' | 'refused';

// Same classification idea as the truck gate: the tablet stamps
// extras.visitorCheckIn, the security decision updates it + the status.
export const classifyVisitEntry = (entry: VisitEntry, codes: VisitStatusCodes): VisitDecision => {
    if (entry.extras?.visitorCheckIn?.decision === 'approved' || entry.status === codes.checkedIn)
        return 'approved';
    if (
        entry.extras?.visitorCheckIn?.decision === 'refused' ||
        entry.status === codes.cancelled ||
        !!entry.denyReason
    )
        return 'refused';
    return 'pending';
};
