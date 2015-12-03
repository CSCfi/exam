(function () {
    'use strict';
    angular.module('exam.services')
        .service('reservationService', ['$q', '$modal', '$http', '$translate', '$location', 'dialogs',
            function ($q, $modal, $http, $translate, $location, dialogs) {

                var self = this;

                self.removeReservation = function (enrolment) {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_are_you_sure'));
                    dialog.result.then(function (btn) {
                        $http.delete('calendar/reservation/' + enrolment.reservation.id).success(function () {
                            delete enrolment.reservation;
                            enrolment.reservationCanceled = true;
                        }).error(function (msg) {
                            toastr.error(msg);
                        });
                    });
                };

                self.getReservationCount = function (exam) {
                    return exam.examEnrolments.filter(function (enrolment) {
                        return enrolment.reservation && enrolment.reservation.endAt > new Date().getTime();
                    }).length;
                };

                self.viewReservations = function (examId) {
                    $location.path('/reservations').search({eid: examId});
                }

            }]);
}());
