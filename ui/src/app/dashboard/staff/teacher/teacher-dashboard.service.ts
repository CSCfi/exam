// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Exam, ExamExecutionType } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { ReservationService } from 'src/app/reservation/reservation.service';

export interface DashboardExam extends Exam {
    ownerAggregate: string;
    unassessedCount: number;
    unfinishedCount: number;
    reservationCount: number;
    assessedCount: number;
}

export class Dashboard {
    executionTypes: ExamExecutionType[] = [];
    draftExams: DashboardExam[] = [];
    activeExams: DashboardExam[] = [];
    finishedExams: DashboardExam[] = [];
    archivedExams: DashboardExam[] = [];
}

@Injectable({ providedIn: 'root' })
export class TeacherDashboardService {
    constructor(
        private http: HttpClient,
        private Exam: ExamService,
        private Reservation: ReservationService,
    ) {}

    populate$ = (): Observable<Dashboard> =>
        forkJoin([this.Exam.listExecutionTypes$(), this.http.get<Exam[]>('/app/reviewerexams')]).pipe(
            map((resp) => {
                const dashboard = new Dashboard();
                dashboard.executionTypes = resp[0];
                const reviews = resp[1].map((r) => ({
                    ...r,
                    children: r.children.filter((c) => c.state !== 'DELETED' && c.state !== 'STUDENT_STARTED'),
                }));

                const draftExams = reviews.filter(
                    (r) => (r.state === 'DRAFT' || r.state === 'SAVED') && this.Exam.isOwner(r),
                );
                dashboard.draftExams = draftExams.map((de) => {
                    return {
                        ...de,
                        ownerAggregate: de.examOwners.map((o) => `${o.firstName} ${o.lastName}`).join(),
                        unassessedCount: 0,
                        unfinishedCount: 0,
                        reservationCount: 0,
                        assessedCount: 0,
                    };
                });
                const activeExams = reviews.filter((r) => {
                    if (r.state !== 'PUBLISHED') {
                        return false;
                    }
                    const periodOk =
                        r.executionType.type !== 'PRINTOUT' &&
                        new Date() <= new Date(r.periodEnd as string) &&
                        this.participationsInFuture(r);
                    const examinationDatesOk =
                        r.executionType.type === 'PRINTOUT' && this.hasUpcomingExaminationDates(r);
                    return periodOk || examinationDatesOk;
                });
                dashboard.activeExams = activeExams.map((ae) => {
                    if (ae.executionType.type === 'PRINTOUT') {
                        this.createFakeActivityPeriod(ae);
                    }
                    return {
                        ...ae,
                        unassessedCount: this.Exam.getReviewablesCount(ae),
                        unfinishedCount: this.Exam.getGradedCount(ae),
                        reservationCount: this.Reservation.getReservationCount(ae),
                        assessedCount: 0,
                        ownerAggregate: ae.examOwners.map((o) => `${o.firstName} ${o.lastName}`).join(),
                    };
                });
                const endedExams = reviews.filter((r) => {
                    if (r.state !== 'PUBLISHED') {
                        return false;
                    }
                    const periodOk =
                        r.executionType.type !== 'PRINTOUT' &&
                        (new Date() > new Date(r.periodEnd as string) || !this.participationsInFuture(r));
                    const examinationDatesOk =
                        r.executionType.type === 'PRINTOUT' && !this.hasUpcomingExaminationDates(r);
                    return periodOk || examinationDatesOk;
                });

                endedExams.forEach((ee) => {
                    const ownerAggregate = ee.examOwners.map((o) => `${o.firstName} ${o.lastName}`).join();
                    const unassessedCount = this.Exam.getReviewablesCount(ee);
                    const unfinishedCount = this.Exam.getGradedCount(ee);
                    if (unassessedCount + unfinishedCount > 0 && ee.executionType.type !== 'PRINTOUT') {
                        dashboard.finishedExams.push({
                            ...ee,
                            ownerAggregate: ownerAggregate,
                            unassessedCount: unassessedCount,
                            assessedCount: 0,
                            reservationCount: 0,
                            unfinishedCount: unfinishedCount,
                        });
                    } else {
                        if (ee.executionType.type === 'PRINTOUT') {
                            this.createFakeActivityPeriod(ee);
                        }
                        dashboard.archivedExams.push({
                            ...ee,
                            ownerAggregate: ownerAggregate,
                            assessedCount: this.Exam.getProcessedCount(ee),
                            unassessedCount: 0,
                            reservationCount: 0,
                            unfinishedCount: 0,
                        });
                    }
                });
                return dashboard;
            }),
        );

    getQueryParams(url: string): { [k: string]: string } {
        const hashes = url.slice(url.indexOf('?') + 1).split('&');
        const params: { [k: string]: string } = {};
        hashes.map((hash) => {
            const [key, val] = hash.split('=');
            params[key] = decodeURIComponent(val);
        });
        return params;
    }

    copyExam$ = (id: number, type: string, examinationType: string) =>
        this.http.post<Exam>(`/app/exams/${id}`, { type: type, examinationType: examinationType });
    deleteExam$ = (id: number) => this.http.delete(`/app/exams/${id}`);

    // Exam is private and has unfinished participants
    private participationsInFuture = (exam: Exam) =>
        exam.executionType.type === 'PUBLIC' || exam.examEnrolments.length > 0;

    private hasUpcomingExaminationDates = (exam: Exam) =>
        exam.examinationDates.some((ed) => Date.now() <= new Date(ed.date).setHours(23, 59, 59, 999));

    // Printout exams do not have an activity period but have examination dates.
    // Produce a fake period for information purposes by selecting first and last examination dates.
    private createFakeActivityPeriod(exam: Exam) {
        const dates = exam.examinationDates.map((es) => new Date(es.date).getTime());
        exam.periodStart = new Date(dates.length > 0 ? Math.min(...dates) : new Date()).toISOString();
        exam.periodEnd = new Date(dates.length > 0 ? Math.max(...dates) : new Date()).toISOString();
    }
}
