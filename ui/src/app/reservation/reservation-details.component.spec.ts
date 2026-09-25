// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { vi } from 'vitest';
import { ReservationDetailsComponent } from './reservation-details.component';
import { ReservationService } from './reservation.service';

describe('ReservationDetailsComponent', () => {
    let component: ReservationDetailsComponent;

    // The component types these as full reservations, tests only fill in what the predicates read
    const reservation = (
        state: string,
        endAt: string,
        extras: Record<string, unknown> = {},
    ): Parameters<ReservationDetailsComponent['canChangeMachine']>[0] =>
        ({
            id: 1,
            endAt,
            enrolment: { noShow: false, exam: { state, implementation: 'AQUARIUM' } },
            ...extras,
        }) as unknown as Parameters<ReservationDetailsComponent['canChangeMachine']>[0];

    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: ReservationService, useValue: { printExamState: vi.fn() } },
                { provide: TranslateService, useValue: { instant: (k: string) => k } },
                { provide: ToastrService, useValue: { info: vi.fn(), error: vi.fn() } },
            ],
        });
        component = TestBed.runInInjectionContext(() => new ReservationDetailsComponent());
    });

    afterEach(() => TestBed.resetTestingModule());

    describe('canChangeMachine', () => {
        it('should allow changing machine for an upcoming aquarium reservation', () => {
            expect(component.canChangeMachine(reservation('PUBLISHED', future))).toBe(true);
        });

        it('should not allow changing machine for a past reservation', () => {
            expect(component.canChangeMachine(reservation('PUBLISHED', past))).toBe(false);
        });

        it('should not allow changing machine for a no-show', () => {
            const r = reservation('PUBLISHED', future, {
                enrolment: { noShow: true, exam: { state: 'PUBLISHED', implementation: 'AQUARIUM' } },
            });
            expect(component.canChangeMachine(r)).toBe(false);
        });

        it('should never allow changing machine of a visiting student reservation', () => {
            const inbound = reservation('EXTERNAL_UNFINISHED', future, { externalUserRef: 'student@other.org' });
            expect(component.canChangeMachine(inbound)).toBe(false);
            expect(component.canChangeMachine(reservation('EXTERNAL_UNFINISHED', past))).toBe(false);
        });

        it('should never allow changing machine of a reservation held in another institution', () => {
            const outbound = reservation('PUBLISHED', future, { externalReservation: { roomName: 'Room X' } });
            expect(component.canChangeMachine(outbound)).toBe(false);
        });
    });

    describe('canRemoveReservation', () => {
        it('should allow removing an upcoming visiting student reservation', () => {
            expect(component.canRemoveReservation(reservation('EXTERNAL_UNFINISHED', future))).toBe(true);
        });

        it('should not allow removing a past reservation', () => {
            expect(component.canRemoveReservation(reservation('EXTERNAL_UNFINISHED', past))).toBe(false);
        });
    });

    describe('hasAvailableActions', () => {
        it('should offer no actions at all for a past unused visiting student reservation', () => {
            const r = reservation('EXTERNAL_UNFINISHED', past, { externalUserRef: 'student@other.org' });
            expect(component.hasAvailableActions(r)).toBe(false);
        });

        it('should offer cancellation only for an upcoming visiting student reservation', () => {
            const r = reservation('EXTERNAL_UNFINISHED', future, { externalUserRef: 'student@other.org' });
            expect(component.canRemoveReservation(r)).toBe(true);
            expect(component.canChangeMachine(r)).toBe(false);
        });
    });
});
