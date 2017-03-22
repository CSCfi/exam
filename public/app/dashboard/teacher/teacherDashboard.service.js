angular.module('dashboard')
    .service('TeacherDashboard', ['$q', 'examService', 'reservationService', 'ExamRes',
        function ($q, examService, reservationService, ExamRes) {

            var self = this;

            // Exam is private and has unfinished participants
            var participationsInFuture = function (exam) {
                return exam.executionType.type === 'PUBLIC' || exam.examEnrolments.length > 0;
            };

            var hasUpcomingExaminationDates = function (exam) {
                return exam.examinationDates.some(function (ed) {
                    return Date.now() <= new Date(ed.date).setHours(23, 59, 59, 999);
                });
            };

            // Printout exams do not have an activity period but have examination dates.
            // Produce a fake period for information purposes by selecting first and last examination dates.
            var createFakeActivityPeriod = function (exam) {
                var dates = exam.examinationDates.map(function (es) {
                    return es.date;
                });
                exam.examActiveStartDate = Math.min.apply(Math, dates);
                exam.examActiveEndDate = Math.max.apply(Math, dates);
            };

            self.populate = function (scope) {
                var deferred = $q.defer();

                examService.listExecutionTypes().then(function (types) {
                    scope.executionTypes = types;
                    ExamRes.reviewerExams.query(function (reviewerExams) {
                        scope.draftExams = reviewerExams.filter(function (review) {
                            return (review.state === 'DRAFT' || review.state === 'SAVED') && examService.isOwner(review);
                        });
                        scope.draftExams.forEach(function (de) {
                            de.ownerAggregate = de.examOwners.map(function (o) {
                                return o.firstName + " " + o.lastName;
                            }).join();
                        });

                        scope.activeExams = reviewerExams.filter(function (review) {
                            if (review.state !== 'PUBLISHED') return false;
                            var periodOk = review.executionType.type !== 'PRINTOUT' &&
                                Date.now() <= new Date(review.examActiveEndDate) &&
                                participationsInFuture(review);
                            var examinationDatesOk = review.executionType.type === 'PRINTOUT' &&
                                hasUpcomingExaminationDates(review);
                            return periodOk || examinationDatesOk;
                        });
                        scope.activeExams.forEach(function (ae) {
                            if (ae.executionType.type === 'PRINTOUT') {
                                createFakeActivityPeriod(ae);
                            }
                            ae.unassessedCount = examService.getReviewablesCount(ae);
                            ae.unfinishedCount = examService.getGradedCount(ae);
                            ae.reservationCount = reservationService.getReservationCount(ae);
                            ae.ownerAggregate = ae.examOwners.map(function (o) {
                                return o.firstName + " " + o.lastName;
                            }).join();
                        });

                        scope.finishedExams = [];
                        scope.archivedExams = [];
                        var endedExams = reviewerExams.filter(function (review) {
                            if (review.state !== 'PUBLISHED') return false;
                            var periodOk = review.executionType.type !== 'PRINTOUT' &&
                                (Date.now() > new Date(review.examActiveEndDate) || !participationsInFuture(review));
                            var examinationDatesOk = review.executionType.type === 'PRINTOUT' && !hasUpcomingExaminationDates(review);
                            return periodOk || examinationDatesOk;
                        });
                        endedExams.forEach(function (ee) {
                            ee.ownerAggregate = ee.examOwners.map(function (o) {
                                return o.firstName + " " + o.lastName;
                            }).join();
                            var unassessedCount = examService.getReviewablesCount(ee);
                            var unfinishedCount = examService.getGradedCount(ee);
                            if (unassessedCount + unfinishedCount > 0 && ee.executionType.type !== 'PRINTOUT') {
                                ee.unassessedCount = unassessedCount;
                                ee.unfinishedCount = unfinishedCount;
                                scope.finishedExams.push(ee);
                            } else {
                                if (ee.executionType.type === 'PRINTOUT') {
                                    createFakeActivityPeriod(ee);
                                }
                                ee.assessedCount = examService.getProcessedCount(ee);
                                scope.archivedExams.push(ee);
                            }
                        });
                        return deferred.resolve(scope);
                    }, function (error) {
                        return deferred.reject(error);
                    });
                });
                return deferred.promise;
            };


        }]);

