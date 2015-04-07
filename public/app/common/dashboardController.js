(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('DashboardCtrl', ['dialogs','$scope', '$http', '$translate', '$location', '$modal', 'SITNET_CONF', 'sessionService', 'ExamRes', 'examService', 'questionService', 'StudentExamRes', 'dateService',
            function (dialogs, $scope, $http, $translate, $location, $modal, SITNET_CONF, sessionService, ExamRes, examService, questionService, StudentExamRes, dateService) {

                $scope.dashboardToolbarPath = SITNET_CONF.TEMPLATES_PATH + "common/teacher/toolbar.html";
                $scope.dashboardActiveExamsPath = SITNET_CONF.TEMPLATES_PATH + "common/teacher/active_exams.html";
                $scope.dashboardFinishedExamsPath = SITNET_CONF.TEMPLATES_PATH + "common/teacher/finished_exams.html";

                $scope.user = sessionService.getUser();

                if ($scope.user) {
                    if ($scope.user.isStudent) {

                        $scope.dashboardTemplate = SITNET_CONF.TEMPLATES_PATH + "common/student/dashboard.html";

                        StudentExamRes.enrolments.query({uid: $scope.user.id},
                            function (enrolments) {
                                $scope.userEnrolments = enrolments;

                                if(enrolments && enrolments.length > 0) {

                                    angular.forEach(enrolments, function(enrolment){

                                        StudentExamRes.teachers.get({id: enrolment.exam.id},
                                            function (teachers) {
                                                setExamTeachers(enrolment.exam);
                                            },
                                            function (error) {
                                                toastr.error(error.data);
                                            }
                                        );
                                    });
                                }
                            },
                            function (error) {
                                toastr.error(error.data);
                            }
                        );

                        StudentExamRes.finishedExams.query({uid: $scope.user.id},
                        function (finishedExams) {
                            $scope.studentFinishedExams = finishedExams;
                        },
                        function (error) {
                            toastr.error(error.data);
                        });

                    }
                    else if ($scope.user.isTeacher) {
                        $scope.dashboardTemplate = SITNET_CONF.TEMPLATES_PATH + "common/teacher/dashboard.html";

                        ExamRes.reviewerExams.query(function (reviewerExams) {
                            $scope.activeExams = reviewerExams.filter(function(review) {
                                return $scope.beforeDate(review.examActiveEndDate);
                            });
                            $scope.finishedExams = reviewerExams.filter(function(review) {
                                return $scope.afterDate(review.examActiveEndDate);
                            });
                            var allExams = $scope.activeExams.concat($scope.finishedExams);

                            angular.forEach(allExams, function (exam) {
                                exam.activeExamEnrolments = exam.examEnrolments.filter(function(enrolment) {
                                   return enrolment.reservation != undefined
                                });
                                ExamRes.examParticipations.query({eid: exam.id},
                                    function (examParticipations) {
                                        exam.examParticipations = examParticipations;
                                        exam.examParticipationsAndReviews = examParticipations.filter(function(participation) {
                                            var state = participation.exam.state;
                                            return state === 'GRADED' || state === 'GRADED_LOGGED';
                                        });
                                    },
                                    function (error) {
                                        toastr.error(error.data);
                                    });

                                exam.examTeachers = [];
                                angular.forEach(exam.examInspections, function (inspection) {
                                    if(exam.examTeachers.indexOf(inspection.user) === -1) {
                                        exam.examTeachers.push(inspection.user);
                                    }
                                });

                                angular.forEach(exam.examOwners, function(owner){
                                    if(exam.examTeachers.indexOf(owner) === -1) {
                                        exam.examTeachers.push(owner);
                                    }
                                });
                            });
                        });
                    }
                    else if ($scope.user.isAdmin) {
                        $scope.dashboardTemplate = SITNET_CONF.TEMPLATES_PATH + "reservation/reservations.html";
                    }
                }

                function setExamTeachers(exam) {
                    exam.examTeachers = [];
                    exam.teachersStr = "";
                    angular.forEach(exam.examInspections, function (inspection) {
                        if(exam.examTeachers.indexOf(inspection.user.firstName + " " + inspection.user.lastName) === -1) {
                            exam.examTeachers.push(inspection.user.firstName + " " + inspection.user.lastName);
                        }
                    });
                    angular.forEach(exam.examOwners, function(owner){
                        if(exam.examTeachers.indexOf(owner.firstName + " " + owner.lastName) === -1) {
                            exam.examTeachers.push(owner.firstName + " " + owner.lastName);
                        }
                    });
                    exam.teachersStr = exam.examTeachers.map(function(teacher) {
                        return teacher;
                    }).join(", ");
                }

                $scope.printExamDuration = function(exam) {
                   return dateService.printExamDuration(exam);
                };

                $scope.removeReservation = function(enrolment){
                    var dialog = dialogs.confirm($translate('sitnet_confirm'), $translate('sitnet_are_you_sure'));
                    dialog.result.then(function(btn){
                        $http.delete('calendar/reservation/' + enrolment.reservation.id).success(function () {
                            delete enrolment.reservation;
                            toastr.success("ok");
                        }).error(function(msg) {
                            toastr.error(msg);
                        });
                    });
                };

                $scope.showInstructions = function(enrolment) {
                    var modalController = function($scope, $modalInstance, instructions) {
                        $scope.instructions = instructions;
                        $scope.ok = function () {
                            $modalInstance.close("Accepted");
                        };
                    };

                    var modalInstance = $modal.open({
                        templateUrl: SITNET_CONF.TEMPLATES_PATH + 'reservation/show_reservation_instructions.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: modalController,
                        resolve: {
                            instructions: function () {
                                return enrolment.exam.enrollInstruction;
                            }
                        }
                    });

                    modalInstance.result.then(function() {
                        console.log("closed");
                    });
                };

                $scope.beforeDate = function(date) {
                    return Date.now() <= new Date(date);
                };

                $scope.afterDate = function(date) {
                    return Date.now() >= new Date(date);
                };

                //Go to feedback template to show teacher's comments
                $scope.showFeedback = function (id) {
                    $location.path("/feedback/exams/" + id);
                };

                $scope.getUsername = function() {
                    return sessionService.getUserName();
                };

                $scope.isExamEnded = function (enrolment) {
                    var end = moment(enrolment.exam.examActiveEndDate).utc();
                    return end.isBefore(moment());
                };

                $scope.createExam = function () {
                    examService.createExam();
                };

                $scope.createQuestion = function (type) {
                    questionService.createQuestion(type);
                };

            }]);
}());