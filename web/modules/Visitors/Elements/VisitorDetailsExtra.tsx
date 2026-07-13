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
import { Card, Descriptions, Divider, Tag } from 'antd';
import { useRouter } from 'next/router';
import {
    formatUTCLocaleDateTime,
    getVisitZoneLabel,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { StatusHistoryDetailExtraModelV2 } from '@helpers';
import { useAppState } from 'context/AppContext';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';

export interface IVisitorDetailsExtraProps {
    visitId?: string | string[];
    extras?: any;
}

const VisitorDetailsExtra: FC<IVisitorDetailsExtraProps> = ({
    visitId,
    extras
}: IVisitorDetailsExtraProps) => {
    const { t } = useTranslation();
    const router = useRouter();
    const { parameters } = useAppState();
    const language = router.locale ?? 'en-US';

    const safetyChecklist = extras?.safetyChecklist;
    const signature = extras?.visitorSignature;

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
                        {safetyChecklist?.accepted === true ? (
                            <Tag color="green">{t('common:yes')}</Tag>
                        ) : (
                            <Tag color="red">{t('common:no')}</Tag>
                        )}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('d:acceptance-language')}>
                        {safetyChecklist?.language ?? '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('d:acceptance-date')}>
                        {safetyChecklist?.acceptedAt
                            ? formatUTCLocaleDateTime(safetyChecklist.acceptedAt, router.locale)
                            : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('d:allowed-zones')}>
                        {Array.isArray(safetyChecklist?.zones)
                            ? safetyChecklist.zones
                                  .map((zone: string) =>
                                      getVisitZoneLabel(parameters, zone, language)
                                  )
                                  .join(', ')
                            : '-'}
                    </Descriptions.Item>
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
                </Descriptions>
            </Card>
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
