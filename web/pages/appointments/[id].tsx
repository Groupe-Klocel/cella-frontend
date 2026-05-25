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

import { AppHead, LinkButton, SinglePrintModalV2 } from '@components';
import { getModesFromPermissions, showError, showSuccess } from '@helpers';
import { useRouter } from 'next/router';
import { FC, useEffect, useMemo, useState } from 'react';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { AppointmentModelV2 as model } from '@helpers';
import { Button, Modal, Space } from 'antd';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { ModeEnum } from 'generated/graphql';
import { appointmentsRoutes as itemRoutes } from 'modules/Appointments/Static/appointmentsRoutes';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';
import { AppointmentDetailsExtra } from 'modules/Appointments/Elements/AppointmentDetailsExtra';

type PageComponent = FC & { layout: typeof MainLayout };
const AppointmentPage: PageComponent = () => {
    const router = useRouter();
    const { parameters, permissions } = useAppState();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [reopenInfo, setReopenInfo] = useState<any | undefined>();
    const { id } = router.query;
    const [triggerRefresh, setTriggerRefresh] = useState<boolean>(false);
    const { graphqlRequestClient } = useAuth();
    const [showSinglePrintModal, setShowSinglePrintModal] = useState(false);
    const [idToPrint, setIdToPrint] = useState<string>();
    const [configsAppointment, setConfigAppointments] = useState<any>([]);
    const [documentAttachmentsData, setDocumentAttachmentsData] = useState<any>();

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

    const configsParamsCodes = useMemo(() => {
        const findextrasByScopeAndCode = (items: any[], scope: string, value: string) => {
            return items.find((item: any) => item.scope === scope && item.code === value).extras;
        };

        const defaultAppointmentDocuments = findextrasByScopeAndCode(
            parameters,
            'documents',
            'default_appointment_documents'
        );

        return {
            defaultAppointmentDocuments
        };
    }, [parameters]);

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

    // #region to customize information
    const breadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.name}`
        }
    ];

    const pageTitle = `${t('common:appointment')} ${data?.name}`;

    // #endregions

    //#region : Specific functions for this page
    function getValidNextStatuses(currentStatus: number): number[] {
        switch (currentStatus) {
            case appointmentStatuses.appointmentStatusInCreation:
                return [appointmentStatuses.appointmentStatusSubmitted];
            case appointmentStatuses.appointmentStatusSubmitted:
                return [appointmentStatuses.appointmentStatusConfirmed];
            case appointmentStatuses.appointmentStatusConfirmed:
                return [
                    appointmentStatuses.appointmentStatusOnSite,
                    appointmentStatuses.appointmentStatusNoShow
                ];
            case appointmentStatuses.appointmentStatusOnSite:
                return [appointmentStatuses.appointmentStatusArrivedAtDock];
            case appointmentStatuses.appointmentStatusArrivedAtDock:
                return [appointmentStatuses.appointmentStatusLoadingStarted];
            case appointmentStatuses.appointmentStatusLoadingStarted:
                return [appointmentStatuses.appointmentStatusLoadingFinished];
            case appointmentStatuses.appointmentStatusLoadingFinished:
                return [appointmentStatuses.appointmentStatusCompleted];
            default:
                return [];
        }
    }

    function getConfigByCode(code: number): any {
        return configsAppointment?.find((config: any) => parseInt(config.code, 10) === code);
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

    function getNextStatus(status: number) {
        const validNextStatuses = getValidNextStatuses(status);
        return validNextStatuses.length > 0 ? validNextStatuses[0] : status;
    }

    const switchNextStatus = async (id: string, currentStatus: number, nextStatus?: number) => {
        const newStatus = nextStatus ?? getNextStatus(currentStatus);
        const updateVariables = {
            id: id,
            input: {
                status: newStatus
            }
        };

        const updateMutation = gql`
            mutation updateAppointment($id: String!, $input: UpdateAppointmentInput!) {
                updateAppointment(id: $id, input: $input) {
                    id
                    name
                    status
                }
            }
        `;

        const result = await graphqlRequestClient.request(updateMutation, updateVariables);
        if (result) {
            setTriggerRefresh(!triggerRefresh);
        }
        return result;
    };

    useEffect(() => {
        const fetchAppointmentConfigs = async () => {
            const configs = await getConfigsByScope('appointment_status');
            if (configs) {
                setConfigAppointments(configs);
            }
        };
        fetchAppointmentConfigs();
    }, []);

    // #region handle standard buttons according to Model (can be customized when additional buttons are needed)
    const rootPath = itemRoutes[itemRoutes.length - 1].path;

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

    const headerData: HeaderData = {
        title: pageTitle,
        routes: breadCrumb,
        onBackRoute: rootPath,
        actionsComponent:
            data?.status !== appointmentStatuses.appointmentStatusCancelled ? (
                <Space>
                    {modes.length > 0 &&
                    modes.includes(ModeEnum.Update) &&
                    model.isEditable &&
                    getValidNextStatuses(data?.status).length > 0 ? (
                        <Space>
                            {getValidNextStatuses(data?.status).map((nextStatusCode: number) => {
                                const nextStatusConfig = getConfigByCode(nextStatusCode);
                                const buttonActionCode = getButtonActionCode(nextStatusCode);
                                return (
                                    <Button
                                        key={nextStatusConfig?.id}
                                        onClick={() =>
                                            switchNextStatus(data.id, data.status, nextStatusCode)
                                        }
                                        style={{
                                            borderColor: nextStatusConfig?.extras?.color,
                                            color: nextStatusConfig?.extras?.color
                                        }}
                                    >
                                        {t(`actions:${buttonActionCode}`)}
                                    </Button>
                                );
                            })}
                        </Space>
                    ) : (
                        <></>
                    )}
                    {modes.length > 0 &&
                    modes.includes(ModeEnum.Read) &&
                    data?.status >= appointmentStatuses.appointmentStatusConfirmed ? (
                        <>
                            <Button
                                type="primary"
                                onClick={() => {
                                    if (data) {
                                        setShowSinglePrintModal(true);
                                        setIdToPrint(data.loadId);
                                        console.log(data);
                                    } else {
                                        showError(t('messages:to-be-defined'));
                                    }
                                }}
                            >
                                {t('actions:print')}
                            </Button>
                        </>
                    ) : (
                        <></>
                    )}
                    {modes.length > 0 &&
                    modes.includes(ModeEnum.Update) &&
                    model.isEditable &&
                    data?.status != null &&
                    !isFinalStatus(data.status) ? (
                        <LinkButton
                            title={t('actions:edit')}
                            path={`${rootPath}/edit/${id}`}
                            type="primary"
                        />
                    ) : (
                        <></>
                    )}
                    {modes.length > 0 &&
                    modes.includes(ModeEnum.Update) &&
                    model.isSoftDeletable &&
                    data?.status != null &&
                    !isFinalStatus(data.status) ? (
                        <Button
                            onClick={() => confirmAction(id as string, setIdToDisable, 'disable')()}
                            style={{
                                borderColor: getConfigByCode(
                                    appointmentStatuses.appointmentStatusCancelled
                                )?.extras?.color,
                                color: getConfigByCode(
                                    appointmentStatuses.appointmentStatusCancelled
                                )?.extras?.color
                            }}
                        >
                            {t('actions:cancel')}
                        </Button>
                    ) : (
                        <></>
                    )}
                    {modes.length > 0 &&
                    modes.includes(ModeEnum.Delete) &&
                    model.isDeletable &&
                    data?.status <= appointmentStatuses.appointmentStatusInCreation ? (
                        <Button
                            onClick={() => confirmAction(id as string, setIdToDelete, 'delete')()}
                        >
                            {t('actions:delete')}
                        </Button>
                    ) : (
                        <></>
                    )}
                    <SinglePrintModalV2
                        showModal={{
                            showSinglePrintModal,
                            setShowSinglePrintModal
                        }}
                        dataToPrint={{ id: idToPrint }}
                        allDocumentName={configsParamsCodes.defaultAppointmentDocuments}
                        documentReference={data?.name}
                        customLanguage={data?.printLanguage ?? undefined}
                        documentAttachmentsData={documentAttachmentsData}
                    />
                </Space>
            ) : (
                <></>
            )
    };

    return (
        <>
            <AppHead title={headerData.title} />
            <ItemDetailComponent
                extraDataComponent={
                    <AppointmentDetailsExtra
                        appointmentId={id}
                        appointmentName={data?.name}
                        stockOwnerId={data?.stockOwnerId}
                        stockOwnerName={data?.stockOwner_name}
                        carrierId={data?.carrierId}
                        status={data?.status}
                        setDocumentAttachmentsData={setDocumentAttachmentsData}
                    />
                }
                headerData={headerData}
                id={id!}
                dataModel={model}
                setData={setData}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                triggerReopen={{ reopenInfo, setReopenInfo }}
                refetch={triggerRefresh}
            />
        </>
    );
};

export default AppointmentPage;

AppointmentPage.layout = MainLayout;
