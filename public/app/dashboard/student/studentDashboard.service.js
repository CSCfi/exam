/*
 * Copyright (c) 2017 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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

angular.module('app.dashboard.student')
    .service('StudentDashboard', ['$q', '$resource',
        function ($q, $resource) {

            var self = this;

            var enrolmentApi = $resource('/app/enrolments');

            var setOccasion = function (reservation) {
                var machine = reservation.machine;
                var external = reservation.externalReservation;
                var tz = machine ? machine.room.localTimezone : external.roomTz;
                var start = moment.tz(reservation.startAt, tz);
                var end = moment.tz(reservation.endAt, tz);
                if (start.isDST()) {
                    start.add(-1, 'hour');
                }
                if (end.isDST()) {
                    end.add(-1, 'hour');
                }
                reservation.occasion = {
                    startAt: start.format('HH:mm'),
                    endAt: end.format('HH:mm')
                };
            };

            self.listEnrolments = function () {
                var deferred = $q.defer();

                enrolmentApi.query(function (enrolments) {
                        enrolments.forEach(function (e) {
                            if (e.reservation) {
                                setOccasion(e.reservation);
                            }
                        });
                        deferred.resolve({result: enrolments});
                    },
                    function (error) {
                        deferred.reject(error);
                    }
                );
                return deferred.promise;
            };

        }]);

