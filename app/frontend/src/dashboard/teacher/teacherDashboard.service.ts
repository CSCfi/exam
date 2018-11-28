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
import { ExamService } from '../../exam/exam.service';

export class TeacherDashboardService {

    constructor(
        private $http: angular.IHttpService,
        private $q: angular.IQService,
        private Exam: ExamService,
        private Reservation: any // TBD
    ) {
        'ngInject';
    }

    // Exam is private and has unfinished participants
    private participationsInFuture = (exam) =>
        exam.executionType.type === 'PUBLIC' || exam.examEnrolments.length > 0


    private hasUpcomingExaminationDates = (exam: { examinationDates: { date: VarDate }[] }) =>
        exam.examinationDates.some(ed =>
            Date.now() <= new Date(ed.date).setHours(23, 59, 59, 999)
        )

    // Printout exams do not have an activity period but have examination dates.
    // Produce a fake period for information purposes by selecting first and last examination dates.
    private createFakeActivityPeriod(exam) {
        const dates = exam.examinationDates.map(es => es.date);
        exam.examActiveStartDate = Math.min.apply(Math, dates);
        exam.examActiveEndDate = Math.max.apply(Math, dates);
    }

    populate(scope) {
        const deferred = this.$q.defer();
        this.Exam.listExecutionTypes().subscribe(types => {
            scope.executionTypes = types;
            this.$http.get('/app/reviewerexams').then((resp: IHttpResponse<any[]>) => {
                const reviews = resp.data;
                scope.draftExams = reviews.filter(r =>
                    (r.state === 'DRAFT' || r.state === 'SAVED') && this.Exam.isOwner(r)
                );

                scope.draftExams.forEach(de =>
                    de.ownerAggregate = de.examOwners.map(o => o.firstName + ' ' + o.lastName).join()
                );

                scope.activeExams = reviews.filter(r => {
                    if (r.state !== 'PUBLISHED') {
                        return false;
                    }
                    const periodOk = r.executionType.type !== 'PRINTOUT' &&
                        new Date() <= new Date(r.examActiveEndDate) &&
                        this.participationsInFuture(r);
                    const examinationDatesOk = r.executionType.type === 'PRINTOUT' &&
                        this.hasUpcomingExaminationDates(r);
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
                    const periodOk = r.executionType.type !== 'PRINTOUT' &&
                        (new Date() > new Date(r.examActiveEndDate) || !this.participationsInFuture(r));
                    const examinationDatesOk = r.executionType.type === 'PRINTOUT' &&
                        !this.hasUpcomingExaminationDates(r);
                    return periodOk || examinationDatesOk;
                });
                endedExams.forEach(ee => {
                    ee.ownerAggregate = ee.examOwners.map(o => o.firstName + ' ' + o.lastName).join();
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
            }).catch(() => deferred.reject());
        }, () => deferred.reject());
        return deferred.promise;
    }

}
