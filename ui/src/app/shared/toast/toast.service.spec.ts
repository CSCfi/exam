// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
    let service: ToastService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(ToastService);
    });

    it('should show a toast with defaults', () => {
        service.error('boom');
        expect(service.toasts()).toEqual([
            expect.objectContaining({
                type: 'error',
                message: 'boom',
                title: undefined,
                timeOut: 5000,
                position: 'top-right',
                progressBar: false,
            }),
        ]);
    });

    it('should apply options and put the newest toast first', () => {
        service.info('first');
        service.success('second', 'Title', { timeOut: 2000, position: 'center', progressBar: true });
        expect(service.toasts().map((t) => t.message)).toEqual(['second', 'first']);
        expect(service.toasts()[0]).toEqual(
            expect.objectContaining({ title: 'Title', timeOut: 2000, position: 'center', progressBar: true }),
        );
    });

    it('should not show a duplicate of an active message', () => {
        const first = service.warning('same');
        const second = service.error('same');
        expect(service.toasts().length).toBe(1);
        expect(second).toBe(first);
    });

    it('should emit onTap and then onHidden when tapped', () => {
        const ref = service.info('tap me');
        const events: string[] = [];
        ref.onTap.subscribe(() => events.push('tap'));
        ref.onHidden.subscribe(() => events.push('hidden'));

        service.tap(service.toasts()[0].id);

        expect(events).toEqual(['tap', 'hidden']);
        expect(service.toasts()).toEqual([]);
    });

    it('should emit only onHidden when removed without a tap', () => {
        const ref = service.info('bye');
        const events: string[] = [];
        ref.onTap.subscribe(() => events.push('tap'));
        ref.onHidden.subscribe(() => events.push('hidden'));

        service.remove(service.toasts()[0].id);

        expect(events).toEqual(['hidden']);
    });

    it('should clear all toasts and notify each', () => {
        const hidden = vi.fn();
        service.info('a').onHidden.subscribe(hidden);
        service.info('b').onHidden.subscribe(hidden);

        service.clear();

        expect(service.toasts()).toEqual([]);
        expect(hidden).toHaveBeenCalledTimes(2);
    });
});
