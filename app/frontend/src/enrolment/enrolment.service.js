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

import toast from 'toastr';

angular.module('app.enrolment')
    .service('Enrolment', ['$translate', '$q', '$http', '$location', '$uibModal', 'dialogs', 'Language',
        'EnrollRes', 'SettingsResource', 'StudentExamRes',
        function ($translate, $q, $http, $location, $modal, dialogs, Language, EnrollRes, SettingsResource,
                  StudentExamRes) {

            const self = this;

            const setMaturityInstructions = function (exam) {
                const deferred = $q.defer();
                if (exam.examLanguages.length !== 1) {
                    console.warn('Exam has no exam languages or it has several!');
                }
                const lang = exam.examLanguages.length > 0 ? exam.examLanguages[0].code : 'fi';
                SettingsResource.maturityInstructions.get({lang: lang}, function (data) {
                    exam.maturityInstructions = data.value;
                    return deferred.resolve(exam);
                });
                return deferred.promise;
            };

            self.enroll = function (exam) {
                const deferred = $q.defer();
                EnrollRes.enroll.create({code: exam.course.code, id: exam.id},
                    function () {
                        toast.success($translate.instant('sitnet_you_have_enrolled_to_exam') + '<br/>' +
                            $translate.instant('sitnet_remember_exam_machine_reservation'));
                        $location.path('/calendar/' + exam.id);
                        deferred.resolve();
                    },
                    function (error) {
                        toast.error(error.data);
                        deferred.reject(error);
                    });
                return deferred.promise;
            };

            self.checkAndEnroll = function (exam) {
                const deferred = $q.defer();
                EnrollRes.check.get({id: exam.id}, function () {
                        // already enrolled
                        toast.error($translate.instant('sitnet_already_enrolled'));
                        deferred.resolve();
                    }, function (err) {
                        if (err.status === 403) {
                            toast.error(err.data);
                            deferred.reject(err);
                        }
                        if (err.status === 404) {
                            self.enroll(exam).then(function () {
                                deferred.resolve();
                            }, function (error) {
                                deferred.reject(error);
                            });
                        } else {
                            deferred.resolve();
                        }
                    }
                );
                return deferred.promise;
            };

            self.enrollStudent = function (exam, student) {
                const deferred = $q.defer();
                const data = {eid: exam.id};
                if (student.id) {
                    data.uid = student.id;
                } else {
                    data.email = student.email;
                }
                EnrollRes.enrollStudent.create(data,
                    function (enrolment) {
                        toast.success($translate.instant('sitnet_student_enrolled_to_exam'));
                        deferred.resolve(enrolment);
                    },
                    function (error) {
                        deferred.reject(error);
                    });
                return deferred.promise;
            };

            self.getExamEnrolment = function (code, id) {
                const deferred = $q.defer();
                EnrollRes.enroll.get({code: code, id: id},
                    function (exam) {
                        exam.languages = exam.examLanguages.map(function (lang) {
                            return Language.getLanguageNativeName(lang.code);
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
                const deferred = $q.defer();
                EnrollRes.list.get({code: code},
                    function (data) {
                        // remove duplicate exam, already shown at the detailed info section.
                        var exams = data.filter(function (e) {
                            return e.id !== parseInt(id);
                        });
                        exams.forEach(function (e) {
                            e.languages = e.examLanguages.map(function (lang) {
                                return Language.getLanguageNativeName(lang.code);
                            });
                            return e;
                        });
                        checkEnrolments(exams).then(function (data) {
                            deferred.resolve(data);
                        });
                    },
                    function (error) {
                        toast.error(error.data);
                        deferred.reject();
                    });
                return deferred.promise;
            };

            const check = function (exam) {
                const deferred = $q.defer();
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

            const checkEnrolments = function (exams) {
                const deferred = $q.defer();
                const promises = [];
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
                const modalController = ['$scope', '$uibModalInstance', function ($scope, $modalInstance) {
                    $scope.enrolment = angular.copy(enrolment);
                    $scope.ok = function () {
                        $modalInstance.close('Accepted');
                        enrolment.information = $scope.enrolment.information;
                        StudentExamRes.enrolment.update({
                            eid: enrolment.id,
                            information: $scope.enrolment.information
                        }, function () {
                            toast.success($translate.instant('sitnet_saved'));
                        });
                    };

                    $scope.cancel = function () {
                        $modalInstance.close('Canceled');
                    };
                }];

                const modalInstance = $modal.open({
                    template: require('./active/dialogs/add_enrolment_information.html'),
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
                const modalController = ['$scope', '$uibModalInstance', function ($scope, $modalInstance) {
                    $scope.title = 'sitnet_instruction';
                    $scope.instructions = enrolment.exam.enrollInstruction;
                    $scope.ok = function () {
                        $modalInstance.close('Accepted');
                    };
                }];

                const modalInstance = $modal.open({
                    template: require('./active/dialogs/show_instructions.html'),
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
                const modalController = ['$scope', '$uibModalInstance', 'SettingsResource', function ($scope, $modalInstance, SettingsResource) {
                    if (enrolment.exam.examLanguages.length !== 1) {
                        console.warn('Exam has no exam languages or it has several!');
                    }
                    const lang = enrolment.exam.examLanguages && enrolment.exam.examLanguages.length > 0
                        ? enrolment.exam.examLanguages[0].code : 'fi';
                    $scope.title = 'sitnet_maturity_instructions';
                    SettingsResource.maturityInstructions.get({lang: lang}, function (data) {
                        $scope.instructions = data.value;
                    });
                    $scope.ok = function () {
                        $modalInstance.close('Accepted');
                    };
                }];

                const modalInstance = $modal.open({
                    template: require('./active/dialogs/show_instructions.html'),
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

