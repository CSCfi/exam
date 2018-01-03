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

import angular from 'angular';

angular.module('app.dashboard.teacher')
    .service('TeacherDashboard', ['$q', 'Exam', 'Reservation', 'ExamRes',
        function ($q, Exam, Reservation, ExamRes) {

            const self = this;

            // Exam is private and has unfinished participants
            const participationsInFuture = function (exam) {
                return exam.executionType.type === 'PUBLIC' || exam.examEnrolments.length > 0;
            };

            const hasUpcomingExaminationDates = function (exam) {
                return exam.examinationDates.some(function (ed) {
                    return Date.now() <= new Date(ed.date).setHours(23, 59, 59, 999);
                });
            };

            // Printout exams do not have an activity period but have examination dates.
            // Produce a fake period for information purposes by selecting first and last examination dates.
            const createFakeActivityPeriod = function (exam) {
                const dates = exam.examinationDates.map(function (es) {
                    return es.date;
                });
                exam.examActiveStartDate = Math.min.apply(Math, dates);
                exam.examActiveEndDate = Math.max.apply(Math, dates);
            };

            self.populate = function (scope) {
                const deferred = $q.defer();

                Exam.listExecutionTypes().then(function (types) {
                    scope.executionTypes = types;
                    ExamRes.reviewerExams.query(function (reviewerExams) {
                        scope.draftExams = reviewerExams.filter(function (review) {
                            return (review.state === 'DRAFT' || review.state === 'SAVED') && Exam.isOwner(review);
                        });
                        scope.draftExams.forEach(function (de) {
                            de.ownerAggregate = de.examOwners.map(function (o) {
                                return o.firstName + ' ' + o.lastName;
                            }).join();
                        });

                        scope.activeExams = reviewerExams.filter(function (review) {
                            if (review.state !== 'PUBLISHED') return false;
                            const periodOk = review.executionType.type !== 'PRINTOUT' &&
                                Date.now() <= new Date(review.examActiveEndDate) &&
                                participationsInFuture(review);
                            const examinationDatesOk = review.executionType.type === 'PRINTOUT' &&
                                hasUpcomingExaminationDates(review);
                            return periodOk || examinationDatesOk;
                        });
                        scope.activeExams.forEach(function (ae) {
                            if (ae.executionType.type === 'PRINTOUT') {
                                createFakeActivityPeriod(ae);
                            }
                            ae.unassessedCount = Exam.getReviewablesCount(ae);
                            ae.unfinishedCount = Exam.getGradedCount(ae);
                            ae.reservationCount = Reservation.getReservationCount(ae);
                            ae.ownerAggregate = ae.examOwners.map(function (o) {
                                return o.firstName + ' ' + o.lastName;
                            }).join();
                        });

                        scope.finishedExams = [];
                        scope.archivedExams = [];
                        const endedExams = reviewerExams.filter(function (review) {
                            if (review.state !== 'PUBLISHED') return false;
                            const periodOk = review.executionType.type !== 'PRINTOUT' &&
                                (Date.now() > new Date(review.examActiveEndDate) || !participationsInFuture(review));
                            const examinationDatesOk = review.executionType.type === 'PRINTOUT' && !hasUpcomingExaminationDates(review);
                            return periodOk || examinationDatesOk;
                        });
                        endedExams.forEach(function (ee) {
                            ee.ownerAggregate = ee.examOwners.map(function (o) {
                                return o.firstName + ' ' + o.lastName;
                            }).join();
                            const unassessedCount = Exam.getReviewablesCount(ee);
                            const unfinishedCount = Exam.getGradedCount(ee);
                            if (unassessedCount + unfinishedCount > 0 && ee.executionType.type !== 'PRINTOUT') {
                                ee.unassessedCount = unassessedCount;
                                ee.unfinishedCount = unfinishedCount;
                                scope.finishedExams.push(ee);
                            } else {
                                if (ee.executionType.type === 'PRINTOUT') {
                                    createFakeActivityPeriod(ee);
                                }
                                ee.assessedCount = Exam.getProcessedCount(ee);
                                scope.archivedExams.push(ee);
                            }
                        });
                        return deferred.resolve(scope);
                    }, function (error) {
                        return deferred.reject(error);
                    });
                }, function () {
                    return deferred.reject();
                });
                return deferred.promise;
            };


        }]);

