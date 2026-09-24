// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import type { ExamEnrolment } from 'src/app/enrolment/enrolment.model';
import { EnrolmentService } from 'src/app/enrolment/enrolment.service';
import type { ExamMachine, ExamRoom, Reservation } from 'src/app/reservation/reservation.model';
import { DateTimeService } from 'src/app/shared/date/date.service';
import { CourseCodeComponent } from 'src/app/shared/miscellaneous/course-code.component';
import { ToastService } from 'src/app/shared/toast/toast.service';
import { TeacherListComponent } from 'src/app/shared/user/teacher-list.component';

@Component({
    selector: 'xm-wrong-location',
    templateUrl: './wrong-location.component.html',
    imports: [CourseCodeComponent, TeacherListComponent, DatePipe, TranslateModule],
})
export class WrongLocationComponent {
    readonly cause = computed<string>(() => this.data()?.cause ?? '');
    readonly enrolment = computed(() =>
        this.enrolmentResource.hasValue() ? this.enrolmentResource.value() : undefined,
    );
    readonly reservation = computed(() => this.enrolment()?.reservation);
    readonly roomInstructions = computed(() => {
        const room = this.reservation()?.machine.room;
        return room ? this.getRoomInstructions(this.translate.currentLang.toUpperCase(), room) : '';
    });
    readonly currentMachine = computed(() =>
        this.machineResource.hasValue() ? this.machineResource.value() : undefined,
    );
    readonly occasion = computed(() => {
        const reservation = this.reservation();
        return reservation ? this.getOccasion(reservation) : { startAt: '', endAt: '' };
    });

    private readonly route = inject(ActivatedRoute);
    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastService);
    private readonly Enrolment = inject(EnrolmentService);
    private readonly DateTimeService = inject(DateTimeService);

    private readonly params = toSignal(this.route.paramMap);
    private readonly data = toSignal(this.route.data);

    // Both requests fire in parallel and refetch if the route params change
    private readonly enrolmentResource = httpResource<ExamEnrolment>(
        () => {
            const eid = this.params()?.get('eid');
            return eid ? `/app/student/enrolments/${eid}` : undefined;
        },
        {
            parse: (value) => {
                const enrolment = value as ExamEnrolment;
                if (!enrolment.reservation) {
                    throw Error('no reservation found');
                }
                return enrolment;
            },
        },
    );
    private readonly machineResource = httpResource<ExamMachine>(() => {
        const mid = this.params()?.get('mid');
        return mid ? `/app/machines/${mid}` : undefined;
    });

    constructor() {
        effect(() => {
            const err = this.enrolmentResource.error();
            if (err) this.toast.error(err.message);
        });
    }

    printExamDuration() {
        const enrolment = this.enrolment();
        if (!enrolment) {
            return '';
        }
        return this.DateTimeService.formatDuration(enrolment.exam.duration);
    }

    showInstructions() {
        const enrolment = this.enrolment();
        if (!enrolment) {
            return;
        }
        this.Enrolment.showInstructions(enrolment);
    }

    private getRoomInstructions(lang: string, room: ExamRoom) {
        switch (lang) {
            case 'FI':
                return room.roomInstruction;
            case 'SV':
                return room.roomInstructionSV;
            default:
                return room.roomInstructionEN;
        }
    }

    private getOccasion(reservation: Reservation) {
        const tz = reservation.machine.room.localTimezone;
        const start = DateTime.fromISO(reservation.startAt, { zone: tz });
        const end = DateTime.fromISO(reservation.endAt, { zone: tz });
        return {
            startAt: start.minus({ hour: start.isInDST ? 1 : 0 }).toLocaleString(DateTime.TIME_24_SIMPLE),
            endAt: end.minus({ hour: end.isInDST ? 1 : 0 }).toLocaleString(DateTime.TIME_24_SIMPLE),
        };
    }
}
