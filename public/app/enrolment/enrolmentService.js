(function () {
    'use strict';
    angular.module('exam.services')
        .factory('enrolmentService', ['$translate', '$q', '$location', '$modal', 'EnrollRes', 'EXAM_CONF',
            function ($translate, $q, $location, $modal, EnrollRes, EXAM_CONF) {

                var enroll = function (exam) {
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

                var enrollStudent = function (exam, student) {
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

                var showInstructions = function (enrolment) {
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

                var showMaturityInstructions = function (enrolment) {
                    var modalController = ["$scope", "$modalInstance", "SettingsResource", function ($scope, $modalInstance, SettingsResource) {
                        var lang = enrolment.exam.examLanguages.length > 0 ? enrolment.exam.examLanguages[0].code : 'fi';
                        $scope.title = 'sitnet_maturity_instructions';
                        SettingsResource.maturityInstructions.get({lang: lang}, function(data) {
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

                return {
                    enroll: enroll,
                    enrollStudent: enrollStudent,
                    showInstructions: showInstructions,
                    showMaturityInstructions: showMaturityInstructions
                };

            }]);
}());
