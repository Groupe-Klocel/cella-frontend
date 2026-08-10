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

import { FC, ComponentType, useEffect, useMemo, useState } from 'react';
import { Button, Modal, Space } from 'antd';
import { ModeEnum } from 'generated/graphql';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import {
    getModesFromPermissions,
    getTruckTypeCodes,
    getVisitTypeCode,
    isCarrierAppointmentUser,
    pathParams,
    resolveAppointmentStatusCodes,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { AppointmentModelV2 as model } from '@helpers';
import { appointmentsRoutes as itemRoutes } from 'modules/Appointments/Static/appointmentsRoutes';
import { NoShowReasonModal } from 'modules/Appointments/Elements/NoShowReasonModal';
import { gql } from 'graphql-request';
import { ActionButtons, HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { AppHead, LinkButton } from '@components';
import {
    AimOutlined,
    CalendarOutlined,
    CarOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    DeleteOutlined,
    DislikeOutlined,
    EyeTwoTone,
    FileAddOutlined,
    FileExclamationOutlined,
    QuestionCircleOutlined,
    SendOutlined,
    StopOutlined,
    ThunderboltOutlined,
    TrophyOutlined
} from '@ant-design/icons';

type PageComponent = FC & { layout: typeof MainLayout };

const AppointmentsPages: PageComponent = () => {
    const { permissions, configs } = useAppState();
    const { t } = useTranslation();
    const modes = getModesFromPermissions(permissions, model.tableName);
    // carrier users can only advance an appointment up to "Submitted" and cannot cancel/delete
    // Resolved from AppContext configs through the shared helper. Used ONLY for the newer
    // statuses: the existing switch arms keep using the PascalCase map so this stays additive.
    const statusCodes = useMemo(() => resolveAppointmentStatusCodes(configs), [configs]);

    const isCarrier = isCarrierAppointmentUser(permissions);
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [triggerRefresh, setTriggerRefresh] = useState<boolean>(false);
    const [configsAppointment, setConfigAppointments] = useState<any>([]);
    // pending no-show transition awaiting its reason (see NoShowReasonModal)
    const [noShowInfo, setNoShowInfo] = useState<{ ids: [string]; currentStatus: number } | null>(
        null
    );
    const { graphqlRequestClient } = useAuth();

    // visits (type Visit) never appear in the truck appointment list: when the
    // Visit type is configured, the list is locked to the truck type codes
    const visitTypeCode = useMemo(() => getVisitTypeCode(configs), [configs]);
    const truckSearchCriteria = useMemo(
        () => (visitTypeCode !== undefined ? { appointmentType: getTruckTypeCodes(configs) } : {}),
        [configs, visitTypeCode]
    );

    const ICON_MAP: Record<string, ComponentType<any>> = {
        FileAddOutlined,
        SendOutlined,
        CalendarOutlined,
        CarOutlined,
        AimOutlined,
        ThunderboltOutlined,
        CheckCircleOutlined,
        TrophyOutlined,
        DislikeOutlined,
        QuestionCircleOutlined,
        StopOutlined,
        ClockCircleOutlined,
        FileExclamationOutlined
    };

    const getConfigsByScope = async (scope: string) => {
        const query = gql`
            query configs($filters: ConfigSearchFilters) {
                configs(filters: $filters) {
                    results {
                        id
                        value
                        code
                        translation
                        extras
                    }
                }
            }
        `;

        const variables = {
            filters: {
                scope
            }
        };

        const configsResult = await graphqlRequestClient.request(query, variables);
        return configsResult?.configs?.results;
    };

    const appointmentStatuses = useMemo(() => {
        const statusMap: Record<string, number> = {};
        if (configsAppointment && configsAppointment.length > 0) {
            configsAppointment.forEach((config: any) => {
                const statusName = config.value
                    .split(/\s+/)
                    .map(
                        (word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    )
                    .join('');
                statusMap[`appointmentStatus${statusName}`] = parseInt(config.code, 10);
            });
        }
        return statusMap;
    }, [configsAppointment]);

    function getConfigByCode(code: number): any {
        return configsAppointment?.find((config: any) => parseInt(config.code, 10) === code);
    }

    useEffect(() => {
        const fetchAppointmentConfigs = async () => {
            const configs = await getConfigsByScope('appointment_status');
            if (configs) {
                setConfigAppointments(configs);
            }
        };
        fetchAppointmentConfigs();
    }, []);

    const headerData: HeaderData = {
        title: t('common:appointments'),
        routes: itemRoutes,
        actionsComponent: (
            <Space>
                {modes.length > 0 && modes.includes(ModeEnum.Create) ? (
                    <LinkButton
                        title={t('actions:add2', { name: t('common:appointment') })}
                        path={`${rootPath}/add`}
                        type="primary"
                    />
                ) : null}
            </Space>
        )
    };

    const confirmAction = (info: any | undefined, setInfo: any, action: 'delete' | 'disable') => {
        return () => {
            const titre =
                action == 'delete' ? 'messages:delete-confirm' : 'messages:disable-confirm';
            Modal.confirm({
                title: t(titre),
                onOk: () => {
                    setInfo(info);
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        };
    };

    function getValidNextStatuses(currentStatus: number): number[] {
        // `.filter(Number.isFinite)` at every return: a status the warehouse has not created
        // resolves to undefined, which used to render a button with action code 'to-be-defined'
        // that sent `status: undefined`.
        switch (currentStatus) {
            case appointmentStatuses.appointmentStatusInCreation:
                return [
                    appointmentStatuses.appointmentStatusSubmitted,
                    appointmentStatuses.appointmentStatusCancelled
                ].filter(Number.isFinite);
            case appointmentStatuses.appointmentStatusSubmitted:
                return [
                    appointmentStatuses.appointmentStatusConfirmed,
                    appointmentStatuses.appointmentStatusCancelled
                ].filter(Number.isFinite);
            case appointmentStatuses.appointmentStatusConfirmed:
                return [
                    appointmentStatuses.appointmentStatusOnSite,
                    statusCodes.onSiteWaiting,
                    appointmentStatuses.appointmentStatusNoShow,
                    appointmentStatuses.appointmentStatusCancelled
                ].filter(Number.isFinite) as number[];
            // Parked in the yard: the guard can still clear it for a dock, mark a no-show or cancel.
            case statusCodes.onSiteWaiting:
                return [
                    appointmentStatuses.appointmentStatusOnSite,
                    appointmentStatuses.appointmentStatusNoShow,
                    appointmentStatuses.appointmentStatusCancelled
                ].filter(Number.isFinite);
            // Blocked on paperwork: the only way forward is back into the gate queue. Deliberately
            // recoverable — the deny itself is a gate action that requires a reason, so it is only
            // ever set from the gate screen, never from a bare list button.
            case statusCodes.documentsPending:
                return [appointmentStatuses.appointmentStatusConfirmed].filter(Number.isFinite);
            case appointmentStatuses.appointmentStatusOnSite:
                return [appointmentStatuses.appointmentStatusArrivedAtDock].filter(Number.isFinite);
            case appointmentStatuses.appointmentStatusArrivedAtDock:
                return [appointmentStatuses.appointmentStatusLoadingStarted];
            case appointmentStatuses.appointmentStatusLoadingStarted:
                return [appointmentStatuses.appointmentStatusLoadingFinished];
            case appointmentStatuses.appointmentStatusLoadingFinished:
                return [appointmentStatuses.appointmentStatusCompleted].filter(Number.isFinite);
            default:
                return [];
        }
    }

    function getButtonActionCode(nextStatusCode: number): string {
        switch (nextStatusCode) {
            case appointmentStatuses.appointmentStatusSubmitted:
                return 'submit';
            case appointmentStatuses.appointmentStatusConfirmed:
                return 'confirm';
            case appointmentStatuses.appointmentStatusOnSite:
                return 'mark-on-site-appointment';
            case appointmentStatuses.appointmentStatusArrivedAtDock:
                return 'arrived-at-dock-appointment';
            case appointmentStatuses.appointmentStatusLoadingStarted:
                return 'start-loading-appointment';
            case appointmentStatuses.appointmentStatusLoadingFinished:
                return 'finish-loading-appointment';
            case appointmentStatuses.appointmentStatusCompleted:
                return 'complete-appointment';
            case appointmentStatuses.appointmentStatusCancelled:
                return 'cancel';
            case appointmentStatuses.appointmentStatusNoShow:
                return 'mark-no-show-appointment';
            case statusCodes.onSiteWaiting:
                return 'mark-waiting-appointment';
            case statusCodes.documentsPending:
                return 'return-to-gate-queue';
            default:
                return 'to-be-defined';
        }
    }

    function isFinalStatus(status: number): boolean {
        return [
            appointmentStatuses.appointmentStatusCancelled,
            appointmentStatuses.appointmentStatusCompleted,
            appointmentStatuses.appointmentStatusNoShow
        ].includes(status);
    }

    const switchNextStatus = async (
        ids: [string],
        currentStatus: number,
        nextStatus?: number,
        extraInput?: Record<string, any>
    ) => {
        const newStatus = nextStatus ?? getValidNextStatuses(currentStatus)[0] ?? currentStatus;
        const updateVariables = {
            ids,
            input: {
                status: newStatus,
                ...(extraInput ?? {})
            }
        };

        const updateMutation = gql`
            mutation updateAppointments($ids: [String!]!, $input: UpdateAppointmentInput!) {
                updateAppointments(ids: $ids, input: $input)
            }
        `;

        try {
            const result = await graphqlRequestClient.request(updateMutation, updateVariables);
            setTriggerRefresh((current) => !current);
            return result;
        } catch (error) {
            console.error('Error updating order:', error);
        }
    };

    const confirmSwitchStatus = (ids: [string], currentStatus: number, nextStatus: number) => {
        const buttonActionCode = getButtonActionCode(nextStatus);
        // no-show requires a reason (like a refusal): go through the reason
        // modal instead of a plain confirm
        if (nextStatus === appointmentStatuses.appointmentStatusNoShow) {
            return () => setNoShowInfo({ ids, currentStatus });
        }
        return () => {
            Modal.confirm({
                title: t(`messages:${buttonActionCode}`),
                content: t(`actions:${buttonActionCode}`),
                onOk: () => switchNextStatus(ids, currentStatus, nextStatus),
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        };
    };

    const actionButtons: ActionButtons = {
        actionsComponent: modes.length > 0 && modes.includes(ModeEnum.Update) ? <></> : null
    };

    return (
        <>
            <AppHead title={headerData.title} />
            <NoShowReasonModal
                open={noShowInfo !== null}
                t={t}
                onCancel={() => setNoShowInfo(null)}
                onConfirm={async (reason) => {
                    if (noShowInfo) {
                        await switchNextStatus(
                            noShowInfo.ids,
                            noShowInfo.currentStatus,
                            appointmentStatuses.appointmentStatusNoShow,
                            // stored in the same field as a cancellation/refusal reason
                            { denyReason: reason }
                        );
                    }
                    setNoShowInfo(null);
                }}
            />
            <ListComponent
                searchCriteria={truckSearchCriteria}
                headerData={headerData}
                dataModel={model}
                actionButtons={actionButtons}
                rowSelection={{}}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: { id: string; status: number; extraStatus1: number }) => (
                            <Space>
                                {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                                    <LinkButton
                                        icon={<EyeTwoTone />}
                                        path={pathParams(`${rootPath}/[id]`, record.id)}
                                    />
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Update) &&
                                model.isEditable &&
                                getValidNextStatuses(record.status).length > 0 ? (
                                    <Space>
                                        {getValidNextStatuses(record.status)
                                            .filter(
                                                (ns: number) =>
                                                    ns !==
                                                    appointmentStatuses.appointmentStatusCancelled
                                            )
                                            .map((nextStatusCode: number) => {
                                                // a carrier can only advance up to "Submitted"
                                                if (
                                                    isCarrier &&
                                                    nextStatusCode !==
                                                        appointmentStatuses.appointmentStatusSubmitted
                                                ) {
                                                    return null;
                                                }
                                                const nextStatusConfig =
                                                    getConfigByCode(nextStatusCode);
                                                const IconComp = nextStatusConfig
                                                    ? ICON_MAP[nextStatusConfig?.extras?.icon]
                                                    : null;
                                                const color = nextStatusConfig?.extras?.color;
                                                const buttonActionCode =
                                                    getButtonActionCode(nextStatusCode);
                                                const btnKey = `${record.id}-${nextStatusCode}-${nextStatusConfig?.id ?? ''}`;
                                                return (
                                                    <Button
                                                        key={btnKey}
                                                        onClick={() =>
                                                            confirmSwitchStatus(
                                                                [record.id],
                                                                record.status,
                                                                nextStatusCode
                                                            )()
                                                        }
                                                        title={t(`actions:${buttonActionCode}`)}
                                                        aria-label={t(
                                                            `actions:${buttonActionCode}`
                                                        )}
                                                        style={{
                                                            borderColor: color,
                                                            color
                                                        }}
                                                        icon={IconComp ? <IconComp /> : undefined}
                                                    />
                                                );
                                            })}
                                    </Space>
                                ) : (
                                    <></>
                                )}
                                {!isCarrier &&
                                modes.length > 0 &&
                                modes.includes(ModeEnum.Update) &&
                                model.isSoftDeletable &&
                                record.status != null &&
                                !isFinalStatus(record.status) ? (
                                    (() => {
                                        const cancelConfig = getConfigByCode(
                                            appointmentStatuses.appointmentStatusCancelled
                                        );
                                        const CancelIconComp = cancelConfig
                                            ? ICON_MAP[cancelConfig?.extras?.icon]
                                            : null;
                                        return (
                                            <Button
                                                icon={
                                                    CancelIconComp ? <CancelIconComp /> : undefined
                                                }
                                                onClick={() =>
                                                    confirmAction(
                                                        record.id as string,
                                                        setIdToDisable,
                                                        'disable'
                                                    )()
                                                }
                                                title={t('actions:cancel')}
                                                aria-label={t('actions:cancel')}
                                                style={{
                                                    borderColor: cancelConfig?.extras?.color,
                                                    color: cancelConfig?.extras?.color
                                                }}
                                            />
                                        );
                                    })()
                                ) : (
                                    <></>
                                )}
                                {!isCarrier &&
                                modes.length > 0 &&
                                modes.includes(ModeEnum.Delete) &&
                                model.isDeletable &&
                                record.status <= appointmentStatuses.appointmentStatusInCreation ? (
                                    <Button
                                        icon={<DeleteOutlined />}
                                        danger
                                        onClick={() =>
                                            confirmAction(record.id, setIdToDelete, 'delete')()
                                        }
                                    ></Button>
                                ) : (
                                    <></>
                                )}
                            </Space>
                        )
                    }
                ]}
                routeDetailPage={`${rootPath}/:id`}
                checkbox={true}
                refetch={triggerRefresh}
            />
        </>
    );
};

AppointmentsPages.layout = MainLayout;

export default AppointmentsPages;
