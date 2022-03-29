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
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { addHours, format, parseISO } from 'date-fns';
import { zonedTimeToUtc } from 'date-fns-tz';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ExamEnrolment } from '../../enrolment/enrolment.model';
import type { Reservation } from '../../reservation/reservation.model';
import { DateTimeService } from '../../utility/date/date.service';

interface Occasion {
    startAt: string;
    endAt: string;
}

export interface DashboardEnrolment extends ExamEnrolment {
    occasion?: Occasion;
    startAtAggregate: string;
}

@Injectable()
export class StudentDashboardService {
    constructor(private http: HttpClient, private DateTime: DateTimeService) {}

    listEnrolments = (): Observable<DashboardEnrolment[]> =>
        this.http.get<ExamEnrolment[]>('/app/student/enrolments').pipe(
            map((enrolments) =>
                enrolments.map((e) => {
                    const occasion = e.reservation ? this.getOccasion(e.reservation) : undefined;
                    const startAt = e.reservation ? e.reservation.startAt : 0;
                    return {
                        ...e,
                        occasion,
                        startAtAggregate: startAt.toString(),
                    };
                }),
            ),
        );

    private getOccasion(reservation: Reservation): Occasion {
        const machine = reservation.machine;
        const external = reservation.externalReservation;
        let tz;
        if (external) {
            tz = external.roomTz;
        } else if (machine) {
            tz = machine.room.localTimezone;
        }
        let start = tz ? zonedTimeToUtc(parseISO(reservation.startAt), tz) : parseISO(reservation.startAt);
        let end = tz ? zonedTimeToUtc(parseISO(reservation.endAt), tz) : parseISO(reservation.endAt);
        if (this.DateTime.isDST(start)) {
            start = addHours(start, -1);
        }
        if (this.DateTime.isDST(end)) {
            end = addHours(end, -1);
        }
        return {
            startAt: format(start, 'HH:mm'),
            endAt: format(end, 'HH:mm'),
        };
    }
}
