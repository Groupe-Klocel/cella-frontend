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

import { FC, useMemo, useState } from 'react';
import { Button, Modal, Space, Tag, Tooltip } from 'antd';
import { ModeEnum } from 'generated/graphql';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import {
    getModesFromPermissions,
    getTruckTypeCodes,
    getVisitStatusCodes,
    getVisitStatusConfig,
    getVisitTypeCode,
    getVisitZoneLabel,
    pathParams,
    showError,
    showSuccess,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { VisitorModelV2 as model } from '@helpers';
import { visitorsRoutes as itemRoutes } from 'modules/Visitors/Static/visitorsRoutes';
import { checkOutVisit, cancelVisit } from 'modules/Visitors/Functions/visitorActions';
import { gql } from 'graphql-request';
import { ActionButtons, HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { AppHead, LinkButton } from '@components';
import {
    EyeTwoTone,
    LoginOutlined,
    LogoutOutlined,
    PrinterOutlined,
    StopOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/router';

type PageComponent = FC & { layout: typeof MainLayout };

const VisitorsPage: PageComponent = () => {
    const { permissions, configs, parameters } = useAppState();
    const { t } = useTranslation();
    const router = useRouter();
    const modes = getModesFromPermissions(permissions, 'wm_visitors');
    const checkInModes = getModesFromPermissions(permissions, 'wm_visitor-check-in');
    const checkOutModes = getModesFromPermissions(permissions, 'wm_visitor-check-out');
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [triggerRefresh, setTriggerRefresh] = useState<boolean>(false);
    const [onSiteOnly, setOnSiteOnly] = useState<boolean>(false);
    const { graphqlRequestClient } = useAuth();
    const language = router.locale ?? 'en-US';

    const visitTypeCode = useMemo(() => getVisitTypeCode(configs), [configs]);
    const visitStatuses = useMemo(() => getVisitStatusCodes(configs), [configs]);

    const searchCriteria = useMemo(() => {
        // never mix truck appointments into the visitor list: filtering on the
        // Visit type code is a locked criteria
        const criteria: any = { appointmentType: visitTypeCode };
        if (onSiteOnly && visitStatuses.checkedIn) {
            criteria.status = visitStatuses.checkedIn;
        }
        return criteria;
    }, [visitTypeCode, onSiteOnly, visitStatuses]);

    const printEvacuationList = async () => {
        if (!visitTypeCode || !visitStatuses.checkedIn) {
            showError(t('messages:error-getting-data'));
            return;
        }
        const query = gql`
            query onSiteVisitors($filters: AppointmentSearchFilters) {
                appointments(
                    filters: $filters
                    orderBy: [{ field: "extraText1", ascending: true }]
                    itemsPerPage: 1000
                ) {
                    results {
                        id
                        name
                        driverName
                        entityName
                        contactName
                        allowedZones
                        escortRequired
                        extraText1
                    }
                }
            }
        `;
        try {
            const result = await graphqlRequestClient.request(query, {
                filters: { appointmentType: visitTypeCode, status: visitStatuses.checkedIn }
            });
            const visitors = result?.appointments?.results ?? [];
            const printedAt = new Date().toLocaleString(language);
            const rows = visitors
                .map((visitor: any) => {
                    const zones = Array.isArray(visitor.allowedZones)
                        ? visitor.allowedZones
                              .map((zone: string) => getVisitZoneLabel(parameters, zone, language))
                              .join(', ')
                        : '';
                    const entryTime = visitor.extraText1
                        ? new Date(visitor.extraText1).toLocaleString(language)
                        : '';
                    return `<tr>
                        <td>${visitor.name ?? ''}</td>
                        <td>${visitor.driverName ?? ''}</td>
                        <td>${visitor.entityName ?? ''}</td>
                        <td>${visitor.contactName ?? ''}</td>
                        <td>${zones}</td>
                        <td>${visitor.escortRequired ? t('common:yes') : t('common:no')}</td>
                        <td>${entryTime}</td>
                    </tr>`;
                })
                .join('');
            const html = `<!DOCTYPE html><html><head><title>${t('common:evacuation-list')}</title>
                <style>
                    body { font-family: sans-serif; padding: 24px; }
                    h1 { font-size: 20px; }
                    p { margin: 4px 0 16px 0; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #333; padding: 6px 8px; text-align: left; font-size: 12px; }
                    th { background: #eee; }
                </style></head><body>
                <h1>${t('common:evacuation-list')}</h1>
                <p>${t('common:printed-at')}: ${printedAt} — ${t('common:total')}: ${visitors.length}</p>
                <table><thead><tr>
                    <th>${t('d:reference')}</th>
                    <th>${t('d:visitor-name')}</th>
                    <th>${t('d:company')}</th>
                    <th>${t('d:internal-referent')}</th>
                    <th>${t('d:allowed-zones')}</th>
                    <th>${t('d:escortRequired')}</th>
                    <th>${t('d:checked-in-date')}</th>
                </tr></thead><tbody>${rows}</tbody></table>
                </body></html>`;
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(html);
                printWindow.document.close();
                printWindow.focus();
                printWindow.print();
            }
        } catch (error) {
            console.error('Error printing evacuation list:', error);
            showError(t('messages:error-getting-data'));
        }
    };

    const headerData: HeaderData = {
        title: t('common:visitors'),
        routes: itemRoutes,
        actionsComponent: (
            <Space>
                <Button
                    type={onSiteOnly ? 'primary' : 'default'}
                    onClick={() => setOnSiteOnly((current) => !current)}
                >
                    {t('common:on-site-now')}
                </Button>
                <Button icon={<PrinterOutlined />} onClick={printEvacuationList}>
                    <span style={{ marginLeft: 8 }}>{t('actions:print-on-site-visitors')}</span>
                </Button>
                {modes.length > 0 && modes.includes(ModeEnum.Create) ? (
                    <LinkButton
                        title={t('actions:pre-register-visitor')}
                        path={`${rootPath}/add`}
                        type="primary"
                    />
                ) : null}
            </Space>
        )
    };

    const confirmCheckOut = (record: any) => {
        return () => {
            Modal.confirm({
                title: t('messages:check-out-confirm'),
                onOk: async () => {
                    try {
                        await checkOutVisit(
                            graphqlRequestClient,
                            record,
                            visitStatuses.checkedOut!
                        );
                        showSuccess(t('messages:success-updated'));
                        setTriggerRefresh((current) => !current);
                    } catch (error) {
                        console.error('Error during check-out:', error);
                        showError(t('messages:error-update-data'));
                    }
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        };
    };

    const confirmCancel = (record: any) => {
        return () => {
            Modal.confirm({
                title: t('messages:cancel-visit-confirm'),
                onOk: async () => {
                    try {
                        await cancelVisit(graphqlRequestClient, record, visitStatuses.cancelled!);
                        showSuccess(t('messages:success-updated'));
                        setTriggerRefresh((current) => !current);
                    } catch (error) {
                        console.error('Error cancelling visit:', error);
                        showError(t('messages:error-update-data'));
                    }
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        };
    };

    const actionButtons: ActionButtons = {
        actionsComponent: null
    };

    return (
        <>
            <AppHead title={headerData.title} />
            {visitTypeCode !== undefined ? (
                <ListComponent
                    key={onSiteOnly ? 'on-site' : 'all'}
                    searchCriteria={searchCriteria}
                    headerData={headerData}
                    dataModel={model}
                    actionButtons={actionButtons}
                    triggerDelete={{ idToDelete, setIdToDelete }}
                    triggerSoftDelete={{ idToDisable, setIdToDisable }}
                    actionColumns={[
                        {
                            title: 'd:status',
                            key: 'visitStatus',
                            render: (record: { status: number }) => {
                                const statusConfig = getVisitStatusConfig(configs, record.status);
                                return (
                                    <Tag color={statusConfig?.extras?.color}>
                                        {statusConfig?.translation?.[language] ??
                                            statusConfig?.value ??
                                            record.status}
                                    </Tag>
                                );
                            }
                        },
                        {
                            title: 'd:allowed-zones',
                            key: 'allowedZones',
                            render: (record: { allowedZones?: string[] }) =>
                                Array.isArray(record.allowedZones)
                                    ? record.allowedZones
                                          .map((zone: string) =>
                                              getVisitZoneLabel(parameters, zone, language)
                                          )
                                          .join(', ')
                                    : ''
                        },
                        {
                            title: 'actions:actions',
                            key: 'actions',
                            render: (record: { id: string; status: number }) => (
                                <Space>
                                    {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                                        <LinkButton
                                            icon={<EyeTwoTone />}
                                            path={pathParams(`${rootPath}/[id]`, record.id)}
                                        />
                                    ) : null}
                                    {checkInModes.includes(ModeEnum.Read) &&
                                    (record.status === visitStatuses.toBeChecked ||
                                        record.status === visitStatuses.preRegistered) ? (
                                        <LinkButton
                                            icon={<LoginOutlined />}
                                            tooltip={t('actions:visitor-check-in')}
                                            path={pathParams(
                                                `${rootPath}/check-in/[id]`,
                                                record.id
                                            )}
                                        />
                                    ) : null}
                                    {checkOutModes.includes(ModeEnum.Update) &&
                                    record.status === visitStatuses.checkedIn ? (
                                        <Tooltip
                                            placement="top"
                                            title={t('actions:visitor-check-out')}
                                            align={{ offset: [0, 0] }}
                                            overlayStyle={{ pointerEvents: 'none' }}
                                        >
                                            <Button
                                                icon={<LogoutOutlined />}
                                                onClick={confirmCheckOut(record)}
                                            />
                                        </Tooltip>
                                    ) : null}
                                    {modes.includes(ModeEnum.Update) &&
                                    (record.status === visitStatuses.toBeChecked ||
                                        record.status === visitStatuses.preRegistered) ? (
                                        <Button
                                            icon={<StopOutlined />}
                                            danger
                                            title={t('actions:cancel')}
                                            onClick={confirmCancel(record)}
                                        />
                                    ) : null}
                                </Space>
                            )
                        }
                    ]}
                    routeDetailPage={`${rootPath}/:id`}
                    refetch={triggerRefresh}
                />
            ) : null}
        </>
    );
};

VisitorsPage.layout = MainLayout;

export default VisitorsPage;
