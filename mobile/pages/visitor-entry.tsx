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

import {
    PageContentWrapper,
    HeaderContent,
    RadioInfosHeader,
    NavButton,
    ContentSpin
} from '@components';
import { FC, useEffect, useMemo, useState } from 'react';
import MainLayout from 'components/layouts/MainLayout';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Form, Space } from 'antd';
import { UndoOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import { gql } from 'graphql-request';
import { RadioButtonWrapper, ButtonConfig } from 'helpers/utils/radioButtonWrapper';
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

    const currentStep: number = storedObject.currentStep ?? 10;
    // Visit status codes from the configs reducer (no extra request).
    const statusCodes = useMemo(() => resolveVisitStatusCodes(configs ?? []), [configs]);

    // The kiosk relies on the connected user; redirect to login if none.
    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.replace('/login');
        }
    }, [loading, isAuthenticated, router]);

    // Reset the form whenever the step changes.
    useEffect(() => {
        form.resetFields();
    }, [currentStep, form]);

    //#region global buttons
    const onReset = () => {
        dispatch({ type: 'DELETE_RF_PROCESS', processName });
        setTimedOut(false);
        form.resetFields();
    };

    const onBack = () => {
        dispatch({
            type: 'ON_BACK',
            processName,
            stepToReturn: `step${storedObject[`step${currentStep}`]?.previousStep ?? 10}`
        });
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

    //#region RadioInfosHeader recap (found visit / registered visitor)
    const headerDisplay: { [k: string]: any } = {};
    const visit = storedObject['step20']?.data?.visit;
    if (currentStep >= 30 && currentStep < 70) {
        if (visit?.name) headerDisplay[t('common:ref-number')] = visit.name;
        const visitorName =
            storedObject['step30']?.data?.registration?.visitorName ?? visit?.driverName;
        if (visitorName) headerDisplay[t('common:visitor-name')] = visitorName;
    }
    //#endregion

    //#region module buttons
    const buttonManagement: ButtonConfig[] = [
        {
            label: t('common:search'),
            visibleOnSteps: [20],
            onClick: () => form.submit(),
            position: 'bottom'
        },
        {
            label: t('common:no-appointment'),
            visibleOnSteps: [20],
            onClick: onWalkIn,
            position: 'bottom'
        },
        {
            label: t('common:next'),
            visibleOnSteps: [30, 40],
            onClick: () => form.submit(),
            position: 'bottom'
        },
        {
            label: t('common:validate-signature'),
            visibleOnSteps: [50],
            onClick: () => {
                if (!isSubmitting) setTriggerSubmitSignature(true);
            },
            position: 'bottom'
        },
        {
            label: t('common:back'),
            visibleOnSteps: [30, 40, 50],
            onClick: onBack,
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
            <HeaderContent
                title={t('common:visitor-title')}
                actionsRight={
                    showReset ? (
                        <Space>
                            <NavButton icon={<UndoOutlined />} onClick={onReset}></NavButton>
                        </Space>
                    ) : undefined
                }
            />
            {Object.keys(headerDisplay).length > 0 && (
                <RadioInfosHeader input={{ displayed: headerDisplay }} />
            )}

            <RadioButtonWrapper buttonManagement={buttonManagement} currentStep={currentStep}>
                {currentStep === 10 && (
                    <SelectVisitorLanguage processName={processName} stepNumber={10} />
                )}
                {currentStep === 20 && (
                    <SearchVisitForm processName={processName} stepNumber={20} formToUse={form} />
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
            </RadioButtonWrapper>
        </PageContentWrapper>
    );
};

VisitorEntry.layout = MainLayout;

export default VisitorEntry;
