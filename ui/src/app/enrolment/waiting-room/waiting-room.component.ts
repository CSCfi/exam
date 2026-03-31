// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, SlicePipe, UpperCasePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { ToastrService } from 'ngx-toastr';
import { interval, map, startWith } from 'rxjs';
import type { ExamEnrolment } from 'src/app/enrolment/enrolment.model';
import type { Reservation } from 'src/app/reservation/reservation.model';
import { SessionService } from 'src/app/session/session.service';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';

import { MathDirective } from 'src/app/shared/math/math.directive';
import { CourseCodeComponent } from 'src/app/shared/miscellaneous/course-code.component';
import { TeacherListComponent } from 'src/app/shared/user/teacher-list.component';

export type WaitingReservation = Reservation & { occasion: { startAt: string; endAt: string } };
export type WaitingEnrolment = Omit<ExamEnrolment, 'reservation'> & {
    reservation: WaitingReservation;
};

@Component({
    selector: 'xm-waiting-room',
    templateUrl: './waiting-room.component.html',
    styleUrls: ['../enrolment.shared.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CourseCodeComponent,
        TeacherListComponent,
        MathDirective,
        UpperCasePipe,
        SlicePipe,
        DatePipe,
        TranslateModule,
        PageHeaderComponent,
        PageContentComponent,
    ],
})
export class WaitingRoomComponent implements OnDestroy {
    readonly enrolment = signal<WaitingEnrolment | undefined>(undefined);
    readonly isUpcoming = signal(false);
    readonly delayCounter = signal<number | undefined>(undefined);

    private startTimerId = 0;
    private delayTimerId = 0;

    private readonly http = inject(HttpClient);
    private readonly route = inject(ActivatedRoute);
    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastrService);
    private readonly Session = inject(SessionService);

    constructor() {
        if (this.route.snapshot.params.id && this.route.snapshot.params.hash) {
            this.isUpcoming.set(true);
            this.http.get<WaitingEnrolment>(`/app/student/enrolments/${this.route.snapshot.params.id}`).subscribe({
                next: (enrolment) => {
                    this.setOccasion(enrolment.reservation);
                    this.enrolment.set(enrolment);
                    const offset = Math.max(0, this.calculateOffset());
                    this.startTimerId = window.setTimeout(() => this.startScheduled(), offset);
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

    getRoomInstructions() {
        const enrolment = this.enrolment();
        if (!enrolment) {
            return '';
        }
        const room = enrolment.reservation.machine.room;
        const lang = this.translate.currentLang.toUpperCase();
        switch (lang) {
            case 'FI':
                return room.roomInstruction;
            case 'SV':
                return room.roomInstructionSV;
            default:
                return room.roomInstructionEN;
        }
    }

    private startScheduled() {
        window.clearTimeout(this.startTimerId);
        const enrolment = this.enrolment();
        if (!enrolment) {
            return;
        }
        const offset = Math.ceil(
            DateTime.fromJSDate(this.getStart()).plus({ milliseconds: enrolment.delay }).toSeconds() -
                DateTime.now().toSeconds(),
        );
        this.delayTimerId = window.setTimeout(this.Session.checkSession, Math.max(0, offset * 1000));
        interval(1000)
            .pipe(
                startWith(0),
                map((n) => offset - n),
            )
            .subscribe((n) => this.delayCounter.set(n));
    }

    private setOccasion(reservation: WaitingReservation) {
        if (!reservation) {
            return;
        }
        const tz = reservation.machine.room.localTimezone;
        const start = DateTime.fromISO(reservation.startAt, { zone: tz });
        const end = DateTime.fromISO(reservation.endAt, { zone: tz });
        reservation.occasion = {
            startAt: start.toLocaleString(DateTime.TIME_24_SIMPLE),
            endAt: end.toLocaleString(DateTime.TIME_24_SIMPLE),
        };
    }

    private getStart() {
        const enrolment = this.enrolment();
        if (!enrolment) {
            return new Date();
        }
        if (enrolment.examinationEventConfiguration) {
            return DateTime.fromISO(enrolment.examinationEventConfiguration.examinationEvent.start).toJSDate();
        }
        return DateTime.fromISO(enrolment.reservation.startAt).toJSDate();
    }

    private calculateOffset() {
        return this.getStart().getTime() - new Date().getTime();
    }
}
