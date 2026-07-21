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

import { AppHead, LinkButton, SinglePrintDocumentSetModal } from '@components';
import {
    getModesFromPermissions,
    showError,
    showSuccess,
    isCarrierAppointmentUser
} from '@helpers';
import { useRouter } from 'next/router';
import { FC, useEffect, useMemo, useState } from 'react';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { AppointmentModelV2 as model } from '@helpers';
import { Button, Modal, Select, Space } from 'antd';
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
    // [id] is a single dynamic segment; normalize defensively (Next can type it as string[])
    const id = Array.isArray(router.query.id) ? router.query.id[0] : router.query.id;
    const [triggerRefresh, setTriggerRefresh] = useState<boolean>(false);
    const { graphqlRequestClient } = useAuth();
    const [showSinglePrintModal, setShowSinglePrintModal] = useState(false);
    const [idToPrint, setIdToPrint] = useState<string>();
    const [configsAppointment, setConfigAppointments] = useState<any>([]);
    const [documentAttachmentsData, setDocumentAttachmentsData] = useState<any>();
    // document set for the print modal, resolved from the DOCUMENT_LIST rule for the printed
    // load (same as the load print) instead of a static config list.
    const [defaultLoadDocuments, setDefaultLoadDocuments] = useState<any>();
    // the generic detail hook flattens the record, which destroys the `content` JSON object
    // (it becomes content_palettes_XX / content_instructions). Fetch it raw for the composition.
    const [contentData, setContentData] = useState<any>();

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

    const isCarrier = isCarrierAppointmentUser(permissions);

    // "docs & references" validation status, backed by parameter scope appointment_extra_status1.
    // On confirmation it is forced to "Not OK"; a (non-carrier) user flips it to "OK" once they've
    // checked the carrier filled everything in and attached the documents.
    const extraStatusParams = useMemo(
        () =>
            (parameters ?? [])
                .filter((p: any) => p.scope === 'appointment_extra_status1')
                .map((p: any) => ({ code: parseInt(p.code, 10), value: p.value })),
        [parameters]
    );
    const extraStatusNotOkCode = useMemo(
        () => extraStatusParams.find((p: any) => /not.?ok|non.?ok|ko/i.test(p.value))?.code,
        [extraStatusParams]
    );

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
            breadcrumbName: `${data?.name ?? ''}`
        }
    ];

    const pageTitle = `${t('common:appointment')} ${data?.name ?? ''}`;

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
                status: newStatus,
                // on confirmation, the docs/refs check starts as "Not OK" until a user validates it
                ...(newStatus === appointmentStatuses.appointmentStatusConfirmed &&
                extraStatusNotOkCode != null
                    ? { extraStatus1: extraStatusNotOkCode }
                    : {})
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

    const updateExtraStatus = async (extraStatus1: number) => {
        try {
            await graphqlRequestClient.request(
                gql`
                    mutation updateAppointment($id: String!, $input: UpdateAppointmentInput!) {
                        updateAppointment(id: $id, input: $input) {
                            id
                            extraStatus1
                        }
                    }
                `,
                { id, input: { extraStatus1 } }
            );
            showSuccess(t('messages:success-updated'));
            setTriggerRefresh(!triggerRefresh);
        } catch (e) {
            console.error(e);
            showError(t('messages:error-update-data'));
        }
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

    // fetch the raw `content` JSON (truck composition) — not available via the flattened detail data
    useEffect(() => {
        const fetchContent = async () => {
            if (!id) return;
            const query = gql`
                query appointment($id: String!) {
                    appointment(id: $id) {
                        content
                    }
                }
            `;
            try {
                const result = await graphqlRequestClient.request(query, { id });
                setContentData(result?.appointment?.content ?? undefined);
            } catch (e) {
                console.error(e);
            }
        };
        fetchContent();
    }, [id, triggerRefresh]);

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
                                // a carrier can only advance up to "Submitted" (review/confirm is
                                // done by the internal team)
                                if (
                                    isCarrier &&
                                    nextStatusCode !==
                                        appointmentStatuses.appointmentStatusSubmitted
                                ) {
                                    return null;
                                }
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
                    {!isCarrier &&
                    modes.length > 0 &&
                    modes.includes(ModeEnum.Read) &&
                    data?.status >= appointmentStatuses.appointmentStatusConfirmed ? (
                        <>
                            <Button
                                type="primary"
                                onClick={async () => {
                                    // the load lives on the appointment lines, not on the
                                    // appointment: resolve the first line carrying a load to print
                                    try {
                                        const res = await graphqlRequestClient.request(
                                            gql`
                                                query aptLines(
                                                    $filters: AppointmentLineSearchFilters
                                                ) {
                                                    appointmentLines(
                                                        filters: $filters
                                                        itemsPerPage: 100
                                                    ) {
                                                        results {
                                                            loadId
                                                        }
                                                    }
                                                }
                                            `,
                                            { filters: { appointmentId: id } }
                                        );
                                        const loadId = res?.appointmentLines?.results?.find(
                                            (l: any) => l.loadId
                                        )?.loadId;
                                        if (loadId) {
                                            // resolve the printable document set from the
                                            // DOCUMENT_LIST rule for this appointment (+ the
                                            // printed load's attachments), instead of a static list
                                            const [ruleResult, attachmentsResult] =
                                                await Promise.all([
                                                    graphqlRequestClient.request(
                                                        gql`
                                                            query executeRule($context: JSON!) {
                                                                executeRule(
                                                                    ruleName: "DOCUMENT_LIST"
                                                                    context: $context
                                                                )
                                                            }
                                                        `,
                                                        {
                                                            context: {
                                                                object_name: 'appointment',
                                                                stock_owner:
                                                                    data?.stockOwner_name ??
                                                                    undefined,
                                                                carrier:
                                                                    data?.carrier_name ?? undefined
                                                            }
                                                        }
                                                    ),
                                                    graphqlRequestClient.request(
                                                        gql`
                                                            query documentAttachments(
                                                                $filters: DocumentAttachmentSearchFilters
                                                            ) {
                                                                documentAttachments(
                                                                    filters: $filters
                                                                ) {
                                                                    results {
                                                                        id
                                                                        name
                                                                        description
                                                                    }
                                                                }
                                                            }
                                                        `,
                                                        { filters: { objectId: loadId } }
                                                    )
                                                ]);
                                            setDefaultLoadDocuments(
                                                ruleResult?.executeRule?.document_list?.value
                                            );
                                            setDocumentAttachmentsData(
                                                attachmentsResult?.documentAttachments?.results ??
                                                    []
                                            );
                                            // the appointment document must be generated from the
                                            // appointment id as its context (not the load id); the
                                            // load is only used to gather its document attachments
                                            setIdToPrint(id as string);
                                            setShowSinglePrintModal(true);
                                        } else {
                                            showError(t('messages:no-load-to-print'));
                                        }
                                    } catch (e) {
                                        console.error(e);
                                        showError(t('messages:error-fetching-data'));
                                    }
                                }}
                            >
                                {t('actions:print')}
                            </Button>
                        </>
                    ) : (
                        <></>
                    )}
                    {/* "References complete" validation status: editable by a non-carrier
                        (Weilbach) user from Submitted onward — the carrier can't change it */}
                    {!isCarrier &&
                    modes.length > 0 &&
                    modes.includes(ModeEnum.Update) &&
                    data?.status >= appointmentStatuses.appointmentStatusSubmitted &&
                    extraStatusParams.length > 0 ? (
                        <Space size={4}>
                            <span style={{ whiteSpace: 'nowrap' }}>
                                {t('d:references-complete')}:
                            </span>
                            <Select
                                style={{ minWidth: 150 }}
                                placeholder={t('d:references-complete')}
                                value={data?.extraStatus1 ?? undefined}
                                onChange={(v) => updateExtraStatus(v)}
                                options={extraStatusParams.map((p: any) => ({
                                    value: p.code,
                                    label:
                                        data?.extraStatus1Text && data.extraStatus1 === p.code
                                            ? data.extraStatus1Text
                                            : p.value
                                }))}
                            />
                        </Space>
                    ) : (
                        <></>
                    )}
                    {modes.length > 0 &&
                    modes.includes(ModeEnum.Update) &&
                    model.isEditable &&
                    data?.status != null &&
                    !isFinalStatus(data.status) &&
                    (!isCarrier ||
                        data.status <= appointmentStatuses.appointmentStatusSubmitted) ? (
                        <LinkButton
                            title={t('actions:edit')}
                            path={`${rootPath}/edit/${id}`}
                            type="primary"
                        />
                    ) : (
                        <></>
                    )}
                    {!isCarrier &&
                    modes.length > 0 &&
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
                    {!isCarrier &&
                    modes.length > 0 &&
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
                    <SinglePrintDocumentSetModal
                        showModal={{
                            showSinglePrintModal,
                            setShowSinglePrintModal
                        }}
                        dataToPrint={{ id: idToPrint }}
                        allDocumentName={defaultLoadDocuments}
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
                        appointmentType={data?.appointmentType}
                        stockOwnerId={data?.stockOwnerId}
                        stockOwnerName={data?.stockOwner_name}
                        carrierId={data?.carrierId}
                        status={data?.status}
                        content={contentData}
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
