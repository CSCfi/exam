/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Exam, ExamExecutionType } from '../../exam/exam.model';
import { ExamService } from '../../exam/exam.service';
import { ReservationService } from '../../reservation/reservation.service';

export interface DraftExam extends Exam {
    ownerAggregate: string;
}
export interface FinalizedExam extends DraftExam {
    unassessedCount: number;
    unfinishedCount: number;
}
export interface ActiveExam extends FinalizedExam {
    reservationCount: number;
}
export interface ArchivedExam extends DraftExam {
    assessedCount: number;
}

export class Dashboard {
    executionTypes: ExamExecutionType[] = [];
    draftExams: DraftExam[] = [];
    activeExams: ActiveExam[] = [];
    finishedExams: FinalizedExam[] = [];
    archivedExams: ArchivedExam[] = [];
}

type Overwrite<T, U> = Pick<T, Exclude<keyof T, keyof U>> & U;

@Injectable()
export class TeacherDashboardService {
    constructor(private http: HttpClient, private Exam: ExamService, private Reservation: ReservationService) {}

    // Exam is private and has unfinished participants
    private participationsInFuture = (exam: Exam) =>
        exam.executionType.type === 'PUBLIC' || exam.examEnrolments.length > 0;

    private hasUpcomingExaminationDates = (exam: Exam) =>
        exam.examinationDates.some(ed => Date.now() <= new Date(ed.date).setHours(23, 59, 59, 999));

    // Printout exams do not have an activity period but have examination dates.
    // Produce a fake period for information purposes by selecting first and last examination dates.
    private createFakeActivityPeriod(exam: Exam) {
        const dates = exam.examinationDates.map(es => es.date as number);
        exam.examActiveStartDate = Math.min(...dates);
        exam.examActiveEndDate = Math.max(...dates);
    }

    populate = (): Observable<Dashboard> =>
        forkJoin(this.Exam.listExecutionTypes(), this.http.get<Exam[]>('/app/reviewerexams')).pipe(
            map(resp => {
                const dashboard = new Dashboard();
                dashboard.executionTypes = resp[0];
                const reviews = resp[1].map(r => ({
                    ...r,
                    children: r.children.filter(c => c.state !== 'DELETED' && c.state !== 'STUDENT_STARTED'),
                }));

                const draftExams = reviews.filter(
                    r => (r.state === 'DRAFT' || r.state === 'SAVED') && this.Exam.isOwner(r),
                );
                dashboard.draftExams = draftExams.map(de => {
                    return {
                        ...de,
                        ownerAggregate: de.examOwners.map(o => `${o.firstName} ${o.lastName}`).join(),
                    };
                });
                const activeExams = reviews.filter(r => {
                    if (r.state !== 'PUBLISHED') {
                        return false;
                    }
                    const periodOk =
                        r.executionType.type !== 'PRINTOUT' &&
                        new Date() <= new Date(r.examActiveEndDate) &&
                        this.participationsInFuture(r);
                    const examinationDatesOk =
                        r.executionType.type === 'PRINTOUT' && this.hasUpcomingExaminationDates(r);
                    return periodOk || examinationDatesOk;
                });
                dashboard.activeExams = activeExams.map(ae => {
                    if (ae.executionType.type === 'PRINTOUT') {
                        this.createFakeActivityPeriod(ae);
                    }
                    return {
                        ...ae,
                        unassessedCount: this.Exam.getReviewablesCount(ae),
                        unfinishedCount: this.Exam.getGradedCount(ae),
                        reservationCount: this.Reservation.getReservationCount(ae),
                        ownerAggregate: ae.examOwners.map(o => `${o.firstName} ${o.lastName}`).join(),
                    };
                });
                const endedExams = reviews.filter(r => {
                    if (r.state !== 'PUBLISHED') {
                        return false;
                    }
                    const periodOk =
                        r.executionType.type !== 'PRINTOUT' &&
                        (new Date() > new Date(r.examActiveEndDate) || !this.participationsInFuture(r));
                    const examinationDatesOk =
                        r.executionType.type === 'PRINTOUT' && !this.hasUpcomingExaminationDates(r);
                    return periodOk || examinationDatesOk;
                });

                endedExams.forEach(ee => {
                    const ownerAggregate = ee.examOwners.map(o => `${o.firstName} ${o.lastName}`).join();
                    const unassessedCount = this.Exam.getReviewablesCount(ee);
                    const unfinishedCount = this.Exam.getGradedCount(ee);
                    if (unassessedCount + unfinishedCount > 0 && ee.executionType.type !== 'PRINTOUT') {
                        dashboard.finishedExams.push({
                            ...ee,
                            ownerAggregate: ownerAggregate,
                            unassessedCount: unassessedCount,
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
                        });
                    }
                });
                return dashboard;
            }),
        );

    getQueryParams(url: string): { [k: string]: string } {
        const hashes = url.slice(url.indexOf('?') + 1).split('&');
        const params: { [k: string]: string } = {};
        hashes.map(hash => {
            const [key, val] = hash.split('=');
            params[key] = decodeURIComponent(val);
        });
        return params;
    }
}
