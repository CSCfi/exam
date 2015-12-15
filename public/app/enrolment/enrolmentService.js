(function () {
    'use strict';
    angular.module('exam.services')
        .service('enrolmentService', ['$translate', '$q', '$location', '$modal', 'dialogs', 'EnrollRes', 'SettingsResource',
            'StudentExamRes', 'EXAM_CONF',
            function ($translate, $q, $location, $modal, dialogs, EnrollRes, SettingsResource, StudentExamRes, EXAM_CONF) {

                var self = this;

                var setMaturityInstructions = function (exam) {
                    var deferred = $q.defer();
                    if (exam.examLanguages.length != 1) {
                        console.warn("Exam has no exam languages or it has several!");
                    }
                    var lang = exam.examLanguages.length > 0 ? exam.examLanguages[0].code : 'fi';
                    SettingsResource.maturityInstructions.get({lang: lang}, function (data) {
                        exam.maturityInstructions = data.value;
                        return deferred.resolve(exam);
                    });
                    return deferred.promise;
                };

                self.enroll = function (exam) {
                    var deferred = $q.defer();
                    EnrollRes.enroll.create({code: exam.course.code, id: exam.id},
                        function () {
                            toastr.success($translate.instant('sitnet_you_have_enrolled_to_exam') + '<br/>'
                                + $translate.instant('sitnet_remember_exam_machine_reservation'));
                            $location.path('/calendar/' + exam.id);
                            deferred.resolve();
                        },
                        function (error) {
                            toastr.error(error.data);
                            deferred.reject(error);
                        });
                    return deferred.promise;
                };

                self.checkAndEnroll = function (exam) {
                    EnrollRes.check.get({id: exam.id}, function () {
                            // already enrolled
                            toastr.error($translate.instant('sitnet_already_enrolled'));
                        }, function () {
                            self.enroll(exam);
                        }
                    )
                };

                self.enrollStudent = function (exam, student) {
                    var deferred = $q.defer();
                    EnrollRes.enrollStudent.create({eid: exam.id, uid: student.id},
                        function (enrolment) {
                            toastr.success($translate.instant('sitnet_student_enrolled_to_exam'));
                            deferred.resolve(enrolment);
                        },
                        function (error) {
                            toastr.error(error.data);
                            deferred.reject(error);
                        });
                    return deferred.promise;
                };

                self.listEnrolments = function (scope, code, id) {
                    if (id) {
                        EnrollRes.enroll.get({code: code, id: id},
                            function (exam) {
                                exam.languages = exam.examLanguages.map(function (lang) {
                                    return getLanguageNativeName(lang.code);
                                });
                                setMaturityInstructions(exam).then(function(data) {
                                    exam = data;
                                    EnrollRes.check.get({id: exam.id}, function () {
                                        exam.notEnrolled = false;
                                        scope.exam = exam;
                                    }, function () {
                                        exam.notEnrolled = true;
                                        scope.exam = exam;
                                    });
                                });
                            },
                            function (error) {
                                toastr.error(error.data);
                            });
                    } else {
                        EnrollRes.list.get({code: code},
                            function (exams) {
                                scope.exams = exams.map(function (exam) {
                                    exam.languages = exam.examLanguages.map(function (lang) {
                                        return getLanguageNativeName(lang.code);
                                    });
                                    return exam;
                                });
                            },
                            function (error) {
                                toastr.error(error.data);
                            });
                    }
                };

                self.removeEnrolment = function(enrolment, enrolments) {
                    if (enrolment.reservation) {
                        toastr.error($translate.instant('sitnet_cancel_reservation_first'));
                    } else {
                        dialogs.confirm($translate.instant('sitnet_confirm'),
                            $translate.instant('sitnet_are_you_sure')).result
                            .then(function () {
                                EnrollRes.enrolment.remove({id: enrolment.id}, function () {
                                    enrolments.splice(enrolments.indexOf(enrolment), 1);
                                });
                            });
                    }
                };

                self.gotoList = function (code) {
                    $location.path('enroll/' + code);
                };

                self.addEnrolmentInformation = function (enrolment) {
                    var modalController = ["$scope", "$modalInstance", function ($scope, $modalInstance) {
                        $scope.enrolment = angular.copy(enrolment);
                        $scope.ok = function () {
                            $modalInstance.close("Accepted");
                            enrolment.information = $scope.enrolment.information;
                            StudentExamRes.enrolment.update({
                                eid: enrolment.id,
                                information: $scope.enrolment.information
                            }, function () {
                                toastr.success($translate.instant('sitnet_saved'));
                            })
                        };

                        $scope.cancel = function () {
                            $modalInstance.close("Canceled");
                        }
                    }];

                    var modalInstance = $modal.open({
                        templateUrl: EXAM_CONF.TEMPLATES_PATH + 'enrolment/add_enrolment_information.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: modalController,
                        resolve: {
                            enrolment: function () {
                                return enrolment;
                            }
                        }
                    });

                    modalInstance.result.then(function () {
                        console.log("closed");
                    });
                };

                self.showInstructions = function (enrolment) {
                    var modalController = ["$scope", "$modalInstance", function ($scope, $modalInstance) {
                        $scope.title = 'sitnet_instruction';
                        $scope.instructions = enrolment.exam.enrollInstruction;
                        $scope.ok = function () {
                            $modalInstance.close("Accepted");
                        };
                    }];

                    var modalInstance = $modal.open({
                        templateUrl: EXAM_CONF.TEMPLATES_PATH + 'reservation/show_instructions.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: modalController,
                        resolve: {
                            instructions: function () {
                                return enrolment.exam.enrollInstruction;
                            }
                        }
                    });

                    modalInstance.result.then(function () {
                        console.log("closed");
                    });
                };

                self.showMaturityInstructions = function (enrolment) {
                    var modalController = ["$scope", "$modalInstance", "SettingsResource", function ($scope, $modalInstance, SettingsResource) {
                        if (enrolment.exam.examLanguages.length !== 1) {
                            console.warn("Exam has no exam languages or it has several!");
                        }
                        var lang = enrolment.exam.examLanguages.length > 0 ? enrolment.exam.examLanguages[0].code : 'fi';
                        $scope.title = 'sitnet_maturity_instructions';
                        SettingsResource.maturityInstructions.get({lang: lang}, function (data) {
                            $scope.instructions = data.value;
                        });
                        $scope.ok = function () {
                            $modalInstance.close("Accepted");
                        };
                    }];

                    var modalInstance = $modal.open({
                        templateUrl: EXAM_CONF.TEMPLATES_PATH + 'reservation/show_instructions.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: modalController,
                        resolve: {
                            instructions: function () {
                                return enrolment.exam.enrollInstruction;
                            }
                        }
                    });

                    modalInstance.result.then(function () {
                        console.log("closed");
                    });
                };

            }]);
}());
