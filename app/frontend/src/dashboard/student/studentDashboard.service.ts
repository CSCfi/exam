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

import * as angular from 'angular';
import * as moment from 'moment';
import * as mtz from 'moment-timezone';
import { IQService, IHttpService, IHttpResponse } from 'angular';

interface Reservation {
    machine?: {
        room: { localTimezone: string },
    };
    externalReservation?: {
        roomTz: string;
    };
    startAt: moment.MomentInput;
    endAt: moment.MomentInput;
    occasion: {
        startAt: string;
        endAt: string;
    };
}

export class StudentDashboardService {

    constructor(private $q: IQService, private $http: IHttpService) {
        'ngInject';
    }

    listEnrolments(): angular.IPromise<{ result: any[] }> {
        const deferred: angular.IDeferred<{ result: any[] }> = this.$q.defer();

        this.$http.get('/app/enrolments').then((resp: IHttpResponse<{ reservation: Reservation }[]>) => {
            const enrolments = resp.data;
            enrolments.forEach((e) => {
                if (e.reservation) {
                    this.setOccasion(e.reservation);
                }
            });
            deferred.resolve({ result: enrolments });
        }).catch((resp) => {
            deferred.reject(resp);
        });
        return deferred.promise;
    }

    private setOccasion(reservation: Reservation) {
        const machine = reservation.machine;
        const external = reservation.externalReservation;
        let tz;
        if (external) {
            tz = external.roomTz;
        } else if (machine) {
            tz = machine.room.localTimezone;
        }
        // const tz = machine ? machine.room.localTimezone : external.roomTz;
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
    }

}
