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

// `wm_appointments-carrier` is a sentinel permission flag (not a real table). When a user carries
// it, the appointment screens are shown in a restricted "carrier" mode: no dock choice, no
// extra-status edit, no status change beyond Submitted, no appointment-line attach/modify, no
// outbound links to purchase-order/delivery/load detail, and no recurring appointments. The carrier
// can still pick a time, fill driver info, optional references, the truck composition and add
// documents, then submit. Mirrors the flag-check pattern used in AppLayout for menu authorization.

export const isCarrierAppointmentUser = (permissions: any): boolean =>
    !!permissions?.some((p: any) => p.table === 'wm_appointments-carrier');
