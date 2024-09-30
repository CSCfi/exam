// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { AsyncPipe, DatePipe, SlicePipe, UpperCasePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import type { OnDestroy, OnInit } from '@angular/core';
import { Component, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { ToastrService } from 'ngx-toastr';
import { Observable, interval, map, startWith } from 'rxjs';
import type { ExamEnrolment } from 'src/app/enrolment/enrolment.model';
import type { Reservation } from 'src/app/reservation/reservation.model';
import { SessionService } from 'src/app/session/session.service';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { ApplyDstPipe } from 'src/app/shared/date/apply-dst.pipe';
import { DateTimeService } from 'src/app/shared/date/date.service';
import { MathJaxDirective } from 'src/app/shared/math/math-jax.directive';
import { CourseCodeComponent } from 'src/app/shared/miscellaneous/course-code.component';
import { TeacherListComponent } from 'src/app/shared/user/teacher-list.component';

type WaitingReservation = Reservation & { occasion: { startAt: string; endAt: string } };
type WaitingEnrolment = Omit<ExamEnrolment, 'reservation'> & {
    reservation: WaitingReservation;
};

@Component({
    selector: 'xm-waiting-room',
    templateUrl: './waiting-room.component.html',
    styleUrls: ['../enrolment.shared.scss'],
    standalone: true,
    imports: [
        CourseCodeComponent,
        TeacherListComponent,
        MathJaxDirective,
        AsyncPipe,
        UpperCasePipe,
        SlicePipe,
        DatePipe,
        TranslateModule,
        ApplyDstPipe,
        PageHeaderComponent,
        PageContentComponent,
    ],
})
export class WaitingRoomComponent implements OnInit, OnDestroy {
    enrolment!: WaitingEnrolment;
    isUpcoming = signal(false);
    delayCounter$?: Observable<number>;

    private startTimerId = 0;
    private delayTimerId = 0;

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
            this.isUpcoming.set(true);
            this.http.get<WaitingEnrolment>(`/app/student/enrolments/${this.route.snapshot.params.id}`).subscribe({
                next: (enrolment) => {
                    this.setOccasion(enrolment.reservation);
                    this.enrolment = enrolment;
                    const offset = Math.max(0, this.calculateOffset());
                    this.startTimerId = window.setTimeout(this.startScheduled, offset);
                    this.http
                        .post<void>(`/app/student/exam/${this.route.snapshot.params.hash}`, {})
                        .subscribe(() => console.log(`exam ${this.route.snapshot.params.hash} prepared ok`));
                },
                error: (err) => this.toast.error(err),
            });
        }
    }

    ngOnDestroy() {
        window.clearTimeout(this.startTimerId);
        window.clearTimeout(this.delayTimerId);
    }

    getRoomInstructions = () => {
        const room = this.enrolment.reservation.machine.room;
        const lang = this.translate.currentLang.toUpperCase();
        switch (lang) {
            case 'FI':
                return room.roomInstruction;
            case 'SV':
                return room.roomInstructionSV;
            default:
                return room.roomInstructionEN;
        }
    };

    private startScheduled = () => {
        window.clearTimeout(this.startTimerId);
        const offset = Math.ceil(
            DateTime.fromJSDate(this.getStart()).plus({ seconds: this.enrolment.delay }).toSeconds() -
                DateTime.now().toSeconds(),
        );
        this.delayTimerId = window.setTimeout(this.Session.checkSession, Math.max(0, offset * 1000));
        this.delayCounter$ = interval(1000).pipe(
            startWith(0),
            map((n) => offset - n),
        );
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
