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
import { Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { StateParams } from '@uirouter/core';
import * as moment from 'moment';
import * as toast from 'toastr';

import { ExamRoom, Reservation } from '../../reservation/reservation.model';
import { WindowRef } from '../../utility/window/window.service';
import { ExamEnrolment } from '../enrolment.model';

type WaitingReservation = Reservation & { occasion: { startAt: string; endAt: string } };
type WaitingEnrolment = Omit<ExamEnrolment, 'reservation'> & {
    reservation: WaitingReservation;
};

@Component({
    selector: 'waiting-room',
    template: require('./waitingRoom.component.html'),
})
export class WaitingRoomComponent implements OnInit, OnDestroy {
    enrolment: WaitingEnrolment;
    isUpcoming: boolean;
    timeoutId: number;
    roomInstructions: string;

    constructor(
        private http: HttpClient,
        @Inject('$stateParams') private stateParams: StateParams,
        private translate: TranslateService,
        private location: Location,
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
        if (this.stateParams.id) {
            this.isUpcoming = true;
            this.http.get<WaitingEnrolment>(`/app/student/enrolments/${this.stateParams.id}`).subscribe(
                enrolment => {
                    if (!enrolment.reservation) {
                        throw Error('no reservation found');
                    }
                    this.setOccasion(enrolment.reservation);
                    this.enrolment = enrolment;
                    const offset = this.calculateOffset();
                    this.timeoutId = this.Window.nativeWindow(
                        () => this.location.go(`/student/exam/${this.enrolment.exam.hash}`),
                        offset,
                    );

                    if (this.enrolment.reservation) {
                        const room = this.enrolment.reservation.machine.room;
                        const code = this.translate.currentLang.toUpperCase();
                        this.roomInstructions = this.getRoomInstructions(code, room);
                    }
                },
                err => toast.error(err.data),
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

    private calculateOffset = () => {
        const startsAt = moment(this.enrolment.reservation.startAt);
        const now = moment();
        if (now.isDST()) {
            startsAt.add(-1, 'hour');
        }
        return Date.parse(startsAt.format()) - new Date().getTime();
    };
}
