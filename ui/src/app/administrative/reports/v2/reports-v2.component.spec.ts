// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import type { Exam } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { ReservationService } from 'src/app/reservation/reservation.service';
import type { User } from 'src/app/session/session.model';
import { FileService } from 'src/app/shared/file/file.service';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';
import { vi } from 'vitest';
import { ReportsV2Component } from './reports-v2.component';

/** A reservation as the backend lists it for the report */
const reservation = (overrides: Record<string, unknown> = {}, exam: Record<string, unknown> = {}) => ({
    startAt: '2026-06-12T07:00:00Z',
    endAt: '2026-06-12T09:00:00Z',
    machine: { room: { localTimezone: 'Europe/Helsinki' } },
    user: {
        firstName: 'Sauli',
        lastName: 'Student',
        email: 'sauli@uni.fi',
        eppn: 'sauli@uni.fi',
        userIdentifier: 'S1',
    },
    participation: { started: '2026-06-12T07:05:00Z', ended: '2026-06-12T08:35:00Z', duration: '1970-01-01T01:30:00Z' },
    enrolment: {
        noShow: false,
        exam: {
            id: 7,
            name: 'Algebra',
            implementation: 'AQUARIUM',
            examType: { type: 'FINAL' },
            executionType: { type: 'PUBLIC' },
            course: { code: 'MAT1', name: 'Mathematics' },
            examOwners: [{ firstName: 'Olli', lastName: 'Opettaja', email: 'olli@uni.fi' }],
            grade: { name: '5' },
            totalScore: 18,
            maxScore: 20,
            examLanguages: [{ name: 'suomi' }, { name: 'English' }],
            ...exam,
        },
    },
    ...overrides,
});

describe('ReportsV2Component', () => {
    const reservations = { listReservations$: vi.fn(), printExamState: vi.fn(() => 'GRADED') };
    const files = { download: vi.fn() };
    let c: ReportsV2Component;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        reservations.listReservations$.mockReturnValue(of([]));
        TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot()],
            providers: [
                { provide: ReservationService, useValue: reservations },
                { provide: FileService, useValue: files },
                { provide: ExamService, useValue: { getExecutionTypeTranslation: () => 'i18n_public' } },
                {
                    provide: CommonExamService,
                    useValue: {
                        getScaleDisplayName: () => '0-5',
                        getExamGradeDisplayName: (g: string) => `grade ${g}`,
                        getExamImplementationTranslation: () => 'i18n_aquarium',
                    },
                },
            ],
        });
        c = TestBed.runInInjectionContext(() => new ReportsV2Component());
    });

    afterEach(() => vi.useRealTimers());

    /** Lets the filters settle and the report load */
    const settle = () => {
        TestBed.tick();
        vi.advanceTimersByTime(300);
    };

    describe('loading', () => {
        it('should not ask for anything until a filter is set', () => {
            settle();
            expect(reservations.listReservations$).not.toHaveBeenCalled();
            expect(c.reportData()).toEqual([]);
        });

        it('should ask for the chosen student, teacher, exam, state and whole days', () => {
            c.student.set({ id: 3 } as User);
            c.teacher.set({ id: 2 } as User);
            c.exam.set({ id: 7 } as Exam);
            c.status.set('GRADED');
            c.startDate.set(new Date(2026, 5, 1, 0, 0));
            c.endDate.set(new Date(2026, 5, 30, 0, 0));
            settle();

            const params = reservations.listReservations$.mock.calls.at(-1)![0];
            expect(params).toMatchObject({ studentId: '3', ownerId: '2', examId: '7', state: 'GRADED' });
            expect(new Date(params.start)).toEqual(new Date(2026, 5, 1, 0, 0));
            // The end date counts as a whole day
            expect(new Date(params.end)).toEqual(new Date(2026, 5, 30, 23, 59, 59, 999));
        });

        it('should turn each reservation into a row, with times on the room clock', () => {
            reservations.listReservations$.mockReturnValue(of([reservation()]));
            c.status.set('GRADED');
            settle();

            expect(c.reportData()).toHaveLength(1);
            expect(c.reportData()[0]).toMatchObject({
                firstName: 'Sauli',
                studentNumber: 'S1',
                courseCode: 'MAT1',
                examName: 'Algebra',
                teachers: 'Olli Opettaja (olli@uni.fi)',
                // 07:00 UTC is 10:00 in Helsinki in June
                reservationStart: '2026-06-12 10:00',
                reservationEnd: '2026-06-12 12:00',
                participationStart: '2026-06-12 10:05',
                participationDuration: '01:30:00',
                assessmentStatus: 'GRADED',
                grade: 'grade 5',
                score: '18',
                maxScore: '20',
                language: 'suomi, English',
                noShow: 'No',
                aborted: 'No',
            });
        });

        it("should name the parent's owners for a student's attempt, and a visitor by reference", () => {
            const attempt = reservation(
                { user: undefined, externalUserRef: 'visitor@other.fi' },
                {
                    examOwners: [],
                    parent: { examOwners: [{ firstName: 'Arvo', lastName: 'P', email: 'arvo@uni.fi' }] },
                },
            );
            reservations.listReservations$.mockReturnValue(of([attempt]));
            c.status.set('GRADED');
            settle();
            expect(c.reportData()[0].teachers).toBe('Arvo P (arvo@uni.fi)');
            expect(c.reportData()[0].firstName).toBe('visitor@other.fi');
        });

        it('should narrow the rows by exam method, type and student details', () => {
            reservations.listReservations$.mockReturnValue(
                of([
                    reservation(),
                    reservation({ user: { eppn: 'other@uni.fi', email: 'other@uni.fi', userIdentifier: 'S2' } }),
                    reservation({}, { implementation: 'CLIENT_AUTH', examType: { type: 'PARTIAL' } }),
                ]),
            );
            const rows = () => c.reportData().length;

            c.implementation.set('aquarium');
            settle();
            expect(rows()).toBe(2);
            c.examType.set('final');
            settle();
            expect(rows()).toBe(2);
            c.eppn.set('SAULI');
            settle();
            expect(rows()).toBe(1);
            c.eppn.set('');
            c.studentNumber.set('s2');
            settle();
            expect(rows()).toBe(1);
            c.studentNumber.set('');
            c.email.set('nobody');
            settle();
            expect(rows()).toBe(0);
        });

        it('should mark no-shows and aborted attempts', () => {
            reservations.listReservations$.mockReturnValue(
                of([
                    reservation({ status: 'ABORTED' }),
                    reservation({ enrolment: { ...reservation().enrolment, noShow: true } }),
                ]),
            );
            c.status.set('ABORTED');
            settle();
            expect(c.reportData().map((r) => [r.aborted, r.noShow])).toEqual([
                ['Yes', 'No'],
                ['No', 'Yes'],
            ]);
        });

        it('should show an empty report when loading fails', () => {
            vi.spyOn(console, 'error').mockImplementation(() => undefined);
            reservations.listReservations$.mockReturnValue(throwError(() => new Error('down')));
            c.status.set('GRADED');
            settle();
            expect(c.reportData()).toEqual([]);
        });
    });

    describe('sorting', () => {
        beforeEach(() => {
            reservations.listReservations$.mockReturnValue(
                of(['Bert', 'Anna', 'Cecilia'].map((n) => reservation({ user: { firstName: n } }))),
            );
            c.status.set('GRADED');
            settle();
        });

        const names = () => c.sortedReportData().map((r) => r.firstName);

        it('should keep the loaded order until a column is chosen', () => {
            expect(names()).toEqual(['Bert', 'Anna', 'Cecilia']);
        });

        it('should sort by a column, and the other way on a second click', () => {
            c.sort('firstName');
            expect(names()).toEqual(['Anna', 'Bert', 'Cecilia']);
            c.sort('firstName');
            expect(names()).toEqual(['Cecilia', 'Bert', 'Anna']);
            c.sort('lastName');
            expect(c.sortDirection()).toBe('asc');
        });
    });

    describe('exporting', () => {
        const exported = () => files.download.mock.calls.at(-1);

        it('should send only the visible columns, in their order', () => {
            reservations.listReservations$.mockReturnValue(of([reservation()]));
            c.status.set('GRADED');
            settle();
            c.hideAllColumns();
            c.toggleColumn('examName');
            c.toggleColumn('firstName');

            c['generateReportXlsx']();

            const [url, , options] = exported()!;
            expect(url).toBe('/app/reports/generic/xlsx');
            expect(options).toMatchObject({
                method: 'POST',
                body: { headers: ['i18n_firstname', 'i18n_exam_name'], rows: [['Sauli', 'Algebra']] },
            });
        });

        it('should toggle a column off and all of them back', () => {
            const all = c.visibleColumns().length;
            c.toggleColumn('studentEmail');
            c.toggleColumn('firstName');
            expect(c.visibleColumns()).not.toContain('firstName');
            c.showAllColumns();
            expect(c.visibleColumns()).toHaveLength(all);
        });

        it('should export nothing for an empty report', () => {
            c['generateReportXlsx']();
            expect(files.download).not.toHaveBeenCalled();
        });
    });
});
