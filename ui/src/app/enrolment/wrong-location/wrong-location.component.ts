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
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import type { OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { ToastrService } from 'ngx-toastr';
import type { ExamEnrolment } from 'src/app/enrolment/enrolment.model';
import { EnrolmentService } from 'src/app/enrolment/enrolment.service';
import type { ExamMachine, ExamRoom, Reservation } from 'src/app/reservation/reservation.model';
import { DateTimeService } from 'src/app/shared/date/date.service';
import { CourseCodeComponent } from 'src/app/shared/miscellaneous/course-code.component';
import { TeacherListComponent } from 'src/app/shared/user/teacher-list.component';

@Component({
    selector: 'xm-wrong-location',
    templateUrl: './wrong-location.component.html',
    standalone: true,
    imports: [CourseCodeComponent, TeacherListComponent, DatePipe, TranslateModule],
    styles: [
        `
            .exams-list-title-text {
                font-size: 1.4em;
                font-weight: 400;
                letter-spacing: 1px;
                vertical-align: middle;
            }
        `,
    ],
})
export class WrongLocationComponent implements OnInit {
    cause = '';
    enrolment!: ExamEnrolment;
    reservation!: Reservation;
    isUpcoming = false;
    roomInstructions = '';
    currentMachine!: ExamMachine;
    occasion = { startAt: '', endAt: '' };

    constructor(
        private http: HttpClient,
        private route: ActivatedRoute,
        private translate: TranslateService,
        private toast: ToastrService,
        private Enrolment: EnrolmentService,
        private DateTimeService: DateTimeService,
    ) {}

    ngOnInit() {
        this.cause = this.route.snapshot.data.cause;
        if (this.route.snapshot.params.eid) {
            this.isUpcoming = true;
            this.http.get<ExamEnrolment>(`/app/student/enrolments/${this.route.snapshot.params.eid}`).subscribe({
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
                        .get<ExamMachine>(`/app/machines/${this.route.snapshot.params.mid}`)
                        .subscribe((machine) => (this.currentMachine = machine));
                },
                error: (err) => this.toast.error(err),
            });
        }
    }

    printExamDuration = () => this.DateTimeService.printExamDuration(this.enrolment.exam);
    showInstructions = () => this.Enrolment.showInstructions(this.enrolment);

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

    private setOccasion = (reservation: Reservation) => {
        const tz = reservation.machine.room.localTimezone;
        const start = DateTime.fromISO(reservation.startAt, { zone: tz });
        const end = DateTime.fromISO(reservation.endAt, { zone: tz });
        this.occasion = {
            startAt: start.minus({ hour: start.isInDST ? 1 : 0 }).toLocaleString(DateTime.TIME_24_SIMPLE),
            endAt: end.minus({ hour: end.isInDST ? 1 : 0 }).toLocaleString(DateTime.TIME_24_SIMPLE),
        };
    };
}
