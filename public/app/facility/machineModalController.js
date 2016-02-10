(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('MachineModalController', ['$scope', '$translate', '$filter', 'sessionService', '$uibModalInstance',
            'params','EnrollRes',
            function ($scope, $translate, $filter, sessionService, $modalInstance, params, EnrollRes) {

                $scope.machine = params.machine;
                $scope.reservations = [];
                $scope.enrollments = [];

                EnrollRes.reservations.get({id: $scope.machine.id},
                    function (reservations) {
                        $scope.reservations = reservations;

                        if(reservations) {
                            angular.forEach(reservations, function(reservation) {
                                EnrollRes.enrolmentsByReservation.get({id: reservation.id}, function (enrollment) {
                                        $scope.enrollments = $scope.enrollments.concat(enrollment); // merging arrays into one
                                },
                                function (error) {
                                    toastr.error(error.data);
                                });
                            });
                        }
                    },
                    function (error) {
                        toastr.error(error.data);
                    }
                );


                // Cancel button is pressed in the modal dialog
                $scope.cancel = function () {
                    $modalInstance.dismiss('Canceled');
                };

                // Ok button is pressed in the modal dialog
                $scope.ok = function () {
                    $modalInstance.close($scope.machine);
                };

                $scope.setEmail = function(enrollment) {

                    function setSubject(enrollment) {
                        return enrollment.exam.course.code + " - " + enrollment.exam.course.name;
                    }

                    function setBody(enrollment) {

                        var date = function(input) {
                            return $filter("date")(new Date(input), "dd.MM.yyyy");
                        };
                        var hours = function(input) {
                            return $filter("date")(new Date(input), "HH:mm");
                        };

                        return $translate.instant("sitnet_email_hi") + ",\n\n" +
                            $translate.instant("sitnet_email_body_text") + "\n\n" +
                            enrollment.exam.course.code + " - " + enrollment.exam.course.name + ", " + $translate.instant("sitnet_date_short") + "." +
                            date(enrollment.reservation.startAt) + " " + $translate.instant("sitnet_clock_short") + " " +
                            hours(enrollment.reservation.startAt) + " - " + hours(enrollment.reservation.endAt) +
                            "\n\n\n - " + sessionService.getUserName();
                    }

                    return encodeURI("mailto:" + enrollment.user.email + "?subject=" + setSubject(enrollment) + "&body=" + setBody(enrollment));
                };


            }]);
}());
