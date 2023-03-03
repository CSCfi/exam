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
import type { OnDestroy, OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { ToastrService } from 'ngx-toastr';
import type { ExamRoom, Reservation } from '../../reservation/reservation.model';
import { SessionService } from '../../session/session.service';
import { DateTimeService } from '../../shared/date/date.service';
import type { ExamEnrolment } from '../enrolment.model';

type WaitingReservation = Reservation & { occasion: { startAt: string; endAt: string } };
type WaitingEnrolment = Omit<ExamEnrolment, 'reservation'> & {
    reservation: WaitingReservation;
};

@Component({
    selector: 'xm-waiting-room',
    templateUrl: './waiting-room.component.html',
})
export class WaitingRoomComponent implements OnInit, OnDestroy {
    enrolment!: WaitingEnrolment;
    isUpcoming = false;
    timeoutId = 0;
    roomInstructions = '';

    constructor(
        private http: HttpClient,
        private route: ActivatedRoute,
        private translate: TranslateService,
        private toast: ToastrService,
        private Session: SessionService,
        private DateTimeService: DateTimeService,
    ) {}

    ngOnInit() {
        if (this.route.snapshot.params.id && this.route.snapshot.params.hash) {
            this.isUpcoming = true;
            this.http.get<WaitingEnrolment>(`/app/student/enrolments/${this.route.snapshot.params.id}`).subscribe({
                next: (enrolment) => {
                    this.setOccasion(enrolment.reservation);
                    this.enrolment = enrolment;
                    const offset = this.calculateOffset();
                    this.timeoutId = window.setTimeout(this.Session.checkSession, offset);
                    if (this.enrolment.reservation) {
                        const room = this.enrolment.reservation.machine.room;
                        const code = this.translate.currentLang.toUpperCase();
                        this.roomInstructions = this.getRoomInstructions(code, room);
                    }
                    this.http
                        .post<void>(`/app/student/exam/${this.route.snapshot.params.hash}`, {})
                        .subscribe(() => console.log(`exam ${this.route.snapshot.params.hash} prepared ok`));
                },
                error: (err) => this.toast.error(err),
            });
        }
    }

    ngOnDestroy() {
        window.clearTimeout(this.timeoutId);
    }

    private getRoomInstructions = (lang: string, room: ExamRoom) => {
        switch (lang) {
            case 'FI':
                return room.roomInstruction;
            case 'SV':
                return room.roomInstructionSV;
            default:
                return room.roomInstructionEN;
        }
    };

    private setOccasion = (reservation: WaitingReservation) => {
        if (!reservation) {
            return;
        }
        const tz = reservation.machine.room.localTimezone;
        const start = DateTime.fromISO(reservation.startAt, { zone: tz });
        const end = DateTime.fromISO(reservation.endAt, { zone: tz });
        reservation.occasion = {
            startAt: start.minus({ hour: start.isInDST ? 1 : 0 }).toLocaleString(DateTime.TIME_24_SIMPLE),
            endAt: end.minus({ hour: end.isInDST ? 1 : 0 }).toLocaleString(DateTime.TIME_24_SIMPLE),
        };
    };

    private getStart = () => {
        if (this.enrolment.examinationEventConfiguration) {
            return DateTime.fromISO(this.enrolment.examinationEventConfiguration.examinationEvent.start).toJSDate();
        }
        const start = DateTime.fromISO(this.enrolment.reservation.startAt);
        if (this.DateTimeService.isDST(new Date())) {
            return start.minus({ hour: 1 }).toJSDate();
        }
        return start.toJSDate();
    };

    private calculateOffset = () => this.getStart().getTime() - new Date().getTime();
}
