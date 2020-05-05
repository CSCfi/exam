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

import * as angular from 'angular';
import { IHttpResponse } from 'angular';
import { User } from '../../session/session.service';
import { Exam, ExamExecutionType } from '../../exam/exam.model';

export interface ReviewerExam extends Exam {
    ownerAggregate: string;
    unassessedCount: number;
    assessedCount: number;
    reservationCount: number;
    unfinishedCount: number;
}

export interface DashboardScope {
    activeExams: ReviewerExam[];
    draftExams: ReviewerExam[];
    finishedExams: ReviewerExam[];
    archivedExams: ReviewerExam[];
    executionTypes: ExamExecutionType[];
}

export class TeacherDashboardService {
    constructor(
        private $http: angular.IHttpService,
        private $q: angular.IQService,
        private Exam: any, // TBD
        private Reservation: any, // TBD
    ) {
        'ngInject';
    }

    // Exam is private and has unfinished participants
    private participationsInFuture = (exam: Exam) =>
        exam.executionType.type === 'PUBLIC' || exam.examEnrolments.length > 0;

    private hasUpcomingExaminationDates = (exam: Exam) =>
        exam.examinationDates.some(ed => Date.now() <= new Date(ed.date).setHours(23, 59, 59, 999));

    // Printout exams do not have an activity period but have examination dates.
    // Produce a fake period for information purposes by selecting first and last examination dates.
    private createFakeActivityPeriod(exam) {
        const dates = exam.examinationDates.map(es => es.date);
        exam.examActiveStartDate = Math.min(...dates);
        exam.examActiveEndDate = Math.max(...dates);
    }

    populate(scope: DashboardScope) {
        const deferred = this.$q.defer();
        this.Exam.listExecutionTypes()
            .then((types: ExamExecutionType[]) => {
                scope.executionTypes = types;
                this.$http
                    .get('/app/reviewerexams')
                    .then((resp: IHttpResponse<ReviewerExam[]>) => {
                        // deleted or ongoing assessments are not considered
                        const reviews: ReviewerExam[] = resp.data.map(r => ({
                            ...r,
                            children: r.children.filter(c => c.state !== 'DELETED' && c.state !== 'STUDENT_STARTED'),
                        }));

                        scope.draftExams = reviews.filter(
                            r => (r.state === 'DRAFT' || r.state === 'SAVED') && this.Exam.isOwner(r),
                        );

                        scope.draftExams.forEach(
                            de => (de.ownerAggregate = de.examOwners.map(o => o.firstName + ' ' + o.lastName).join()),
                        );

                        scope.activeExams = reviews.filter(r => {
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
                        scope.activeExams.forEach(ae => {
                            if (ae.executionType.type === 'PRINTOUT') {
                                this.createFakeActivityPeriod(ae);
                            }
                            ae.unassessedCount = this.Exam.getReviewablesCount(ae);
                            ae.unfinishedCount = this.Exam.getGradedCount(ae);
                            ae.reservationCount = this.Reservation.getReservationCount(ae);
                            ae.ownerAggregate = ae.examOwners.map(o => o.firstName + ' ' + o.lastName).join();
                        });

                        scope.finishedExams = [];
                        scope.archivedExams = [];
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
                            ee.ownerAggregate = ee.examOwners.map((o: User) => o.firstName + ' ' + o.lastName).join();
                            const unassessedCount = this.Exam.getReviewablesCount(ee);
                            const unfinishedCount = this.Exam.getGradedCount(ee);
                            if (unassessedCount + unfinishedCount > 0 && ee.executionType.type !== 'PRINTOUT') {
                                ee.unassessedCount = unassessedCount;
                                ee.unfinishedCount = unfinishedCount;
                                scope.finishedExams.push(ee);
                            } else {
                                if (ee.executionType.type === 'PRINTOUT') {
                                    this.createFakeActivityPeriod(ee);
                                }
                                ee.assessedCount = this.Exam.getProcessedCount(ee);
                                scope.archivedExams.push(ee);
                            }
                        });
                        return deferred.resolve(scope);
                    })
                    .catch(() => deferred.reject());
            })
            .catch(() => deferred.reject());
        return deferred.promise;
    }
}
