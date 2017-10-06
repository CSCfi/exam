(function () {
    'use strict';
    angular.module('app.enrolment')
        .service('Enrolment', ['$translate', '$q', '$http', '$location', '$uibModal', 'dialogs', 'EnrollRes', 'SettingsResource',
            'StudentExamRes', 'EXAM_CONF',
            function ($translate, $q, $http, $location, $modal, dialogs, EnrollRes, SettingsResource, StudentExamRes, EXAM_CONF) {

                var self = this;

                var setMaturityInstructions = function (exam) {
                    var deferred = $q.defer();
                    if (exam.examLanguages.length !== 1) {
                        console.warn('Exam has no exam languages or it has several!');
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
                            toastr.success($translate.instant('sitnet_you_have_enrolled_to_exam') + '<br/>' +
                                $translate.instant('sitnet_remember_exam_machine_reservation'));
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
                        }, function (err) {
                            if (err.status === 403) {
                                toastr.error(err.data);
                            }
                            if (err.status === 404) {
                                self.enroll(exam);
                            }
                        }
                    );
                };

                self.enrollStudent = function (exam, student) {
                    var deferred = $q.defer();
                    var data = {eid: exam.id};
                    if (student.id) {
                        data.uid = student.id;
                    } else {
                        data.email = student.email;
                    }
                    EnrollRes.enrollStudent.create(data,
                        function (enrolment) {
                            toastr.success($translate.instant('sitnet_student_enrolled_to_exam'));
                            deferred.resolve(enrolment);
                        },
                        function (error) {
                            deferred.reject(error);
                        });
                    return deferred.promise;
                };

                self.getExamEnrolment = function (code, id) {
                    var deferred = $q.defer();
                    EnrollRes.enroll.get({code: code, id: id},
                        function (exam) {
                            exam.languages = exam.examLanguages.map(function (lang) {
                                return getLanguageNativeName(lang.code);
                            });
                            setMaturityInstructions(exam).then(function (data) {
                                exam = data;
                                EnrollRes.check.get({id: exam.id}, function (enrolments) {
                                    exam.alreadyEnrolled = true;
                                    exam.reservationMade = enrolments.some(function (e) {
                                        return e.reservation;
                                    });
                                    deferred.resolve(exam);
                                }, function (err) {
                                    exam.alreadyEnrolled = err.status !== 404;
                                    if (err.status === 403) {
                                        exam.noTrialsLeft = true;
                                    }
                                    exam.reservationMade = false;
                                    deferred.resolve(exam);
                                });
                            });
                        },
                        function (error) {
                            deferred.reject(error);
                        });
                    return deferred.promise;
                };

                self.listEnrolments = function (code, id) {
                    var deferred = $q.defer();
                    EnrollRes.list.get({code: code},
                        function (data) {
                            // remove duplicate exam, already shown at the detailed info section.
                            var exams = data.filter(function (e) {
                                return e.id !== parseInt(id);
                            });
                            exams.forEach(function (e) {
                                e.languages = e.examLanguages.map(function (lang) {
                                    return getLanguageNativeName(lang.code);
                                });
                                return e;
                            });
                            checkEnrolments(exams).then(function (data) {
                                deferred.resolve(data);
                            });
                        },
                        function (error) {
                            toastr.error(error.data);
                            deferred.reject();
                        });
                    return deferred.promise;
                };

                var check = function (exam) {
                    var deferred = $q.defer();
                    EnrollRes.check.get({id: exam.id}, function (enrolments) {
                            // check if student has reserved aquarium
                            enrolments.forEach(function (enrolment) {
                                if (enrolment.reservation) {
                                    exam.reservationMade = true;
                                }
                            });
                            // enrolled to exam
                            exam.enrolled = true;
                            deferred.resolve(exam);
                        }, function (err) {
                            // not enrolled or made reservations
                            exam.enrolled = false;
                            exam.reservationMade = false;
                            deferred.resolve(exam);
                        }
                    );
                    return deferred.promise;
                };

                var checkEnrolments = function (exams) {
                    var deferred = $q.defer();
                    var promises = [];
                    exams.forEach(function (exam) {
                        promises.push(check(exam).then(function (data) {
                            angular.extend(exam, data);
                        }));
                    });
                    $q.all(promises).then(function () {
                        deferred.resolve(exams);
                    });
                    return deferred.promise;
                };

                self.removeEnrolment = function (enrolment) {
                    return EnrollRes.enrolment.remove({id: enrolment.id}).$promise;
                };

                self.addEnrolmentInformation = function (enrolment) {
                    var modalController = ['$scope', '$uibModalInstance', function ($scope, $modalInstance) {
                        $scope.enrolment = angular.copy(enrolment);
                        $scope.ok = function () {
                            $modalInstance.close('Accepted');
                            enrolment.information = $scope.enrolment.information;
                            StudentExamRes.enrolment.update({
                                eid: enrolment.id,
                                information: $scope.enrolment.information
                            }, function () {
                                toastr.success($translate.instant('sitnet_saved'));
                            });
                        };

                        $scope.cancel = function () {
                            $modalInstance.close('Canceled');
                        };
                    }];

                    var modalInstance = $modal.open({
                        templateUrl: EXAM_CONF.TEMPLATES_PATH + 'enrolment/active/dialogs/add_enrolment_information.html',
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
                        console.log('closed');
                    });
                };

                self.getRoomInstructions = function (hash) {
                    return $http.get('/app/enroll/room/' + hash);
                };


                self.showInstructions = function (enrolment) {
                    var modalController = ['$scope', '$uibModalInstance', function ($scope, $modalInstance) {
                        $scope.title = 'sitnet_instruction';
                        $scope.instructions = enrolment.exam.enrollInstruction;
                        $scope.ok = function () {
                            $modalInstance.close('Accepted');
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
                        console.log('closed');
                    });
                };

                self.showMaturityInstructions = function (enrolment) {
                    var modalController = ['$scope', '$uibModalInstance', 'SettingsResource', function ($scope, $modalInstance, SettingsResource) {
                        if (enrolment.exam.examLanguages.length !== 1) {
                            console.warn('Exam has no exam languages or it has several!');
                        }
                        var lang = enrolment.exam.examLanguages && enrolment.exam.examLanguages.length > 0
                            ? enrolment.exam.examLanguages[0].code : 'fi';
                        $scope.title = 'sitnet_maturity_instructions';
                        SettingsResource.maturityInstructions.get({lang: lang}, function (data) {
                            $scope.instructions = data.value;
                        });
                        $scope.ok = function () {
                            $modalInstance.close('Accepted');
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
                        console.log('closed');
                    });
                };


            }]);
}());
