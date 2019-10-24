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
import { Component, Inject, Input, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { StateParams } from '@uirouter/core';
import * as moment from 'moment';
import * as toast from 'toastr';

import { ExamMachine } from '../../reservation/reservation.model';
import { DateTimeService } from '../../utility/date/date.service';
import { ExamEnrolment } from '../enrolment.model';
import { EnrolmentService } from '../enrolment.service';

@Component({
    selector: 'wrong-location',
    template: require('./wrongLocation.component.html'),
})
export class WrongLocationComponent implements OnInit {
    @Input() cause: string;

    enrolment: ExamEnrolment;
    isUpcoming: boolean;
    roomInstructions: string;
    currentMachine: ExamMachine;

    constructor(
        private http: HttpClient,
        @Inject('$stateParams') private StateParams: StateParams,
        private translate: TranslateService,
        private Enrolment: EnrolmentService,
        private DateTime: DateTimeService,
    ) {}

    ngOnInit() {
        if (this.StateParams.eid) {
            this.isUpcoming = true;
            this.http.get<ExamEnrolment>(`/app/student/enrolments/${this.StateParams.id}`).subscribe(
                enrolment => {
                    if (!enrolment.reservation) {
                        throw Error('no reservation found');
                    }
                    this.setOccasion(enrolment.reservation);
                    this.enrolment = enrolment;
                    const room = enrolment.reservation.machine.room;
                    const code = this.translate.currentLang.toUpperCase();
                    this.roomInstructions = code === 'FI' ? room.roomInstruction : room['roomInstruction' + code];
                    this.http
                        .get<ExamMachine>(`/app/machines/${this.StateParams.mid}`)
                        .subscribe(machine => (this.currentMachine = machine));
                },
                err => toast.error(err.data),
            );
        }
    }

    printExamDuration = () => this.DateTime.printExamDuration(this.enrolment.exam);

    private setOccasion = (reservation: any) => {
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

    showInstructions = () => this.Enrolment.showInstructions(this.enrolment);
}
