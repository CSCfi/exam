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

var toast = require('toastr');

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
                var errorFn = function (resp) {
                    toast.error(resp.data);
                };
                dialog.result.then(function () {
                    if (externalRef) {
                        InteroperabilityRes.reservation.remove({ref: externalRef}, successFn, errorFn);
                    } else {
                        $http.delete('/app/calendar/reservation/' + enrolment.reservation.id)
                            .then(successFn)
                            .catch(errorFn);
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
                            toast.info($translate.instant("sitnet_updated"));
                            reservation.machine = machine;
                            $modalInstance.close("Accepted");
                        }, function (msg) {
                            toast.error(msg);
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
                                toast.error(error.data);
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

