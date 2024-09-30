// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { DateTime } from 'luxon';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DashboardEnrolment, Occasion } from 'src/app/dashboard/dashboard.model';
import type { ExamEnrolment } from 'src/app/enrolment/enrolment.model';
import type { Reservation } from 'src/app/reservation/reservation.model';
import { DateTimeService } from 'src/app/shared/date/date.service';

@Injectable({ providedIn: 'root' })
export class StudentDashboardService {
    constructor(
        private http: HttpClient,
        private DateTime: DateTimeService,
    ) {}

    listEnrolments$ = (): Observable<DashboardEnrolment[]> =>
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
        } else {
            tz = 'Europe/Helsinki';
        }
        const start = DateTime.fromISO(reservation.startAt, { zone: tz });
        const end = DateTime.fromISO(reservation.endAt, { zone: tz });
        return {
            startAt: start.isInDST
                ? start.minus({ hours: 1 }).toLocaleString(DateTime.TIME_24_SIMPLE)
                : start.toLocaleString(DateTime.TIME_24_SIMPLE),
            endAt: end.isInDST
                ? end.minus({ hours: 1 }).toLocaleString(DateTime.TIME_24_SIMPLE)
                : end.toLocaleString(DateTime.TIME_24_SIMPLE),
            tz: tz,
        };
    }
}
