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

import * as toast from 'toastr';
import * as moment from 'moment';
import { Component, OnInit, Inject, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { Location } from '@angular/common';
import { ExamEnrolment } from '../enrolment.model';

@Component({
    selector: 'waiting-room',
    template: require('./waitingRoom.component.html')
})
export class WaitingRoomComponent implements OnInit, OnDestroy {

    enrolment: any;
    isUpcoming: boolean;
    timeoutId: number;
    roomInstructions: string;

    constructor(
        private http: HttpClient,
        @Inject('$routeParams') private RouteParams: any,
        private translate: TranslateService,
        private location: Location
    ) { }

    ngOnInit() {
        if (this.RouteParams.id) {
            this.isUpcoming = true;
            this.http.get<ExamEnrolment>(`/app/student/enrolments/${this.RouteParams.id}`).subscribe(
                enrolment => {
                    if (!enrolment.reservation) {
                        throw Error('no reservation found');
                    }
                    this.setOccasion(enrolment.reservation);
                    this.enrolment = enrolment;
                    const offset = this.calculateOffset();
                    this.timeoutId = window.setTimeout(
                        () => this.location.go(`/student/exam/${this.enrolment.exam.hash}`), offset);

                    window.setTimeout(() => {
                        const room = this.enrolment.reservation.machine.room;
                        const code = this.translate.currentLang.toUpperCase();
                        this.roomInstructions = code === 'FI' ? room.roomInstruction : room['roomInstruction' + code];
                    }, 1000);
                },
                err => toast.error(err.data)
            );
        }
    }

    ngOnDestroy() {
        window.clearTimeout(this.timeoutId);
    }

    private setOccasion = (reservation) => {
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
            endAt: end.format('HH:mm')
        };
    }

    private calculateOffset = () => {
        const startsAt = moment(this.enrolment.reservation.startAt);
        const now = moment();
        if (now.isDST()) {
            startsAt.add(-1, 'hour');
        }
        return Date.parse(startsAt.format()) - new Date().getTime();
    }

}
