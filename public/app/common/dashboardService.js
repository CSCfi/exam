(function () {
    'use strict';
    angular.module('exam.services')
        .service('dashboardService', ['$q', '$routeParams', 'sessionService', 'examService', 'reservationService', 'StudentExamRes',
            'ExamRes', 'EXAM_CONF',
            function ($q, $routeParams, sessionService, examService, reservationService, StudentExamRes, ExamRes, EXAM_CONF) {

                var self = this;

                self.getTemplates = function () {
                    var user = sessionService.getUser();
                    if (!user) {
                        console.log('not logged in');
                        return;
                    }
                    var templates = {
                        dashboardToolbarPath: EXAM_CONF.TEMPLATES_PATH + "common/teacher/toolbar.html",
                        dashboardActiveExamsPath: EXAM_CONF.TEMPLATES_PATH + "common/teacher/active_exams.html",
                        dashboardFinishedExamsPath: EXAM_CONF.TEMPLATES_PATH + "common/teacher/finished_exams.html",
                        dashboardArchivedExamsPath: EXAM_CONF.TEMPLATES_PATH + "common/teacher/archived_exams.html",
                        dashboardDraftExamsPath: EXAM_CONF.TEMPLATES_PATH + "common/teacher/draft_exams.html"
                    };
                    var contentTemplatePath;
                    if (user.isStudent) {
                        contentTemplatePath = "common/student/dashboard.html";
                    } else if (user.isTeacher) {
                        contentTemplatePath = "common/teacher/dashboard.html";
                    } else if (user.isAdmin) {
                        contentTemplatePath = "reservation/reservations.html";
                    }
                    templates.dashboardTemplate = EXAM_CONF.TEMPLATES_PATH + contentTemplatePath;
                    return templates;
                };

                var setOccasion = function(reservation) {
                    var machine = reservation.machine;
                    var external = reservation.externalReservation;
                    var tz = machine ? machine.room.localTimezone : external.roomTz;
                    var start = moment.tz(reservation.startAt, tz);
                    var end = moment.tz(reservation.endAt, tz);
                    if (start.isDST()) {
                        start.add(-1, 'hour');
                    }
                    if (end.isDST())
                    {
                        end.add(-1, 'hour');
                    }
                    reservation.occasion = {
                        startAt: start.format("HH:mm"),
                        endAt: end.format("HH:mm")
                    };
                };

                self.searchParticipations = function(filter) {
                    var deferred = $q.defer();
                    StudentExamRes.finishedExams.query({filter: filter},
                        function (participations) {
                            deferred.resolve({participations: participations});
                        },
                        function (error) {
                            deferred.reject(error);
                        });
                    return deferred.promise;
                };

                var showStudentDashboard = function () {
                    var scope = {};
                    var deferred = $q.defer();

                    StudentExamRes.enrolments.query(function (enrolments) {
                            enrolments.forEach(function(e) {
                                if (e.reservation) {
                                    setOccasion(e.reservation);
                                }
                            });
                            scope.userEnrolments = enrolments;
                            deferred.resolve(scope);
                        },
                        function (error) {
                            deferred.reject(error);
                        }
                    );
                    return deferred.promise;
                };

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

                var showTeacherDashboard = function () {
                    var scope = {};
                    var deferred = $q.defer();

                    examService.listExecutionTypes().then(function (types) {
                        scope.executionTypes = types;
                        ExamRes.reviewerExams.query(function (reviewerExams) {
                            scope.draftExams = reviewerExams.filter(function (review) {
                               return (review.state === 'DRAFT' || review.state === 'SAVED') && examService.isOwner(review);
                            });
                            scope.draftExams.forEach(function(de) {
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
                                    (Date.now() > new Date(review.examActiveEndDate) ||
                                    !participationsInFuture(review));
                                var examinationDatesOk = review.executionType.type === 'PRINTOUT' &&
                                        !hasUpcomingExaminationDates(review);
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


                self.showDashboard = function () {
                    var user = sessionService.getUser();
                    if (!user || user.isAdmin) {
                        var deferred = $q.defer();
                        deferred.resolve();
                        return deferred.promise;
                    }
                    if (user.isStudent) {
                        return showStudentDashboard();
                    } else if (user.isTeacher) {
                        return showTeacherDashboard();
                    }
                };


            }]);
}());
