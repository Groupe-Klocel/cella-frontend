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
import { gql } from 'graphql-request';

const updateVisitMutation = gql`
    mutation updateVisitAppointment($id: String!, $input: UpdateAppointmentInput!) {
        updateAppointment(id: $id, input: $input) {
            id
            status
        }
    }
`;

// Check-out: the real exit time is the click time; it is mirrored in
// extraText2 so generic lists can display/sort it.
export const checkOutVisit = async (
    graphqlRequestClient: any,
    visit: { id: string; extras?: any },
    checkedOutStatus: number
) => {
    const now = new Date().toISOString();
    return graphqlRequestClient.request(updateVisitMutation, {
        id: visit.id,
        input: {
            status: checkedOutStatus,
            extraText2: now,
            extras: {
                ...(visit.extras ?? {}),
                visitorCheckOut: { at: now }
            }
        }
    });
};

export const cancelVisit = async (
    graphqlRequestClient: any,
    visit: { id: string; extras?: any },
    cancelledStatus: number,
    denyReason?: string
) => {
    return graphqlRequestClient.request(updateVisitMutation, {
        id: visit.id,
        input: {
            status: cancelledStatus,
            ...(denyReason ? { denyReason } : {})
        }
    });
};
