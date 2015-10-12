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
                        $scope.instructions = enrolment.exam.enrollInstruction;
                        $scope.ok = function () {
                            $modalInstance.close("Accepted");
                        };
                    }];

                    var modalInstance = $modal.open({
                        templateUrl: EXAM_CONF.TEMPLATES_PATH + 'reservation/show_reservation_instructions.html',
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
                    showInstructions: showInstructions
                };

            }]);
}());
