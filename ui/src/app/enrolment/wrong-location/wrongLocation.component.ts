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
import type { OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { UIRouterGlobals } from '@uirouter/core';
import { addHours, format, parseISO } from 'date-fns';
import { zonedTimeToUtc } from 'date-fns-tz';
import { ToastrService } from 'ngx-toastr';
import type { ExamMachine, ExamRoom, Reservation } from '../../reservation/reservation.model';
import { DateTimeService } from '../../utility/date/date.service';
import type { ExamEnrolment } from '../enrolment.model';
import { EnrolmentService } from '../enrolment.service';

@Component({
    selector: 'wrong-location',
    templateUrl: './wrongLocation.component.html',
})
export class WrongLocationComponent implements OnInit {
    @Input() cause = '';

    enrolment!: ExamEnrolment;
    reservation!: Reservation;
    isUpcoming = false;
    roomInstructions = '';
    currentMachine!: ExamMachine;
    occasion = { startAt: '', endAt: '' };

    constructor(
        private http: HttpClient,
        private routing: UIRouterGlobals,
        private translate: TranslateService,
        private toast: ToastrService,
        private Enrolment: EnrolmentService,
        private DateTime: DateTimeService,
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
        if (this.routing.params.eid) {
            this.isUpcoming = true;
            this.http.get<ExamEnrolment>(`/app/student/enrolments/${this.routing.params.eid}`).subscribe({
                next: (enrolment) => {
                    if (!enrolment.reservation) {
                        throw Error('no reservation found');
                    }
                    this.setOccasion(enrolment.reservation);
                    this.enrolment = enrolment;
                    this.reservation = enrolment.reservation;
                    const room = this.reservation.machine.room;
                    const code = this.translate.currentLang.toUpperCase();
                    this.roomInstructions = this.getRoomInstructions(code, room);
                    this.http
                        .get<ExamMachine>(`/app/machines/${this.routing.params.mid}`)
                        .subscribe((machine) => (this.currentMachine = machine));
                },
                error: this.toast.error,
            });
        }
    }

    printExamDuration = () => this.DateTime.printExamDuration(this.enrolment.exam);

    private setOccasion = (reservation: Reservation) => {
        const tz = reservation.machine.room.localTimezone;
        let start = zonedTimeToUtc(parseISO(reservation.startAt), tz);
        let end = zonedTimeToUtc(parseISO(reservation.endAt), tz);
        if (this.DateTime.isDST(start)) {
            start = addHours(start, -1);
        }
        if (this.DateTime.isDST(end)) {
            end = addHours(end, -1);
        }
        this.occasion = {
            startAt: format(start, 'HH:mm'),
            endAt: format(end, 'HH:mm'),
        };
    };

    showInstructions = () => this.Enrolment.showInstructions(this.enrolment);
}
