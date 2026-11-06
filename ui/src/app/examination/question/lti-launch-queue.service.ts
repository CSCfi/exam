// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Injectable } from '@angular/core';

/** A place in the launch queue. `release` gives the turn to the next launch, or leaves the queue. */
export interface LtiLaunchTicket {
    release(): void;
}

/**
 * Runs LTI launches one at a time.
 *
 * The platform keeps the launch in progress in the user's session: `start-login` stores the issued
 * `login_hint` and the question there, and the OIDC callback reads them back. A second launch
 * started before the first one's callback overwrites them, and the first one then fails. An exam
 * section shows all its questions at once, so two LTI questions in one section would start their
 * launches together; here they take turns instead.
 *
 * A turn ends when the launch releases it: when its frame loads the first document, which comes
 * after the callback has read the session. In case that never happens, it ends after a timeout.
 */
@Injectable({ providedIn: 'root' })
export class LtiLaunchQueueService {
    static readonly TurnTimeoutMs = 20_000;

    private readonly waiting: Array<() => void> = [];
    private running: { end: () => void } | null = null;

    /** Calls `start` when it is this launch's turn, at once if no other launch is running. */
    enqueue(start: () => void): LtiLaunchTicket {
        let state: 'waiting' | 'running' | 'done' = 'waiting';
        let timer: ReturnType<typeof setTimeout> | undefined;

        const end = () => {
            clearTimeout(timer);
            state = 'done';
            this.running = null;
            this.next();
        };
        const begin = () => {
            state = 'running';
            this.running = { end };
            timer = setTimeout(end, LtiLaunchQueueService.TurnTimeoutMs);
            start();
        };

        this.waiting.push(begin);
        if (!this.running) this.next();

        return {
            release: () => {
                if (state === 'running') {
                    end();
                } else if (state === 'waiting') {
                    state = 'done';
                    const i = this.waiting.indexOf(begin);
                    if (i >= 0) this.waiting.splice(i, 1);
                }
            },
        };
    }

    private next() {
        this.waiting.shift()?.();
    }
}
