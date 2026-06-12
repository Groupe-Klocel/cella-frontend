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

// Lightweight view of an appointment as returned by the gate search query.
export interface GateAppointment {
    id: string;
    name?: string | null;
    status: number;
    statusText?: string | null;
    appointmentType?: number | null;
    appointmentTypeText?: string | null;
    truckLicensePlate?: string | null;
    trailerLicensePlate?: string | null;
    driverName?: string | null;
    driverPhoneNumber?: string | null;
    driverEmail?: string | null;
    entityName?: string | null;
    reference1?: string | null;
    reference2?: string | null;
    reference3?: string | null;
    safetyChecklistTemplate?: string | null;
    denyReason?: string | null;
    appointmentDateBegin?: string | null;
    appointmentDateEnd?: string | null;
    extraText1?: string | null;
    extraNumber1?: number | null;
    locationName?: string | null;
    extras?: Record<string, any> | null;
}

// Data captured by the registration form (step 30).
export interface RegistrationData {
    driverName: string;
    companyName: string;
    driverPhoneNumber: string;
    truckLicensePlate: string;
    trailerLicensePlate?: string;
    sealNumber?: string;
    estimatedWeight?: number;
    // Ad-hoc entry only: chosen carrier + slot duration (minutes).
    carrierId?: string;
    durationMinutes?: number;
}

// A document the driver must read and accept (optionally with a link to open it).
export interface ChecklistItem {
    code: string;
    label: string;
    url?: string;
}

// Resolved status / type codes coming from the tenant configuration.
export interface GateConfig {
    confirmedStatus: number;
    onSiteStatus: number;
    defaultAppointmentType: number;
}
