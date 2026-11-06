// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { vi } from 'vitest';
import { LtiLaunchQueueService } from './lti-launch-queue.service';

/**
 * The platform keeps one launch in progress per session, so launches must not overlap: each waits
 * until the one before it has released its turn.
 */
describe('LtiLaunchQueueService', () => {
    let queue: LtiLaunchQueueService;

    beforeEach(() => {
        queue = new LtiLaunchQueueService();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should start a launch at once when no other is running', () => {
        const start = vi.fn();
        queue.enqueue(start);
        expect(start).toHaveBeenCalledOnce();
    });

    it('should start launches one after the other, in order', () => {
        const started: string[] = [];
        const first = queue.enqueue(() => started.push('first'));
        const second = queue.enqueue(() => started.push('second'));
        queue.enqueue(() => started.push('third'));
        expect(started).toEqual(['first']);

        first.release();
        expect(started).toEqual(['first', 'second']);

        second.release();
        expect(started).toEqual(['first', 'second', 'third']);
    });

    it('should ignore a second release of the same turn', () => {
        const started: string[] = [];
        const first = queue.enqueue(() => started.push('first'));
        queue.enqueue(() => started.push('second'));
        const third = queue.enqueue(() => started.push('third'));

        first.release();
        first.release();
        expect(started).toEqual(['first', 'second']);
        third.release();
    });

    // A question whose view is destroyed before its turn, e.g. collapsed or left behind.
    it('should drop a launch that leaves the queue before its turn', () => {
        const started: string[] = [];
        const first = queue.enqueue(() => started.push('first'));
        const second = queue.enqueue(() => started.push('second'));
        queue.enqueue(() => started.push('third'));

        second.release();
        first.release();
        expect(started).toEqual(['first', 'third']);
    });

    it('should give the turn on if a launch never releases it', () => {
        vi.useFakeTimers();
        const started: string[] = [];
        queue.enqueue(() => started.push('first'));
        queue.enqueue(() => started.push('second'));

        vi.advanceTimersByTime(LtiLaunchQueueService.TurnTimeoutMs - 1);
        expect(started).toEqual(['first']);
        vi.advanceTimersByTime(1);
        expect(started).toEqual(['first', 'second']);
    });

    it('should not let a timed-out turn end the next one when it is released late', () => {
        vi.useFakeTimers();
        const started: string[] = [];
        const first = queue.enqueue(() => started.push('first'));
        queue.enqueue(() => started.push('second'));
        queue.enqueue(() => started.push('third'));

        vi.advanceTimersByTime(LtiLaunchQueueService.TurnTimeoutMs);
        first.release();
        expect(started).toEqual(['first', 'second']);
    });
});
