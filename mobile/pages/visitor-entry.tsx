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

// Tablet rendering. The step machine, the polling and every onClick are unchanged; the shell around
// the steps is the kiosk skin — KioskProvider (bigger antd tokens, Required / Optional field tags on
// step 30, dvh viewport fix, phone variant), KioskProgress, KioskRecap and a sticky KioskActionBar
// with the back action on the left and the forward action on the right — all from
// modules/Common/Kiosk/KioskSkin.tsx (shared with the truck kiosk). RadioButtonWrapper /
// RadioInfosHeader are not used here (their 10 px sizing is for RF handhelds).

import { PageContentWrapper, HeaderContent, ContentSpin } from '@components';
import { FC, useEffect, useMemo, useState } from 'react';
import MainLayout from 'components/layouts/MainLayout';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Button, Form, Popconfirm } from 'antd';
import {
    ArrowLeftOutlined,
    ArrowRightOutlined,
    CheckOutlined,
    IdcardOutlined,
    SearchOutlined,
    UndoOutlined,
    UserOutlined
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
import { SelectVisitorLanguage } from 'modules/VisitorManagement/PagesContainer/SelectVisitorLanguage';
import { SearchVisitForm } from 'modules/VisitorManagement/Forms/SearchVisitForm';
import { VisitorRegistrationForm } from 'modules/VisitorManagement/Forms/VisitorRegistrationForm';
import { VisitorSafetyChecklistForm } from 'modules/VisitorManagement/Forms/VisitorSafetyChecklistForm';
import { VisitorSignatureForm } from 'modules/VisitorManagement/Forms/VisitorSignatureForm';
import { VisitorWaitingScreen } from 'modules/VisitorManagement/PagesContainer/VisitorWaitingScreen';
import { VisitorResultScreen } from 'modules/VisitorManagement/PagesContainer/VisitorResultScreen';
import { resolveVisitStatusCodes } from 'modules/VisitorManagement/types';

const POLL_INTERVAL_MS = 2500;
const TIMEOUT_MS = 15 * 60 * 1000;
const processName = 'visitorEntry';

// 10 -> Select language (de-DE / en-US)
// 20 -> Search visit (or walk-in)
// 30 -> Registration form
// 40 -> Safety checklists (one per zone)
// 50 -> Signature + submit
// 60 -> Waiting (polling)
// 70 -> Result (approved / refused)

type PageComponent = FC & { layout: typeof MainLayout };

const VisitorEntry: PageComponent = () => {
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
    // Visit status codes from the configs reducer (no extra request).
    const statusCodes = useMemo(() => resolveVisitStatusCodes(configs ?? []), [configs]);

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

    // "I don't have an appointment": walk-in visit, straight to registration.
    const onWalkIn = () => {
        dispatch({
            type: 'UPDATE_BY_STEP',
            processName,
            stepName: 'step20',
            object: { previousStep: currentStep, data: { visit: null, isWalkIn: true } },
            customFields: [{ key: 'currentStep', value: 30 }]
        });
    };
    //#endregion

    //#region polling for the security desk's decision (step 60)
    const visitId: string | undefined = storedObject['step50']?.data?.visitId;
    useEffect(() => {
        if (currentStep !== 60 || !visitId) return;
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
                        query visitorVisitStatus($id: String!) {
                            appointment(id: $id) {
                                status
                                denyReason
                                escortRequired
                            }
                        }
                    `,
                    { id: visitId }
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
                if (statusCodes.checkedIn && res.status === statusCodes.checkedIn) {
                    advance({
                        decision: 'approved',
                        escortRequired:
                            res.escortRequired ??
                            storedObject['step20']?.data?.visit?.escortRequired ??
                            false
                    });
                } else if (
                    (statusCodes.cancelled && res.status === statusCodes.cancelled) ||
                    res.denyReason
                ) {
                    advance({ decision: 'refused', denyReason: res.denyReason ?? null });
                }
            } catch (e) {
                // transient error -> keep polling
            }
        }, POLL_INTERVAL_MS);

        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentStep, visitId, statusCodes]);
    //#endregion

    //#region recap (found visit / registered visitor)
    const visit = storedObject['step20']?.data?.visit;
    const showRecap = currentStep >= 30 && currentStep < 70;
    const recapRefNumber: string | null = showRecap ? (visit?.name ?? null) : null;
    const recapVisitorName: string | null = showRecap
        ? (storedObject['step30']?.data?.registration?.visitorName ?? visit?.driverName ?? null)
        : null;
    //#endregion

    //#region module buttons
    // Secondary actions (back, walk-in) render on the left of the sticky bar, the single forward
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
            key: 'walk-in',
            label: t('common:no-appointment'),
            variant: 'ghost',
            visibleOnSteps: [20],
            onClick: onWalkIn,
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
            // enabled once something has been drawn (VisitorSignatureForm reports it)
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
            <KioskProvider requiredMarks={currentStep === 30} className={`step-${currentStep}`}>
                <HeaderContent
                    title={t('common:visitor-title')}
                    actionsRight={
                        showReset ? (
                            // a big, readable "start over" needs a confirmation: a visitor tapping it
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
                                key: 'visitor',
                                icon: <UserOutlined />,
                                label: t('common:visitor-name'),
                                value: recapVisitorName
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
                        <SelectVisitorLanguage processName={processName} stepNumber={10} />
                    )}
                    {currentStep === 20 && (
                        <SearchVisitForm
                            processName={processName}
                            stepNumber={20}
                            formToUse={form}
                        />
                    )}
                    {currentStep === 30 && (
                        <VisitorRegistrationForm
                            processName={processName}
                            stepNumber={30}
                            formToUse={form}
                        />
                    )}
                    {currentStep === 40 && (
                        <VisitorSafetyChecklistForm
                            processName={processName}
                            stepNumber={40}
                            formToUse={form}
                        />
                    )}
                    {currentStep === 50 && (
                        <VisitorSignatureForm
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
                    {currentStep === 60 && (
                        <VisitorWaitingScreen timedOut={timedOut} onCancel={onReset} />
                    )}
                    {currentStep === 70 && (
                        <VisitorResultScreen
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

VisitorEntry.layout = MainLayout;

export default VisitorEntry;
