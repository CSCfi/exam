// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, SlicePipe, UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, Signal, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs/operators';
import type { ExamEnrolment } from 'src/app/enrolment/enrolment.model';
import { EnrolmentService } from 'src/app/enrolment/enrolment.service';
import type { ExaminationEventConfiguration } from 'src/app/exam/exam.model';
import type { ExamRoom } from 'src/app/reservation/reservation.model';
import { FileService } from 'src/app/shared/file/file.service';
import { MathDirective } from 'src/app/shared/math/math.directive';
import { CourseCodeComponent } from 'src/app/shared/miscellaneous/course-code.component';
import { TeacherListComponent } from 'src/app/shared/user/teacher-list.component';
import { ActiveEnrolmentMenuComponent } from './helpers/active-enrolment-menu.component';
import { OptionalSectionsComponent } from './helpers/optional-sections.component';

@Component({
    selector: 'xm-active-enrolment',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './active-enrolment.component.html',
    imports: [
        RouterLink,
        NgbCollapse,
        ActiveEnrolmentMenuComponent,
        CourseCodeComponent,
        TeacherListComponent,
        OptionalSectionsComponent,
        MathDirective,
        UpperCasePipe,
        SlicePipe,
        DatePipe,
        TranslateModule,
    ],
    styleUrls: ['../enrolment.shared.scss', './active-enrolment.component.scss'],
})
export class ActiveEnrolmentComponent {
    readonly enrolment = input.required<
        ExamEnrolment & { occasion?: { startAt: string; endAt: string; tz: string } }
    >();
    readonly removed = output<number>();
    readonly reservationRemoved = output<number>();
    readonly eventConfigSelected = output<ExaminationEventConfiguration>();

    readonly showGuide = signal(false);
    readonly showInstructions = signal(false);
    readonly currentLang: Signal<string>;

    private readonly translate = inject(TranslateService);
    private readonly Enrolment = inject(EnrolmentService);
    private readonly Files = inject(FileService);
    private readonly destroyRef = inject(DestroyRef);

    constructor() {
        this.currentLang = toSignal(this.translate.onLangChange.pipe(map((e) => e.lang)), {
            initialValue: this.translate.getCurrentLang(),
        });
    }

    hasUpcomingAlternativeEvents = () => this.Enrolment.hasUpcomingAlternativeEvents(this.enrolment());

    addEnrolmentInformation = () =>
        this.Enrolment.addEnrolmentInformation$(this.enrolment()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();

    enrolmentRemoved = ($event: number) => this.removed.emit($event);
    enrolmentReservationRemoved = ($event: number) => this.reservationRemoved.emit($event);

    getRoomInstruction = () => {
        const reservation = this.enrolment().reservation;
        if (!reservation) {
            return;
        }
        let o: { roomInstruction: string; roomInstructionEN: string; roomInstructionSV: string };
        if (reservation.externalReservation) {
            o = reservation.externalReservation;
        } else if (reservation.machine) {
            o = reservation.machine.room;
        } else {
            return '';
        }
        return this.getRoomInstructions(this.translate.currentLang.toUpperCase(), o);
    };

    downloadSebFile = () =>
        this.Files.download(
            `/app/student/enrolments/${this.enrolment().id}/configFile`,
            (this.enrolment().exam.name || this.translate.instant('i18n_no_name')).replace(' ', '-') + '.seb',
        );

    private getRoomInstructions = (lang: string, room: Partial<ExamRoom>) => {
        switch (lang) {
            case 'FI':
                return room.roomInstruction;
            case 'SV':
                return room.roomInstructionSV;
            default:
                return room.roomInstructionEN;
        }
    };
}
