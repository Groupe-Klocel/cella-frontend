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

import { FC } from 'react';
import { Descriptions, Divider } from 'antd';
import { useRouter } from 'next/router';
import { formatUTCLocaleDateTime, useTranslationWithFallback as useTranslation } from '@helpers';
import {
    AcceptedDocumentsList,
    TAcceptedDocumentsReadState
} from 'components/common/AcceptedDocumentsList';

// The entry signature (driver or visitor) is collected on the mobile kiosk and
// stored in appointment.extras. Until now it was only readable on the gate-validation screen,
// which becomes unreachable as soon as the appointment moves past On Site. This block shows it
// on the appointment detail page whatever the status, so the signed acceptance stays auditable.
// The translation keys are reused from the visitor detail screen and the documents tab on purpose:
// no new translation has to be created in the database.
//
// It also lists the documents that were ACTUALLY presented at signature time, read from
// extras.safetyChecklist.documents (persisted by the kiosk at acceptance). That list is rendered by
// the shared AcceptedDocumentsList component, which the visitor detail screen uses as well so
// the two screens cannot drift apart.

export interface IAppointmentSignatureProps {
    signature?: string | null;
    // extras.safetyChecklist as persisted by the kiosk (driver or visitor flow)
    safetyChecklist?: any;
    // State of the caller's `extras` read. Forwarded untouched: a failed or pending read must not
    // be shown as an appointment whose documents were never traced.
    extrasReadState?: TAcceptedDocumentsReadState;
}

const AppointmentSignature: FC<IAppointmentSignatureProps> = ({
    signature,
    safetyChecklist,
    extrasReadState = 'ready'
}: IAppointmentSignatureProps) => {
    const { t } = useTranslation();
    const router = useRouter();

    const accepted = safetyChecklist?.accepted === true;
    const acceptedAt = safetyChecklist?.acceptedAt;

    // Nothing was signed and nothing was accepted: render nothing at all rather than an empty
    // section.
    if (!signature && !accepted) {
        return null;
    }

    return (
        <>
            <Divider orientation="left">{t('common:safety-instructions')}</Divider>
            <Descriptions bordered column={1}>
                <Descriptions.Item label={t('d:signature')}>
                    {signature ? (
                        <img
                            src={signature}
                            alt={t('d:signature')}
                            style={{
                                maxWidth: 320,
                                maxHeight: 160,
                                border: '1px solid #d9d9d9',
                                background: '#fff'
                            }}
                        />
                    ) : (
                        '-'
                    )}
                </Descriptions.Item>
                {accepted ? (
                    <Descriptions.Item label={t('d:acceptance-date')}>
                        {acceptedAt ? formatUTCLocaleDateTime(acceptedAt, router.locale) : '-'}
                    </Descriptions.Item>
                ) : null}
                <Descriptions.Item label={t('common:documents')}>
                    <AcceptedDocumentsList
                        documents={safetyChecklist?.documents}
                        readState={extrasReadState}
                    />
                </Descriptions.Item>
            </Descriptions>
        </>
    );
};

export { AppointmentSignature };
