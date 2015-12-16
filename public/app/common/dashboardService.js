(function () {
    'use strict';
    angular.module('exam.services')
        .service('dashboardService', ['$q', '$location', '$modal', 'sessionService', 'examService', 'reservationService',
            'StudentExamRes', 'ExamRes', 'EXAM_CONF',
            function ($q, $location, $modal, sessionService, examService, reservationService, StudentExamRes, ExamRes, EXAM_CONF) {

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
                        dashboardFinishedExamsPath: EXAM_CONF.TEMPLATES_PATH + "common/teacher/finished_exams.html"
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

                var showStudentDashboard = function () {
                    var scope = {};
                    var deferred = $q.defer();

                    StudentExamRes.enrolments.query(function (enrolments) {
                            scope.userEnrolments = enrolments;
                            StudentExamRes.finishedExams.query(
                                function (participations) {
                                    scope.participations = participations;
                                    deferred.resolve(scope);
                                },
                                function (error) {
                                    deferred.reject(error);
                                });
                        },
                        function (error) {
                            deferred.reject(error);
                        }
                    );
                    return deferred.promise;
                };

                var showTeacherDashboard = function () {
                    var scope = {};
                    var deferred = $q.defer();

                    examService.listExecutionTypes().then(function (types) {
                        scope.executionTypes = types;
                        ExamRes.reviewerExams.query(function (reviewerExams) {
                            scope.activeExams = reviewerExams.filter(function (review) {
                                return Date.now() <= new Date(review.examActiveEndDate);
                            });
                            scope.activeExams.forEach(function (ae) {
                                ae.unassessedCount = examService.getReviewablesCount(ae);
                                ae.unfinishedCount = examService.getGradedCount(ae);
                                ae.reservationCount = reservationService.getReservationCount(ae);
                                ae.ownerAggregate = ae.examOwners.map(function (o) {
                                    return o.firstName + " " + o.lastName;
                                }).join();
                            });
                            scope.finishedExams = reviewerExams.filter(function (review) {
                                return Date.now() > new Date(review.examActiveEndDate);
                            });
                            scope.finishedExams.forEach(function (fe) {
                                fe.unassessedCount = examService.getReviewablesCount(fe);
                                fe.unfinishedCount = examService.getGradedCount(fe);
                                fe.ownerAggregate = fe.examOwners.map(function (o) {
                                    return o.firstName + " " + o.lastName;
                                }).join();
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
