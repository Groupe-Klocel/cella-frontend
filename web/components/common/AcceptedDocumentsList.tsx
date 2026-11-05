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
import { Space, Spin, Tag, Tooltip, Typography } from 'antd';
import { useRouter } from 'next/router';
import {
    formatUTCLocaleDateTime,
    getVisitZoneLabel,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { useAppState } from 'context/AppContext';

const { Text } = Typography;

// Renders the safety documents that were ACTUALLY presented when the entry
// signature was collected, as persisted by the mobile kiosk in
// appointment.extras.safetyChecklist.documents.
//
// It lives here, outside any entity module, because the very same list has to appear on two
// screens that both read the same appointment row: the appointment detail page (driver /
// truck entry, through AppointmentSignature) and the visitor detail page (through
// VisitorDetailsExtra). Duplicating the markup once let the two screens diverge - the visitor
// screen simply had no list at all - so the rendering is owned here and nowhere else.
//
// Two rules this component deliberately enforces for both callers:
//   - it NEVER re-runs the document rule. Re-running it would list today's documents instead of
//     the ones that were signed, which is exactly the bug this ticket fixes: editing a safety
//     document must not rewrite the history of a past signature.
//   - a visit or appointment signed before the persistence existed carries no list; it gets the
//     same neutral "no data" mention on both screens rather than an invented one.
//
// The three states below must never look alike. "the list is not persisted" and "the list has
// not been read yet / could not be read" would both have rendered the neutral no-data mention,
// which reads as "nothing was ever traced" - a wrong and damaging conclusion for an audit screen.
// The caller therefore hands over the state of its own extras read, and this component keeps the
// negative mention for the one case that deserves it.
//
// Every label is an existing key (common:version, messages:no-data, messages:error-getting-data):
// no database translation row has to be created for this block.

// One persisted document identity, as written by the kiosk. Read-only here, hence the loose
// shape: anything older or partially written must still render rather than crash the page.
export interface IAcceptedDocument {
    id?: string;
    name?: string;
    modified?: string | null;
    size?: number;
    fingerprint?: string;
    zone?: string;
}

// State of the caller's `extras` read. 'loading' and 'error' are NOT absences of documents.
export type TAcceptedDocumentsReadState = 'loading' | 'error' | 'ready';

export interface IAcceptedDocumentsListProps {
    // extras.safetyChecklist.documents, straight from the raw `extras` query. Unknown on purpose:
    // callers hand over whatever the API returned, normalising happens here once.
    documents?: any;
    // Defaults to 'ready' so a caller that already holds the payload stays a one-liner.
    readState?: TAcceptedDocumentsReadState;
}

// Fingerprints are long; show the algorithm prefix plus the head of the digest, full one on hover.
const truncateFingerprint = (fingerprint: string): string => {
    const separator = fingerprint.indexOf(':');
    const algorithm = separator > 0 ? fingerprint.slice(0, separator + 1) : '';
    const digest = separator > 0 ? fingerprint.slice(separator + 1) : fingerprint;
    return digest.length > 12 ? `${algorithm}${digest.slice(0, 12)}…` : fingerprint;
};

const AcceptedDocumentsList: FC<IAcceptedDocumentsListProps> = ({
    documents,
    readState = 'ready'
}: IAcceptedDocumentsListProps) => {
    const { t } = useTranslation();
    const router = useRouter();
    const { parameters } = useAppState();
    const language = router.locale ?? 'en-US';

    const acceptedDocuments: IAcceptedDocument[] = Array.isArray(documents) ? documents : [];

    // Still reading: show a spinner, never the negative mention.
    if (readState === 'loading') {
        return <Spin size="small" />;
    }

    // The read failed: the list may well exist in database, we just could not get it. Saying
    // "no data" here would be a lie the client would act on.
    if (readState === 'error') {
        return <Text type="danger">{t('messages:error-getting-data')}</Text>;
    }

    if (acceptedDocuments.length === 0) {
        // Read succeeded and carries no list: signed before this feature existed. Say so plainly.
        // Re-running the rule here would fabricate a list that was never the one signed.
        return <Text type="secondary">{t('messages:no-data')}</Text>;
    }

    return (
        <Space direction="vertical" size={2} style={{ width: '100%' }}>
            {acceptedDocuments.map((document, index) => (
                <div key={`${document.id ?? document.name ?? index}-${index}`}>
                    <Text strong>{document.name ?? '-'}</Text>
                    {document.zone ? (
                        <Tag style={{ marginLeft: 8 }}>
                            {getVisitZoneLabel(parameters, document.zone, language)}
                        </Tag>
                    ) : null}
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                        {t('common:version')}:{' '}
                        {document.modified
                            ? formatUTCLocaleDateTime(document.modified, router.locale)
                            : '-'}
                    </Text>
                    {document.fingerprint ? (
                        <Tooltip title={document.fingerprint}>
                            <Text code style={{ marginLeft: 8 }}>
                                {truncateFingerprint(document.fingerprint)}
                            </Text>
                        </Tooltip>
                    ) : null}
                </div>
            ))}
        </Space>
    );
};

export { AcceptedDocumentsList };
