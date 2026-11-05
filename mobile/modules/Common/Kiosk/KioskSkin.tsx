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

// Tablet "kiosk skin" shared by the two kiosk flows, truck gate (/gate-entry) and
// visitor check-in (/visitor-entry).
//
// The flows reuse the RF-handheld infrastructure (RadioButtonWrapper 10 px buttons, StyledFormItem
// 2 px margins, DetailsList 10 px recap), which is sized for a 4-inch scanner. On the reception
// tablet (landscape) that reads small and gives no cue about what is mandatory or which button goes
// forward. Everything tablet-specific lives HERE so the shared RF components stay untouched:
//   - KioskProvider: antd ConfigProvider (bigger tokens, Required/Optional field tags) plus scoped
//     CSS overrides under `.kiosk-root`, the dvh viewport fix and the phone (portrait) variant
//   - KioskActionBar: sticky bottom bar, secondary actions on the left / primary action on the right
//   - KioskProgress: 4-step progress header (identify / details / safety / signature)
//   - KioskRecap: readable recap line (replaces the 10 px RadioInfosHeader)
// The page passes a `step-NN` class so step-specific layout (two-column form on step 30) stays CSS,
// plus `kiosk-gate` on the truck kiosk for its 13-language grid.
// Labels come from the DB translations (category `common`): mandatory, optional, visitor-step-*
// (generic wording, reused by both kiosks), restart-confirm, yes, no, signature-hint.

import { Button, ConfigProvider, Steps, Tag } from 'antd';
import type { FormProps } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { Fragment, ReactNode, useEffect, useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { ButtonConfig } from 'helpers/utils/radioButtonWrapper';

// Accent colours: the same gold -> orange gradient the RF buttons already use
// (helpers/utils/radioButtonWrapper.tsx, GateEntry/Elements/GateButton.tsx). The mobile theme
// exposes no token for it yet, hence the constants; change them here and the whole skin follows.
export const KIOSK_GOLD = '#f5c73d';
const KIOSK_ORANGE = '#f4a261';

// MainLayout's StyledMainLayout is `height: 100vh`. On a tablet browser 100vh is the LARGE viewport
// (URL bar hidden), so with the URL bar showing the layout overflows the visible area and the sticky
// action bar ends up below the fold. `dvh` tracks the visible viewport; browsers without it keep the
// first declaration. Injected as a plain <style> (same mechanism as radioButtonWrapper.tsx) so it only
// applies while the kiosk page is mounted and the shared layout file stays untouched.
const KIOSK_VIEWPORT_FIX = `
    #__next > .ant-layout {
        height: 100vh;
        height: 100dvh;
    }
`;

// Phones (portrait) get a compact variant of the skin; the tablet (1280 px landscape) never matches
// this query, so everything outside the @media block below is the tablet rendering, unchanged.
export const PHONE_QUERY = '(max-width: 768px)';

// True on a phone-sized viewport. Starts false (server render, no hydration mismatch) and follows the
// media query on the client. The CSS side of the variant is the @media block in KioskRoot; this hook
// only drives what CSS cannot reach (antd tokens, Steps size).
export const useIsPhone = (): boolean => {
    const [isPhone, setIsPhone] = useState(false);
    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;
        const mq = window.matchMedia(PHONE_QUERY);
        const update = () => setIsPhone(mq.matches);
        update();
        // Older Safari / Android WebViews only implement the deprecated addListener/removeListener
        // pair; calling addEventListener there throws and would take the kiosk page down.
        if (typeof mq.addEventListener === 'function') {
            mq.addEventListener('change', update);
            return () => mq.removeEventListener('change', update);
        }
        mq.addListener(update);
        return () => mq.removeListener(update);
    }, []);
    return isPhone;
};

//#region provider + scoped CSS
const KioskRoot = styled.div`
    display: flex;
    flex-direction: column;
    /* the app header is 40 px high; keep the action bar at the bottom even on short steps.
       dvh = the viewport actually visible (mobile URL bar shown or not); vh is the fallback */
    min-height: calc(100vh - 40px);
    min-height: calc(100dvh - 40px);
    font-size: 18px;
    /* Safety net against a child wider than the screen. Deliberately clip with NO hidden fallback:
       hidden would make this root a scroll container, and the sticky action bar would then stick to
       the bottom of the root's content instead of the visible viewport (broken on the long documents
       step). Browsers without clip simply ignore the line; nothing rendered here overflows sideways
       today (the phone progress replaced the wide antd Steps). */
    overflow-x: clip;

    .kiosk-body {
        flex: 1 1 auto;
        width: 100%;
        max-width: 1100px;
        margin: 0 auto;
        padding: 4px 32px 16px;
    }

    /* shared page title (HeaderContent -> CustomPageHeader) */
    .custom-header {
        padding: 6px 32px 0;
    }
    .custom-header h4.ant-typography {
        font-size: 26px !important;
    }

    /* undo the handheld compaction: StyledFormItem (margin 2px !important) and globals.css
       (label padding-bottom 0 !important) */
    .ant-form-item {
        margin: 0 0 14px 0 !important;
    }
    .ant-form-item .ant-form-item-label {
        padding-bottom: 4px !important;
    }
    .ant-form-item .ant-form-item-label > label {
        font-size: 18px;
        font-weight: 600;
        line-height: 1.3;
        height: auto !important;
    }
    .ant-form-item-explain-error {
        font-size: 16px;
        margin-top: 4px;
    }
    /* the legacy antd-4 asterisk (public/light-theme.css) is replaced by the Required/Optional
       tags rendered through ConfigProvider.form.requiredMark */
    &.kiosk-required-marks .ant-form-item-label > label.ant-form-item-required::before {
        display: none !important;
    }
    /* read-only recap fields of a pre-registered visit carry no tag */
    .ant-form-item:has(.ant-input-disabled, .ant-input[disabled]) .kiosk-field-tag {
        display: none;
    }

    .ant-input,
    textarea.ant-input,
    .ant-input-affix-wrapper,
    .ant-input-affix-wrapper > input.ant-input,
    .ant-select-selector,
    .ant-select-selection-item,
    .ant-select-selection-placeholder {
        font-size: 18px;
    }
    /* control heights are pinned here: the legacy antd-4 sheet (public/light-theme.css) ties
       antd 5's :where() rules on specificity and can win the tie; this scoped selector outranks both */
    .ant-input:not(textarea) {
        height: 52px;
        padding: 8px 14px;
    }
    textarea.ant-input {
        padding: 12px 14px;
    }
    .ant-input-affix-wrapper {
        min-height: 52px;
        padding: 0 14px;
    }
    .ant-input-affix-wrapper > input.ant-input {
        height: 50px;
        padding: 0;
    }
    .ant-select-single:not(.ant-select-customize-input) .ant-select-selector {
        height: 52px !important;
        padding: 0 14px;
    }
    .ant-select-single .ant-select-selector .ant-select-selection-item,
    .ant-select-single .ant-select-selector .ant-select-selection-placeholder {
        line-height: 50px !important;
    }
    .ant-select-multiple .ant-select-selector {
        min-height: 52px;
        padding: 4px 10px;
    }
    .ant-select-multiple .ant-select-selection-item {
        height: 36px;
        line-height: 34px;
        font-size: 17px;
    }
    .ant-input-number {
        width: 100%;
        font-size: 18px;
    }
    .ant-input-number .ant-input-number-input {
        height: 50px;
        font-size: 18px;
    }
    /* dropdown / popconfirm render inside this root (ConfigProvider.getPopupContainer) */
    .ant-select-item {
        font-size: 18px;
        min-height: 48px;
        line-height: 38px;
    }
    .ant-popconfirm-message-title {
        font-size: 18px;
    }
    .ant-popconfirm-buttons .ant-btn {
        height: 44px;
        padding: 0 20px;
        font-size: 17px;
    }
    .ant-btn:not(.kiosk-btn):not(.ant-popconfirm-buttons .ant-btn) {
        height: 52px;
        font-size: 18px;
        padding: 0 20px;
    }
    /* the antd-4 sheet paints type="primary" blue (VisitorWaitingScreen timeout button) */
    .ant-btn-primary:not(.kiosk-btn) {
        background: radial-gradient(circle, ${KIOSK_GOLD} 70%, ${KIOSK_ORANGE} 100%) !important;
        border-color: ${KIOSK_GOLD} !important;
        color: #000000 !important;
    }
    .ant-checkbox-wrapper {
        font-size: 18px;
    }
    .ant-checkbox-inner {
        width: 26px !important;
        height: 26px !important;
    }
    /* tick proportions for a 26 px box (antd 5 formula: size/14*5 by size/14*8) */
    .ant-checkbox-inner::after {
        width: 9.3px;
        height: 14.9px;
    }
    .ant-divider-inner-text {
        font-size: 18px;
        color: #595959;
    }
    .ant-alert {
        padding: 14px 18px;
    }
    .ant-alert-message {
        font-size: 18px;
        font-weight: 600;
    }
    .ant-alert-description {
        font-size: 16px;
    }
    .ant-result-title {
        font-size: 30px;
    }
    .ant-result-subtitle {
        font-size: 20px;
    }
    .ant-steps-item-title {
        font-size: 17px !important;
        line-height: 1.3 !important;
    }
    /* progress colours: house gold instead of antd blue (the legacy sheet paints the active step blue) */
    .ant-steps .ant-steps-item-process > .ant-steps-item-container > .ant-steps-item-icon {
        background-color: ${KIOSK_GOLD};
        border-color: ${KIOSK_GOLD};
    }
    .ant-steps
        .ant-steps-item-process
        > .ant-steps-item-container
        > .ant-steps-item-icon
        .ant-steps-icon {
        color: #000000;
    }
    .ant-steps
        .ant-steps-item-process
        > .ant-steps-item-container
        > .ant-steps-item-content
        > .ant-steps-item-title {
        color: #000000;
        font-weight: 600;
    }
    .ant-steps .ant-steps-item-finish .ant-steps-item-icon {
        background-color: #fef5e1;
        border-color: ${KIOSK_GOLD};
    }
    .ant-steps .ant-steps-item-finish .ant-steps-item-icon > .ant-steps-icon {
        color: #b48a00;
    }
    .ant-steps .ant-steps-item-finish > .ant-steps-item-container > .ant-steps-item-tail::after {
        background-color: ${KIOSK_GOLD};
    }

    /* icon / text spacing on the regular buttons (Start over, Clear); the legacy sheet zeroes it */
    .ant-btn:not(.kiosk-btn) > .anticon + span,
    .ant-btn:not(.kiosk-btn) > .ant-btn-icon + span {
        margin-inline-start: 8px;
    }

    /* signature pad: GateEntry/components/SignaturePad.tsx fixes 200px; its backing store follows
       offsetHeight, so a CSS height is enough. 240px keeps the whole step visible on a 1280x800
       tablet with the browser URL bar showing (~740 px of viewport). */
    canvas {
        height: 240px !important;
    }

    /* step 30 on a landscape tablet: two columns, natural field order */
    &.step-30 .ant-form {
        display: grid;
        grid-template-columns: 1fr 1fr;
        column-gap: 32px;
        align-items: start;
    }
    @media (max-width: 900px) {
        &.step-30 .ant-form {
            grid-template-columns: 1fr;
        }
    }

    /* sizes of the kiosk's own elements live here (not inline) so the phone variant can override them */
    .kiosk-welcome-title.ant-typography {
        font-size: 40px;
        margin-bottom: 8px;
    }
    .kiosk-welcome-subtitle {
        display: block;
        font-size: 22px;
        margin-bottom: 40px;
    }
    .kiosk-lang-btn.ant-btn {
        min-height: 96px;
        font-size: 24px !important;
        border-radius: 12px;
    }
    .kiosk-sign-title {
        font-size: 22px;
        font-weight: 600;
    }
    .kiosk-sign-hint {
        font-size: 16px;
    }
    .kiosk-zone-card {
        border-radius: 12px;
        padding: 20px;
        transition: all 0.15s ease;
    }
    .kiosk-accept-label {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        font-size: 20px;
        font-weight: 600;
        line-height: 1.3;
    }
    .kiosk-progress-phone {
        display: none;
    }
    /* truck kiosk, step 10: thirteen languages in the template's 3-column grid. Sized from here so
       GateEntry/PagesContainer/SelectLanguage.tsx stays a plain synced file. */
    &.kiosk-gate.step-10 .ant-btn {
        min-height: 64px;
        font-size: 20px !important;
        border-radius: 12px;
    }
    &.kiosk-gate.step-10 h2.ant-typography {
        font-size: 34px;
    }
    &.kiosk-gate.step-10 .ant-typography-secondary {
        font-size: 20px !important;
    }

    /* ---------- phone (portrait) variant: compact sizes, stacked action bar ---------- */
    @media ${PHONE_QUERY} {
        .kiosk-body {
            padding: 4px 16px 12px;
        }
        .custom-header {
            padding: 4px 16px 0;
        }
        .custom-header h4.ant-typography {
            font-size: 22px !important;
        }
        /* antd Steps with vertical labels has fixed-width items that overflow 390 px: the phone
           gets the compact dots + current step title instead */
        .kiosk-progress-tablet {
            display: none;
        }
        .kiosk-progress-phone {
            display: block;
        }
        .kiosk-recap {
            font-size: 15px;
            padding: 8px 12px;
            gap: 6px 20px;
        }
        .ant-form-item {
            margin: 0 0 12px 0 !important;
        }
        .ant-form-item .ant-form-item-label > label {
            font-size: 16px;
        }
        .ant-input,
        textarea.ant-input,
        .ant-input-affix-wrapper,
        .ant-input-affix-wrapper > input.ant-input,
        .ant-select-selector,
        .ant-select-selection-item,
        .ant-select-selection-placeholder {
            font-size: 16px;
        }
        .ant-input:not(textarea) {
            height: 46px;
        }
        .ant-input-affix-wrapper {
            min-height: 46px;
        }
        .ant-input-affix-wrapper > input.ant-input {
            height: 44px;
        }
        .ant-select-single:not(.ant-select-customize-input) .ant-select-selector {
            height: 46px !important;
        }
        .ant-select-single .ant-select-selector .ant-select-selection-item,
        .ant-select-single .ant-select-selector .ant-select-selection-placeholder {
            line-height: 44px !important;
        }
        .ant-select-multiple .ant-select-selector {
            min-height: 46px;
        }
        .ant-input-number,
        .ant-input-number .ant-input-number-input {
            font-size: 16px;
        }
        .ant-input-number .ant-input-number-input {
            height: 44px;
        }
        &.kiosk-gate.step-10 .ant-btn {
            min-height: 56px;
            font-size: 18px !important;
        }
        /* the template's inline grid (minmax(170px, 1fr)) drops to one column at 390 px; two
           columns keep the thirteen languages on one screen */
        &.kiosk-gate.step-10 div[style*='grid-template-columns'] {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10px !important;
        }
        &.kiosk-gate.step-10 h2.ant-typography {
            font-size: 26px;
        }
        &.kiosk-gate.step-10 .ant-typography-secondary {
            font-size: 16px !important;
        }
        .ant-btn:not(.kiosk-btn):not(.ant-popconfirm-buttons .ant-btn) {
            height: 46px;
            font-size: 16px;
            padding: 0 16px;
        }
        .ant-alert {
            padding: 10px 12px;
        }
        .ant-alert-message {
            font-size: 16px;
        }
        .ant-alert-description {
            font-size: 14px;
        }
        /* primary action full width on top, secondary (Back) full width below */
        .kiosk-action-bar {
            flex-direction: column-reverse;
            align-items: stretch;
            gap: 10px;
            padding: 10px 16px;
        }
        .kiosk-action-bar > div {
            flex-direction: column;
            align-items: stretch;
        }
        .kiosk-action-bar > div:empty {
            display: none;
        }
        .kiosk-action-bar .kiosk-btn.ant-btn {
            width: 100%;
            min-width: 0;
            min-height: 54px;
            font-size: 18px;
            padding: 0 18px;
        }
        .kiosk-welcome-title.ant-typography {
            font-size: 30px;
        }
        .kiosk-welcome-subtitle {
            font-size: 17px;
            margin-bottom: 24px;
        }
        .kiosk-lang-btn.ant-btn {
            min-height: 68px;
            font-size: 20px !important;
        }
        canvas {
            height: 200px !important;
        }
        .kiosk-sign-title {
            font-size: 18px;
        }
        .kiosk-sign-hint {
            font-size: 14px;
        }
        .kiosk-zone-card {
            padding: 14px;
        }
        .kiosk-accept-label {
            font-size: 16px;
            gap: 8px;
        }
    }
`;

// `&&` outranks the legacy .ant-tag margins.
const FieldTag = styled(Tag)`
    && {
        margin-inline-start: 10px;
        margin-inline-end: 0;
        font-size: 13px;
        line-height: 22px;
        padding: 0 10px;
        border-radius: 6px;
        font-weight: 600;
        vertical-align: middle;
    }
`;

export interface IKioskProviderProps {
    // Render a Required / Optional tag after every form label (step 30).
    requiredMarks?: boolean;
    className?: string;
    children: ReactNode;
}

export const KioskProvider = ({
    requiredMarks = false,
    className,
    children
}: IKioskProviderProps) => {
    const { t } = useTranslation();
    const isPhone = useIsPhone();
    // Popups (Select dropdown, Popconfirm) render inside the kiosk root so the scoped CSS reaches them.
    const rootRef = useRef<HTMLDivElement>(null);

    // A new step (the page passes `step-NN` as className) starts at the top: the scroll container is
    // the app's Layout.Content, which otherwise keeps the previous step's scroll offset.
    useEffect(() => {
        const scroller = rootRef.current?.closest('.ant-layout-content') as HTMLElement | null;
        if (scroller) scroller.scrollTop = 0;
    }, [className]);

    const requiredMark: NonNullable<FormProps['requiredMark']> = (label, { required }) => (
        <>
            {label}
            <FieldTag className="kiosk-field-tag" color={required ? 'red' : 'default'}>
                {required ? t('common:mandatory') : t('common:optional')}
            </FieldTag>
        </>
    );

    const classes = ['kiosk-root', requiredMarks ? 'kiosk-required-marks' : '', className ?? '']
        .filter(Boolean)
        .join(' ');

    return (
        <ConfigProvider
            theme={{
                token: {
                    fontSize: isPhone ? 16 : 18,
                    controlHeight: isPhone ? 46 : 52,
                    borderRadius: 8,
                    colorPrimary: KIOSK_GOLD,
                    colorPrimaryHover: '#e3b52a'
                }
            }}
            form={requiredMarks ? { requiredMark } : undefined}
            getPopupContainer={() => rootRef.current ?? document.body}
        >
            <style>{KIOSK_VIEWPORT_FIX}</style>
            <KioskRoot ref={rootRef} className={classes}>
                {children}
            </KioskRoot>
        </ConfigProvider>
    );
};
//#endregion

//#region action bar
export type KioskButtonVariant = 'primary' | 'secondary' | 'ghost';

// Same declaration shape as the RF pages (ButtonConfig), plus the visual role of the button.
export interface KioskButton extends ButtonConfig {
    variant: KioskButtonVariant;
    disabled?: boolean;
    loading?: boolean;
}

const Bar = styled.div`
    position: sticky;
    bottom: 0;
    z-index: 20;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding: 14px 32px;
    background: #ffffff;
    border-top: 1px solid #e8e8e8;
    box-shadow: 0 -6px 18px rgba(0, 0, 0, 0.06);
`;

const Group = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
`;

// `&&&` outranks both antd's :where() rules and the legacy public/light-theme.css without !important.
const BarButton = styled(Button)<{ $variant: KioskButtonVariant }>`
    &&& {
        min-height: 64px;
        height: auto;
        min-width: 220px;
        padding: 0 28px;
        font-size: 20px;
        font-weight: 600;
        border-radius: 12px;
        white-space: normal;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        transition: all 0.1s ease;
    }
    &&& .anticon {
        font-size: 22px;
    }
    ${({ $variant }) =>
        $variant === 'primary' &&
        css`
            &&& {
                background: radial-gradient(circle, ${KIOSK_GOLD} 70%, ${KIOSK_ORANGE} 100%);
                border: 1px solid ${KIOSK_GOLD};
                color: #000000;
                box-shadow: inset 0 1px 0 0 #f9eca0;
            }
            &&&:hover,
            &&&:focus-visible {
                background: ${KIOSK_GOLD};
                border-color: ${KIOSK_GOLD};
                color: #000000;
            }
        `}
    ${({ $variant }) =>
        $variant === 'secondary' &&
        css`
            &&& {
                background: #ffffff;
                border: 2px solid #595959;
                color: #262626;
                box-shadow: none;
            }
            &&&:hover,
            &&&:focus-visible {
                background: #fafafa;
                border-color: #262626;
                color: #000000;
            }
        `}
    ${({ $variant }) =>
        $variant === 'ghost' &&
        css`
            &&& {
                background: transparent;
                border: 1px solid transparent;
                color: #434343;
                text-decoration: underline;
                text-underline-offset: 4px;
                box-shadow: none;
                min-width: 0;
                font-weight: 500;
            }
            &&&:hover,
            &&&:focus-visible {
                background: #fafafa;
                color: #000000;
            }
        `}
    &&&:active {
        transform: translateY(1px);
        box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.3);
    }
    &&&:disabled,
    &&&.ant-btn-loading {
        background: #f5f5f5;
        border-color: #d9d9d9;
        color: rgba(0, 0, 0, 0.25);
        box-shadow: none;
        transform: none;
    }
`;

export interface IKioskActionBarProps {
    buttons: KioskButton[];
    currentStep: number;
}

export const KioskActionBar = ({ buttons, currentStep }: IKioskActionBarProps) => {
    const visible = buttons.filter(
        (b) =>
            b.visibleOnSteps.includes(currentStep) &&
            (b.permissionsToSeeTheButton === undefined || b.permissionsToSeeTheButton)
    );
    if (visible.length === 0) return null;

    const render = (b: KioskButton, index: number) => (
        <BarButton
            key={b.key ?? `${b.variant}-${index}`}
            $variant={b.variant}
            className={`kiosk-btn kiosk-btn-${b.variant}`}
            icon={b.icon}
            // the forward action reads "label -> arrow", the others "arrow <- label"
            iconPosition={b.variant === 'primary' ? 'end' : 'start'}
            onClick={b.onClick}
            disabled={b.disabled}
            loading={b.loading}
        >
            {b.label}
        </BarButton>
    );

    return (
        <Bar className="kiosk-action-bar">
            <Group>{visible.filter((b) => b.variant !== 'primary').map(render)}</Group>
            <Group>{visible.filter((b) => b.variant === 'primary').map(render)}</Group>
        </Bar>
    );
};
//#endregion

//#region progress
export interface KioskStep {
    step: number;
    key: string;
}

// Both kiosks show the same four steps; the `visitor-step-*` wording is generic (identification,
// your details, safety rules, signature) so the truck kiosk reuses the rows instead of adding keys.
export const DEFAULT_KIOSK_STEPS: KioskStep[] = [
    { step: 20, key: 'common:visitor-step-identify' },
    { step: 30, key: 'common:visitor-step-details' },
    { step: 40, key: 'common:visitor-step-safety' },
    { step: 50, key: 'common:visitor-step-signature' }
];

const ProgressWrap = styled.div`
    width: 100%;
    max-width: 900px;
    margin: 0 auto 8px;
    padding: 0 32px;
`;

// Phone variant: 4 small dots joined by lines plus the current step's title. antd Steps cannot be
// made narrow enough for a 390 px screen without fighting its fixed label widths.
const PhoneProgress = styled.div`
    width: 100%;
    padding: 2px 16px 0;
    margin: 0 auto 8px;
    .kiosk-dots {
        display: flex;
        align-items: center;
    }
    .kiosk-dot {
        flex: none;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 600;
        background: #f0f0f0;
        border: 2px solid #f0f0f0;
        color: #8c8c8c;
    }
    .kiosk-dot.is-active {
        background: ${KIOSK_GOLD};
        border-color: ${KIOSK_GOLD};
        color: #000000;
    }
    .kiosk-dot.is-done {
        background: #fef5e1;
        border-color: ${KIOSK_GOLD};
        color: #b48a00;
    }
    .kiosk-line {
        flex: 1 1 auto;
        height: 2px;
        margin: 0 6px;
        background: #e8e8e8;
    }
    .kiosk-line.is-done {
        background: ${KIOSK_GOLD};
    }
    .kiosk-step-label {
        margin-top: 6px;
        text-align: center;
        font-size: 14px;
        font-weight: 600;
        color: #262626;
    }
`;

export interface IKioskProgressProps {
    currentStep: number;
    steps?: KioskStep[];
}

export const KioskProgress = ({
    currentStep,
    steps = DEFAULT_KIOSK_STEPS
}: IKioskProgressProps) => {
    const { t } = useTranslation();
    const current = steps.findIndex((s) => s.step === currentStep);
    // language choice, waiting and result screens carry no progress header
    if (current < 0) return null;
    return (
        <>
            <ProgressWrap className="kiosk-progress kiosk-progress-tablet">
                <Steps
                    current={current}
                    labelPlacement="vertical"
                    // never let antd switch to its vertical layout on narrow screens
                    responsive={false}
                    items={steps.map((s) => ({ title: t(s.key) }))}
                />
            </ProgressWrap>
            <PhoneProgress className="kiosk-progress kiosk-progress-phone">
                <div className="kiosk-dots">
                    {steps.map((s, i) => (
                        <Fragment key={s.step}>
                            {i > 0 && (
                                <span className={`kiosk-line${i <= current ? ' is-done' : ''}`} />
                            )}
                            <span
                                className={`kiosk-dot${
                                    i < current ? ' is-done' : i === current ? ' is-active' : ''
                                }`}
                            >
                                {i < current ? <CheckOutlined /> : i + 1}
                            </span>
                        </Fragment>
                    ))}
                </div>
                <div className="kiosk-step-label">
                    {current + 1}/{steps.length} · {t(steps[current].key)}
                </div>
            </PhoneProgress>
        </>
    );
};
//#endregion

//#region recap
const RecapWrap = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 12px 36px;
    margin: 0 0 12px;
    padding: 12px 20px;
    background: #fef5e1;
    border-radius: 10px;
    font-size: 18px;
    .anticon {
        margin-right: 8px;
        color: #8c6d1f;
    }
`;

export interface KioskRecapItem {
    key: string;
    icon?: ReactNode;
    label: string;
    value?: string | null;
}

export interface IKioskRecapProps {
    items: KioskRecapItem[];
}

export const KioskRecap = ({ items }: IKioskRecapProps) => {
    const shown = items.filter((i) => !!i.value);
    if (shown.length === 0) return null;
    return (
        <RecapWrap className="kiosk-recap">
            {shown.map((i) => (
                <span key={i.key}>
                    {i.icon}
                    <b>{i.label}</b>: {i.value}
                </span>
            ))}
        </RecapWrap>
    );
};
//#endregion
