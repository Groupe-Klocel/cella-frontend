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

// Tablet rendering, same shell as visitor-entry.tsx. The step machine, the polling and every onClick
// are unchanged; the shell around the steps is the kiosk skin — KioskProvider (bigger antd tokens,
// Required / Optional field tags on step 30, dvh viewport fix, phone variant), KioskProgress,
// KioskRecap and a sticky KioskActionBar with the back action on the left and the forward action on
// the right — all from modules/Common/Kiosk/KioskSkin.tsx. RadioButtonWrapper / RadioInfosHeader
// are not used here (their 10 px sizing is for RF handhelds).

import { PageContentWrapper, HeaderContent, ContentSpin } from '@components';
import { FC, useEffect, useMemo, useState } from 'react';
import MainLayout from 'components/layouts/MainLayout';
import {
    resolveAppointmentStatusCodes,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { Button, Form, Popconfirm } from 'antd';
import {
    ArrowLeftOutlined,
    ArrowRightOutlined,
    CheckOutlined,
    IdcardOutlined,
    SearchOutlined,
    TagOutlined,
    UndoOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/router';
import { gql } from 'graphql-request';
import {
    KioskActionBar,
    KioskButton,
    KioskProgress,
    KioskProvider,
    KioskRecap
} from 'modules/Common/Kiosk/KioskSkin';
import { useAuth } from 'context/AuthContext';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { SelectLanguage } from 'modules/GateEntry/PagesContainer/SelectLanguage';
import { SearchAppointmentForm } from 'modules/GateEntry/Forms/SearchAppointmentForm';
import { RegistrationForm } from 'modules/GateEntry/Forms/RegistrationForm';
import { SafetyChecklistForm } from 'modules/GateEntry/Forms/SafetyChecklistForm';
import { SignatureForm } from 'modules/GateEntry/Forms/SignatureForm';
import { WaitingScreen } from 'modules/GateEntry/PagesContainer/WaitingScreen';
import { ResultScreen } from 'modules/GateEntry/PagesContainer/ResultScreen';

const POLL_INTERVAL_MS = 2500;
const TIMEOUT_MS = 15 * 60 * 1000;
const processName = 'gateEntry';

// 10 -> Select language
// 20 -> Search appointment (or ad-hoc)
// 30 -> Registration form
// 40 -> Safety checklist
// 50 -> Signature + submit
// 60 -> Waiting (polling)
// 70 -> Result (approved / refused)

type PageComponent = FC & { layout: typeof MainLayout };

const GateEntry: PageComponent = () => {
    const { t } = useTranslation();
    const router = useRouter();
    const { graphqlRequestClient, isAuthenticated, loading } = useAuth();
    const state = useAppState();
    const dispatch = useAppDispatch();
    const { configs } = state;
    const storedObject = state[processName] || {};
    const [form] = Form.useForm();

    const [triggerSubmitSignature, setTriggerSubmitSignature] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timedOut, setTimedOut] = useState(false);
    // true once something has been drawn on the signature pad (step 50) — gates "Validate"
    const [canSubmitSignature, setCanSubmitSignature] = useState(false);

    const currentStep: number = storedObject.currentStep ?? 10;
    // Status codes from the configs reducer (no extra request). Resolved through the shared
    // helper: a bare /on.?site/i test would also match the "waiting area" status, and the kiosk
    // would tell a driver parked in the yard to drive to a dock.
    const statusCodes = useMemo(() => resolveAppointmentStatusCodes(configs ?? []), [configs]);

    // The kiosk relies on the connected user; redirect to login if none.
    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.replace('/login');
        }
    }, [loading, isAuthenticated, router]);

    // Reset the form (and the signature gate) whenever the step changes.
    useEffect(() => {
        form.resetFields();
        setCanSubmitSignature(false);
    }, [currentStep, form]);

    //#region global buttons
    const onReset = () => {
        dispatch({ type: 'DELETE_RF_PROCESS', processName });
        setTimedOut(false);
        form.resetFields();
    };

    // Return to the step completed just before the current one. The kiosk steps record their
    // entry (with `previousStep` = their own number) only when they COMPLETE, unlike the RF forms
    // which create it on arrival; reading the current step's entry, which does not exist yet,
    // therefore always fell back to step 10 and "Back" restarted the whole flow.
    const onBack = () => {
        const completedBefore = Object.keys(storedObject)
            .filter((k) => /^step\d+$/.test(k))
            .map((k) => Number(k.slice(4)))
            .filter((n) => n < currentStep);
        const stepToReturn = completedBefore.length > 0 ? Math.max(...completedBefore) : 10;
        dispatch({ type: 'ON_BACK', processName, stepToReturn: `step${stepToReturn}` });
        form.resetFields();
    };

    const onAdHoc = () => {
        dispatch({
            type: 'UPDATE_BY_STEP',
            processName,
            stepName: 'step20',
            object: { previousStep: currentStep, data: { appointment: null, isAdHoc: true } },
            customFields: [{ key: 'currentStep', value: 30 }]
        });
    };
    //#endregion

    //#region polling for the security agent's decision (step 60)
    const appointmentId: string | undefined = storedObject['step50']?.data?.appointmentId;
    useEffect(() => {
        if (currentStep !== 60 || !appointmentId) return;
        const start = Date.now();
        setTimedOut(false);

        const id = setInterval(async () => {
            if (Date.now() - start > TIMEOUT_MS) {
                setTimedOut(true);
                clearInterval(id);
                return;
            }
            try {
                const queryRes = await graphqlRequestClient.request(
                    gql`
                        query gateAppointmentStatus($id: String!) {
                            appointment(id: $id) {
                                status
                                denyReason
                                pagerNumber
                                extras
                                location {
                                    name
                                }
                            }
                        }
                    `,
                    { id: appointmentId }
                );
                const res = queryRes?.appointment ?? {};
                const advance = (data: any) => {
                    dispatch({
                        type: 'UPDATE_BY_STEP',
                        processName,
                        stepName: 'step70',
                        object: { previousStep: 60, data },
                        customFields: [{ key: 'currentStep', value: 70 }]
                    });
                    clearInterval(id);
                };
                // Order matters: the documents-pending outcome ALSO sets denyReason, so it has to
                // be tested before the bare denyReason branch or a recoverable driver would be
                // told he was turned away.
                if (
                    statusCodes.documentsPending != null &&
                    res.status === statusCodes.documentsPending
                ) {
                    advance({ decision: 'documents', denyReason: res.denyReason ?? null });
                } else if (
                    statusCodes.onSiteWaiting != null &&
                    res.status === statusCodes.onSiteWaiting
                ) {
                    // Parked in the yard. Give the driver a definite instruction (and the pager
                    // number) instead of leaving the kiosk spinning until the 15-minute timeout —
                    // which would also keep the kiosk out of service for the next driver.
                    advance({
                        decision: 'waiting',
                        // column first, `extras` only for appointments written before it existed
                        pagerNumber: res.pagerNumber ?? res.extras?.gateCheckIn?.pagerNumber ?? null
                    });
                } else if (statusCodes.onSite != null && res.status === statusCodes.onSite) {
                    advance({
                        decision: 'approved',
                        dockName:
                            res.location?.name ??
                            storedObject['step20']?.data?.appointment?.locationName ??
                            null
                    });
                } else if (res.denyReason) {
                    advance({ decision: 'refused', denyReason: res.denyReason });
                }
            } catch (e) {
                // transient error -> keep polling
            }
        }, POLL_INTERVAL_MS);

        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentStep, appointmentId, statusCodes]);
    //#endregion

    //#region recap (found appointment)
    const appointment = storedObject['step20']?.data?.appointment;
    const showRecap = !!appointment && currentStep >= 30 && currentStep < 70;
    const recapType: string | null = showRecap ? (appointment.appointmentTypeText ?? null) : null;
    const recapRefNumber: string | null = showRecap ? (appointment.name ?? null) : null;
    //#endregion

    //#region module buttons
    // Secondary actions (back, ad hoc) render on the left of the sticky bar, the single forward
    // action on the right — position and look tell them apart, not just the label.
    const buttonManagement: KioskButton[] = [
        {
            key: 'back',
            label: t('common:back'),
            icon: <ArrowLeftOutlined />,
            variant: 'secondary',
            visibleOnSteps: [30, 40, 50],
            onClick: onBack,
            position: 'bottom'
        },
        {
            key: 'ad-hoc',
            label: t('common:ad-hoc'),
            variant: 'ghost',
            visibleOnSteps: [20],
            onClick: onAdHoc,
            position: 'bottom'
        },
        {
            key: 'search',
            label: t('common:search'),
            icon: <SearchOutlined />,
            variant: 'primary',
            visibleOnSteps: [20],
            onClick: () => form.submit(),
            position: 'bottom'
        },
        {
            key: 'next',
            label: t('common:next'),
            icon: <ArrowRightOutlined />,
            variant: 'primary',
            visibleOnSteps: [30, 40],
            onClick: () => form.submit(),
            position: 'bottom'
        },
        {
            key: 'validate-signature',
            label: t('common:validate-signature'),
            icon: <CheckOutlined />,
            variant: 'primary',
            visibleOnSteps: [50],
            // enabled once something has been drawn (SignatureForm reports it)
            disabled: !canSubmitSignature,
            loading: isSubmitting,
            onClick: () => {
                if (!isSubmitting) setTriggerSubmitSignature(true);
            },
            position: 'bottom'
        }
    ];
    //#endregion

    if (loading || !isAuthenticated) {
        return (
            <PageContentWrapper>
                <ContentSpin />
            </PageContentWrapper>
        );
    }

    const showReset = currentStep > 10 && currentStep < 60;

    return (
        <PageContentWrapper>
            <KioskProvider
                requiredMarks={currentStep === 30}
                className={`kiosk-gate step-${currentStep}`}
            >
                <HeaderContent
                    title={t('common:title')}
                    actionsRight={
                        showReset ? (
                            // a big, readable "start over" needs a confirmation: a driver tapping it
                            // by mistake would otherwise lose the whole form
                            <Popconfirm
                                title={t('common:restart-confirm')}
                                okText={t('common:yes')}
                                cancelText={t('common:no')}
                                onConfirm={onReset}
                                placement="bottomRight"
                            >
                                <Button
                                    type="text"
                                    icon={<UndoOutlined />}
                                    style={{ fontSize: 17 }}
                                >
                                    {t('common:retry')}
                                </Button>
                            </Popconfirm>
                        ) : undefined
                    }
                />
                <KioskProgress currentStep={currentStep} />

                <div className="kiosk-body">
                    <KioskRecap
                        items={[
                            {
                                key: 'type',
                                icon: <TagOutlined />,
                                label: t('common:type'),
                                value: recapType
                            },
                            {
                                key: 'ref',
                                icon: <IdcardOutlined />,
                                label: t('common:ref-number'),
                                value: recapRefNumber
                            }
                        ]}
                    />
                    {currentStep === 10 && (
                        <SelectLanguage processName={processName} stepNumber={10} />
                    )}
                    {currentStep === 20 && (
                        <SearchAppointmentForm
                            processName={processName}
                            stepNumber={20}
                            formToUse={form}
                        />
                    )}
                    {currentStep === 30 && (
                        <RegistrationForm
                            processName={processName}
                            stepNumber={30}
                            formToUse={form}
                        />
                    )}
                    {currentStep === 40 && (
                        <SafetyChecklistForm
                            processName={processName}
                            stepNumber={40}
                            formToUse={form}
                        />
                    )}
                    {currentStep === 50 && (
                        <SignatureForm
                            processName={processName}
                            stepNumber={50}
                            submitTrigger={{
                                triggerSubmit: triggerSubmitSignature,
                                setTriggerSubmit: setTriggerSubmitSignature
                            }}
                            loading={{ isLoading: isSubmitting, setIsLoading: setIsSubmitting }}
                            onCanSubmitChange={setCanSubmitSignature}
                        />
                    )}
                    {currentStep === 60 && <WaitingScreen timedOut={timedOut} onCancel={onReset} />}
                    {currentStep === 70 && (
                        <ResultScreen
                            processName={processName}
                            onContinue={onReset}
                            onContact={onReset}
                        />
                    )}
                </div>

                <KioskActionBar buttons={buttonManagement} currentStep={currentStep} />
            </KioskProvider>
        </PageContentWrapper>
    );
};

GateEntry.layout = MainLayout;

export default GateEntry;
