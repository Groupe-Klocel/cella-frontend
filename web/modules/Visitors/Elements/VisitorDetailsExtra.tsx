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
import { FC, useEffect, useState } from 'react';
import { Button, Card, Descriptions, Divider, Space, Tag } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import {
    formatUTCLocaleDateTime,
    getVisitZoneLabel,
    showError,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { StatusHistoryDetailExtraModelV2 } from '@helpers';
import { useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { DocumentAttachmentModelV2 } from 'models/DocumentAttachmentModelV2';
import {
    AcceptedDocumentsList,
    TAcceptedDocumentsReadState
} from 'components/common/AcceptedDocumentsList';

// A visit is an Appointment of type Visit, so the visitor kiosk writes the very same
// extras payload as the truck-entry kiosk (extras.visitorSignature + extras.safetyChecklist).
// The appointment detail page already showed the signed acceptance together with the documents that
// were presented at signature time; this screen only showed the signature. It now shows the same
// three things: the accepted-documents list (shared component, so the two screens cannot drift) and
// the visit's attachments, which is where the signed-acceptance PDF is stored.

export interface IVisitorDetailsExtraProps {
    visitId?: string | string[];
    data?: any;
}

const VisitorDetailsExtra: FC<IVisitorDetailsExtraProps> = ({
    visitId,
    data
}: IVisitorDetailsExtraProps) => {
    const { t } = useTranslation();
    const router = useRouter();
    const { parameters } = useAppState();
    const { graphqlRequestClient } = useAuth();
    const language = router.locale ?? 'en-US';
    const [extrasData, setExtrasData] = useState<any>(null);
    // 'loading' until the raw read below answers. An unread or failed `extras` is NOT a visit
    // without documents, and the two must not render alike - see AcceptedDocumentsList.
    const [extrasReadState, setExtrasReadState] = useState<TAcceptedDocumentsReadState>('loading');

    // router.query gives `string | string[]`; the API and the attachment search want the plain id.
    const appointmentId = Array.isArray(visitId) ? visitId[0] : visitId;

    // The generic detail component flattens the record before setData, so the
    // extras JSON arrives as extras_safetyChecklist_* / extras_visitorSignature
    // keys (arrays are collapsed to a single value by flatten()).
    const accepted = data?.extras_safetyChecklist_accepted === true;
    const acceptanceLanguage = data?.extras_safetyChecklist_language;
    const acceptedAt = data?.extras_safetyChecklist_acceptedAt;
    const rawZones = data?.extras_safetyChecklist_zones;
    const zones: string[] = Array.isArray(rawZones) ? rawZones : rawZones ? [rawZones] : [];
    const signature = data?.extras_visitorSignature;

    // The accepted-documents list cannot come from the flattened record: flatten() rewrites every
    // element of an array under the SAME key (the index is commented out in helpers/utils/utils.ts)
    // so extras.safetyChecklist.documents collapses to its last entry. The appointment detail page
    // hit the same wall and answered it with a raw `extras` query - same client, same handling,
    // asking for `extras` only since that is all this block needs.
    useEffect(() => {
        const fetchExtras = async () => {
            if (!appointmentId) return;
            const query = gql`
                query appointment($id: String!) {
                    appointment(id: $id) {
                        extras
                    }
                }
            `;
            setExtrasReadState('loading');
            try {
                const result = await graphqlRequestClient.request(query, { id: appointmentId });
                setExtrasData(result?.appointment?.extras ?? null);
                setExtrasReadState('ready');
            } catch (e) {
                console.error(e);
                setExtrasData(null);
                setExtrasReadState('error');
            }
        };
        fetchExtras();
    }, [appointmentId]);

    const downloadDocument = (base64Data: string, fileName: string, fileType: string) => {
        try {
            const byteCharacters = window.atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: fileType });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading document:', error);
            showError(t('messages:error-downloading-document'));
        }
    };

    const visitDocumentsHeaderData: HeaderData = {
        title: `${t('common:documents')}`,
        routes: [],
        actionsComponent: null
    };

    const statusHistoryHeaderData: HeaderData = {
        title: `${t('common:status-history')}`,
        routes: [],
        actionsComponent: null
    };

    return (
        <>
            <Divider />
            <Card type="inner" title={t('common:safety-instructions')}>
                <Descriptions column={2} size="small">
                    <Descriptions.Item label={t('d:instructions-accepted')}>
                        {accepted ? (
                            <Tag color="green">{t('common:yes')}</Tag>
                        ) : (
                            <Tag color="red">{t('common:no')}</Tag>
                        )}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('d:acceptance-language')}>
                        {acceptanceLanguage ?? '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('d:acceptance-date')}>
                        {acceptedAt ? formatUTCLocaleDateTime(acceptedAt, router.locale) : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('d:allowed-zones')}>
                        {zones.length > 0
                            ? zones
                                  .map((zone: string) =>
                                      getVisitZoneLabel(parameters, zone, language)
                                  )
                                  .join(', ')
                            : '-'}
                    </Descriptions.Item>
                    {/* span={2} is explicit on the last two items on purpose: with column={2} antd
                        only widens the trailing item when the row is short, so adding the documents
                        item below silently halved the signature. Pinning both keeps the signature
                        full width whatever is added next. */}
                    <Descriptions.Item label={t('d:signature')} span={2}>
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
                    <Descriptions.Item label={t('common:documents')} span={2}>
                        <AcceptedDocumentsList
                            documents={extrasData?.safetyChecklist?.documents}
                            readState={extrasReadState}
                        />
                    </Descriptions.Item>
                </Descriptions>
            </Card>
            <Divider />
            {/* The signed-acceptance PDF is a DocumentAttachment carrying objectName 'Appointment'
                and the visit id. DocumentAttachedListComponent cannot serve it: its objectName prop
                is a union with no 'Appointment' member. The appointment detail page works around
                that by driving the generic ListComponent directly, and so does this screen. */}
            <ListComponent
                searchCriteria={{ objectId: appointmentId, objectName: 'Appointment' }}
                dataModel={DocumentAttachmentModelV2}
                headerData={visitDocumentsHeaderData}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: {
                            id: string;
                            name: string;
                            filename: string;
                            fileContent: string;
                            extras?: { fullFileType: string };
                        }) => (
                            <Space>
                                <Button
                                    icon={<DownloadOutlined />}
                                    onClick={() =>
                                        downloadDocument(
                                            record.fileContent,
                                            record.filename || record.name,
                                            record.extras?.fullFileType ||
                                                'application/octet-stream'
                                        )
                                    }
                                    title={t('actions:download')}
                                />
                            </Space>
                        )
                    }
                ]}
                searchable={false}
                triggerDelete={undefined}
                triggerSoftDelete={undefined}
                columnFilter={false}
            />
            <Divider />
            <ListComponent
                searchCriteria={{ objectId: visitId }}
                dataModel={StatusHistoryDetailExtraModelV2}
                headerData={statusHistoryHeaderData}
                searchable={false}
                triggerDelete={undefined}
                triggerSoftDelete={undefined}
                columnFilter={false}
            />
        </>
    );
};

export { VisitorDetailsExtra };
