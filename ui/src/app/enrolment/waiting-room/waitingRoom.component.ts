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
import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { StateService } from '@uirouter/core';
import * as moment from 'moment';
import * as toast from 'toastr';

import { SessionService } from '../../session/session.service';
import { WindowRef } from '../../utility/window/window.service';

import type { OnDestroy, OnInit } from '@angular/core';
import type { ExamRoom, Reservation } from '../../reservation/reservation.model';
import type { ExamEnrolment } from '../enrolment.model';

type WaitingReservation = Reservation & { occasion: { startAt: string; endAt: string } };
type WaitingEnrolment = Omit<ExamEnrolment, 'reservation'> & {
    reservation: WaitingReservation;
};

@Component({
    selector: 'waiting-room',
    templateUrl: './waitingRoom.component.html',
})
export class WaitingRoomComponent implements OnInit, OnDestroy {
    enrolment: WaitingEnrolment;
    isUpcoming: boolean;
    timeoutId: number;
    roomInstructions: string;

    constructor(
        private http: HttpClient,
        private state: StateService,
        private translate: TranslateService,
        private Session: SessionService,
        private Window: WindowRef,
    ) {}

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

    ngOnInit() {
        if (this.state.params.id) {
            this.isUpcoming = true;
            this.http.get<WaitingEnrolment>(`/app/student/enrolments/${this.state.params.id}`).subscribe(
                (enrolment) => {
                    this.setOccasion(enrolment.reservation);
                    this.enrolment = enrolment;
                    const offset = this.calculateOffset();
                    this.timeoutId = this.Window.nativeWindow.setTimeout(this.Session.checkSession, offset);
                    if (this.enrolment.reservation) {
                        const room = this.enrolment.reservation.machine.room;
                        const code = this.translate.currentLang.toUpperCase();
                        this.roomInstructions = this.getRoomInstructions(code, room);
                    }
                },
                (err) => toast.error(err.data),
            );
        }
    }

    ngOnDestroy() {
        this.Window.nativeWindow.clearTimeout(this.timeoutId);
    }

    private setOccasion = (reservation: WaitingReservation) => {
        if (!reservation) {
            return;
        }
        const tz = reservation.machine.room.localTimezone;
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
            endAt: end.format('HH:mm'),
        };
    };

    private getStart = () => {
        if (this.enrolment.examinationEventConfiguration) {
            return moment(this.enrolment.examinationEventConfiguration.examinationEvent.start);
        }
        const start = moment(this.enrolment.reservation.startAt);
        if (moment().isDST()) {
            start.add(-1, 'hour');
        }
        return start;
    };

    private calculateOffset = () => Date.parse(this.getStart().format()) - new Date().getTime();
}
