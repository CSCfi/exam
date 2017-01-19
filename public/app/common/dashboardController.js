(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('DashboardCtrl', ['$scope', 'dashboardService', 'examService', 'questionService',
            'reservationService', 'dateService', 'enrolmentService', 'sessionService','EXAM_CONF', 'ExamRes',
            'dialogs','$translate', '$location',
            function ($scope, dashboardService, examService, questionService, reservationService, dateService,
                      enrolmentService, sessionService, EXAM_CONF, ExamRes, dialogs, $translate, $location) {

                $scope.evaluationPath = EXAM_CONF.TEMPLATES_PATH + "enrolment/exam_feedback.html";

                $scope.filter = {ordering: '-ended'};
                $scope.templates = dashboardService.getTemplates();
                // Pagesize for showing finished exams
                $scope.pageSize = 10;
                $scope.showInst = 0;
                $scope.showEval = 0;
                $scope.filtertext = '';


                $scope.printExamDuration = function (exam) {
                    return dateService.printExamDuration(exam);
                };

                $scope.removeReservation = function (enrolment) {
                    reservationService.removeReservation(enrolment);
                };

                $scope.showInstructions = function (id) {

                    if($scope.showInst == id) {
                        $scope.showInst = 0;
                    }
                    else {
                        $scope.showInst = id;
                    }
                };

                $scope.showEvaluations = function (id) {

                    if($scope.showEval == id) {
                        $scope.showEval = 0;
                    }
                    else {
                        $scope.showEval = id;
                    }
                };

                $scope.showMaturityInstructions = function (enrolment) {
                    enrolmentService.showMaturityInstructions(enrolment);
                };

                $scope.addEnrolmentInformation = function (enrolment) {
                    enrolmentService.addEnrolmentInformation(enrolment);
                };

                //Go to feedback template to show teacher's comments
                $scope.showFeedback = function (id) {
                    examService.showFeedback(id);
                };

                $scope.searchParticipations = function () {

                    return dashboardService.searchParticipations($scope.filter.text).then(function (data) {
                        $scope.participations = data.participations;
                        removeDuplicates();
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                $scope.getUsername = function () {
                    return sessionService.getUserName();
                };

                $scope.removeEnrolment = function (enrolment, enrolments) {
                    enrolmentService.removeEnrolment(enrolment, enrolments);
                };

                $scope.showReservations = function (examId) {
                    reservationService.viewReservations(examId);
                };

                $scope.getExecutionTypeTranslation = function (exam) {
                    return examService.getExecutionTypeTranslation(exam.executionType.type);
                };


                $scope.search = function () {
                    ExamRes.reviewerExams.query({filter: $scope.filtertext}, function (exams) {
                        exams.forEach(function (exam) {
                            if (!exam.examLanguages) {
                                console.warn("No languages for exam #" + exam.id);
                                exam.examLanguages = [];
                            }
                            exam.languages = exam.examLanguages.map(function (lang) {
                                return getLanguageNativeName(lang.code);
                            });
                        });
                        $scope.finishedExams = exams;
                        //$scope.loader.loading = false;
                    }, function (err) {
                        //$scope.loader.loading = false;
                        toastr.error($translate.instant(err.data));
                    });
                };

                dashboardService.showDashboard().then(function (data) {
                    for (var k in data) {
                        if (data.hasOwnProperty(k)) {
                            $scope[k] = data[k];
                        }
                    }
                }, function (error) {
                    toastr.error(error.data);
                });

                $scope.copyExam = function (exam, type) {
                    ExamRes.exams.copy({id: exam.id, type: type}, function (copy) {
                        toastr.success($translate.instant('sitnet_exam_copied'));
                        $location.path("/exams/examTabs/"+copy.id+"/1/");
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                $scope.deleteExam = function (exam, listing) {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_remove_exam'));
                    dialog.result.then(function (btn) {
                        ExamRes.exams.remove({id: exam.id}, function (ex) {
                            toastr.success($translate.instant('sitnet_exam_removed'));
                            if(listing == 'archived') {
                                $scope.archivedExams.splice($scope.archivedExams.indexOf(exam), 1);
                            }
                            if(listing == 'finished') {
                                $scope.finishedExams.splice($scope.finishedExams.indexOf(exam), 1);
                            }


                        }, function (error) {
                            toastr.error(error.data);
                        });
                    }, function (btn) {

                    });
                };

                $scope.filterOwners = function (userId, exam) {
                    var owner = exam.examOwners.filter(function (own) {
                        return (own.id === userId);
                    });
                    if(owner.length > 0) { return true; }
                    return false;
                };

                var removeDuplicates = function() {

                      // remove duplicate exams. Too lazy to do this on the backend query, it's broken somehow.
                    var arrResult = {};
                    for (var i = 0, n = $scope.participations.length; i < n; i++) {
                        var item = $scope.participations[i];
                        arrResult[ $scope.participations[i].id ] = item;
                    }
                    var i = 0;
                    var nonDuplicatedArray = [];
                    for(var item in arrResult) {
                        nonDuplicatedArray[i++] = arrResult[item];
                    }

                    $scope.participations = nonDuplicatedArray;

                }

            }]);
}());
