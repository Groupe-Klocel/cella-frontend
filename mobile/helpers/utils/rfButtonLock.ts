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
/**
 * RF button lock: one global "the RF module is busy" state for the handheld app.
 *
 * The operator must not be able to start a second action while the one he started still runs,
 * nor while a step validates itself (a scan being checked, an auto-validate step posting its
 * movements). One RF process is on screen at a time on the handheld, so a single module-level
 * store is enough; components subscribe to it with useSyncExternalStore.
 *
 * Two things lock the module:
 *  - a *pressed* action button (RadioButtonWrapper wires every `buttonManagement` entry): it shows
 *    a spinner and every other button is disabled. A press is released by a change of the RF
 *    process state (every successful step dispatches), by an error/warning toast (every failed
 *    step shows one: showMessage in utils.ts emits the 'rf-show-message' event), by the rejection
 *    of the promise the click returned (a failed client-side validation), or by the dead-man
 *    timeout below. In 'auto' mode (the default) a press is also released once the busy
 *    components are gone, or after a short grace period if none ever showed up: a button that
 *    only toggled some local UI must not freeze the module (a scanner submit gets a longer grace,
 *    its check may run without a spinner). In 'hold' mode the press stays until
 *    one of the first three releases: for actions that call the API without rendering a spinner.
 *  - *busy* components: the RF spinners (ContentSpin, HandlingUnitSpin, UpperMobileSpinner)
 *    register themselves while mounted, which is exactly "a step is working". A page can add its
 *    own loading flag with useRfBusy(flag).
 *
 * The whole mechanism is switched off by the warehouse parameter radio / BUTTON_LOCK_ENABLED = '0'
 * (RadioButtonWrapper reads it and calls setEnabled): the store then always reports unlocked.
 *
 * The unlock is delayed by RELEASE_DELAY_MS so that two chained steps (a check that dispatches
 * and the auto-validate mounted right behind it) never show unlocked buttons in between, and a
 * lock never lasts more than DEAD_MAN_MS: a request that hangs must not brick the handheld.
 */
import { useEffect, useSyncExternalStore } from 'react';

export type RfPressMode = 'auto' | 'hold';

export interface RfButtonLockSnapshot {
    /** true while the RF module is busy: every action button has to be disabled */
    isLocked: boolean;
    /** key of the action button whose press started the running action (it shows the spinner) */
    pressedKey: string | null;
}

/** Key credited with a form submit that came from the input itself (scanner / Enter key) */
export const RF_SUBMIT_KEY = 'submit';

const RELEASE_DELAY_MS = 150;
const AUTO_PRESS_GRACE_MS = 500;
/** A scanner submit runs a check that may render no spinner: it gets a longer grace period */
export const SUBMIT_GRACE_MS = 3000;
const DEAD_MAN_MS = 30000;

const UNLOCKED: RfButtonLockSnapshot = { isLocked: false, pressedKey: null };

type Timer = ReturnType<typeof setTimeout> | null;

let enabled = true;
let pressed: { key: string; mode: RfPressMode } | null = null;
let busyCount = 0;
let expired = false;
let snapshot: RfButtonLockSnapshot = UNLOCKED;

let graceTimer: Timer = null;
let releaseTimer: Timer = null;
let deadManTimer: Timer = null;

const listeners = new Set<() => void>();

const stop = (timer: Timer): null => {
    if (timer) clearTimeout(timer);
    return null;
};

const isRawLocked = () => pressed !== null || busyCount > 0;

const publish = () => {
    const next: RfButtonLockSnapshot = {
        isLocked: enabled && isRawLocked() && !expired,
        pressedKey: enabled && !expired && pressed ? pressed.key : null
    };
    if (next.isLocked === snapshot.isLocked && next.pressedKey === snapshot.pressedKey) return;
    snapshot = next;
    listeners.forEach((listener) => listener());
};

// Re-evaluates the lock after any change of `pressed` / `busyCount`
const recompute = () => {
    if (isRawLocked()) {
        // locking (or still locked): a pending unlock is cancelled, the dead-man switch armed once
        releaseTimer = stop(releaseTimer);
        if (!deadManTimer && !expired) {
            deadManTimer = setTimeout(() => {
                deadManTimer = null;
                expired = true;
                publish();
            }, DEAD_MAN_MS);
        }
        publish();
    } else {
        // unlocking: delayed, so that a step chained right behind the previous one keeps the lock
        deadManTimer = stop(deadManTimer);
        expired = false;
        if (!releaseTimer) {
            releaseTimer = setTimeout(() => {
                releaseTimer = null;
                publish();
            }, RELEASE_DELAY_MS);
        }
    }
};

const release = (key?: string) => {
    if (!pressed || (key !== undefined && pressed.key !== key)) return;
    pressed = null;
    graceTimer = stop(graceTimer);
    recompute();
};

const press = (key: string, mode: RfPressMode = 'auto', graceMs = AUTO_PRESS_GRACE_MS) => {
    // first press wins; an expired lock (a step that hangs) is not re-armed until it clears
    if (!enabled || pressed || expired) return;
    pressed = { key, mode };
    graceTimer = stop(graceTimer);
    if (mode === 'auto') {
        graceTimer = setTimeout(() => {
            graceTimer = null;
            // nothing took over within the grace period: the click only toggled some local UI
            if (busyCount === 0) release(key);
        }, graceMs);
    }
    recompute();
};

const busyStart = () => {
    busyCount += 1;
    recompute();
};

const busyEnd = () => {
    busyCount = Math.max(0, busyCount - 1);
    // the busy components are gone: an 'auto' press whose grace period already ran is over too
    if (busyCount === 0 && pressed?.mode === 'auto' && !graceTimer) pressed = null;
    recompute();
};

// An error/warning toast is how every failed step ends: it releases the pressed button
const onMessage = (event: Event) => {
    const type = (event as CustomEvent<{ type?: string }>).detail?.type;
    if (type === 'error' || type === 'warning') release();
};

const subscribe = (listener: () => void) => {
    if (listeners.size === 0 && typeof window !== 'undefined') {
        window.addEventListener('rf-show-message', onMessage);
    }
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && typeof window !== 'undefined') {
            window.removeEventListener('rf-show-message', onMessage);
        }
    };
};

/** Switches the lock on or off (warehouse parameter): off, the buttons are never locked */
const setEnabled = (value: boolean) => {
    if (enabled === value) return;
    enabled = value;
    if (!enabled) release();
    publish();
};

export const rfButtonLock = {
    setEnabled,
    press,
    release,
    busyStart,
    busyEnd,
    getSnapshot: (): RfButtonLockSnapshot => snapshot
};

/** Current lock state, re-rendering the caller on every change */
export const useRfButtonLock = (): RfButtonLockSnapshot =>
    useSyncExternalStore(subscribe, rfButtonLock.getSnapshot, () => UNLOCKED);

/** Keeps the RF module locked while `busy` is true (a page-level loading flag) */
export const useRfBusy = (busy: boolean) => {
    useEffect(() => {
        if (!busy) return;
        busyStart();
        return busyEnd;
    }, [busy]);
};

/** For the RF spinners: the module is busy for as long as the spinner is on screen */
export const useRfBusyWhileMounted = () => useRfBusy(true);
