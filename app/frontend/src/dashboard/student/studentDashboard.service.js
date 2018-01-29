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

import angular from 'angular';
import moment from 'moment';
require('moment-timezone');

angular.module('app.dashboard.student')
    .service('StudentDashboard', ['$q', '$resource',
        function ($q, $resource) {

            const self = this;

            const enrolmentApi = $resource('/app/enrolments');

            const setOccasion = function (reservation) {
                const machine = reservation.machine;
                const external = reservation.externalReservation;
                const tz = machine ? machine.room.localTimezone : external.roomTz;
                const start = moment.tz(reservation.startAt, tz);
                const end = moment.tz(reservation.endAt, tz);
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
                const deferred = $q.defer();

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

