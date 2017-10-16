'use strict';
angular.module('app.reservation')
    .service('Reservation', ['$q', '$uibModal', '$http', '$translate', 'dialogs',
        'ReservationResource', 'EXAM_CONF', 'InteroperabilityResource',
        function ($q, $modal, $http, $translate, dialogs,
                  ReservationRes, EXAM_CONF, InteroperabilityRes) {

            var self = this;

            self.removeReservation = function (enrolment) {
                var externalRef = enrolment.reservation.externalRef;
                var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_are_you_sure'));
                var successFn = function () {
                    delete enrolment.reservation;
                    enrolment.reservationCanceled = true;
                };
                var errorFn = function (msg) {
                    toastr.error(msg);
                };
                dialog.result.then(function (btn) {
                    if (externalRef) {
                        InteroperabilityRes.reservation.remove({ref: externalRef}, successFn, errorFn);
                    } else {
                        $http.delete('/app/calendar/reservation/' + enrolment.reservation.id)
                            .success(successFn)
                            .error(errorFn);
                    }
                });
            };

            self.getReservationCount = function (exam) {
                return exam.examEnrolments.filter(function (enrolment) {
                    return enrolment.reservation && enrolment.reservation.endAt > new Date().getTime();
                }).length;
            };

            self.changeMachine = function (reservation) {
                var modalController = ["$scope", "$uibModalInstance", function ($scope, $modalInstance) {
                    $scope.selection = {};
                    $scope.availableMachines = ReservationRes.availableMachines.query({id: reservation.id});
                    $scope.ok = function () {
                        ReservationRes.machine.update({
                            id: reservation.id,
                            machineId: $scope.selection.machineId
                        }, function (machine) {
                            toastr.info($translate.instant("sitnet_updated"));
                            reservation.machine = machine;
                            $modalInstance.close("Accepted");
                        }, function (msg) {
                            toastr.error(msg);
                        });
                    };

                    $scope.cancel = function () {
                        $modalInstance.close("Dismissed");
                    };

                }];

                var modalInstance = $modal.open({
                    templateUrl: EXAM_CONF.TEMPLATES_PATH + 'reservation/admin/change_machine_dialog.html',
                    backdrop: 'static',
                    keyboard: true,
                    controller: modalController
                });

                modalInstance.result.then(function () {
                    console.log("closed");
                });
            };

            self.cancelReservation = function (reservation) {
                var deferred = $q.defer();
                var modalController = ["$scope", "$uibModalInstance", function ($scope, $modalInstance) {
                    $scope.message = {};
                    $scope.ok = function () {
                        ReservationRes.reservation.remove({id: reservation.id, msg: $scope.message.text},
                            function () {
                                $modalInstance.close("Accepted");
                                deferred.resolve("ok");
                            }, function (error) {
                                toastr.error(error.data);
                            });
                    };

                    $scope.cancel = function () {
                        $modalInstance.close("Dismissed");
                        deferred.reject();
                    };

                }];

                var modalInstance = $modal.open({
                    templateUrl: EXAM_CONF.TEMPLATES_PATH + 'reservation/admin/remove_reservation_dialog.html',
                    backdrop: 'static',
                    keyboard: true,
                    controller: modalController
                });

                modalInstance.result.then(function () {
                    console.log("closed");
                    deferred.reject();
                });
                return deferred.promise;
            };


        }]);

