// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, LowerCasePipe, SlicePipe, UpperCasePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type { ExamEnrolment } from 'src/app/enrolment/enrolment.model';
import { EnrolmentService } from 'src/app/enrolment/enrolment.service';
import type { ExamRoom } from 'src/app/reservation/reservation.model';
import { ApplyDstPipe } from 'src/app/shared/date/apply-dst.pipe';
import { FileService } from 'src/app/shared/file/file.service';
import { MathJaxDirective } from 'src/app/shared/math/math-jax.directive';
import { CourseCodeComponent } from 'src/app/shared/miscellaneous/course-code.component';
import { TeacherListComponent } from 'src/app/shared/user/teacher-list.component';
import { ActiveEnrolmentMenuComponent } from './helpers/active-enrolment-menu.component';

@Component({
    selector: 'xm-active-enrolment',
    templateUrl: './active-enrolment.component.html',
    standalone: true,
    imports: [
        RouterLink,
        ActiveEnrolmentMenuComponent,
        CourseCodeComponent,
        TeacherListComponent,
        NgbCollapse,
        MathJaxDirective,
        UpperCasePipe,
        LowerCasePipe,
        SlicePipe,
        DatePipe,
        TranslateModule,
        ApplyDstPipe,
    ],
    styleUrls: ['../enrolment.shared.scss', './active-enrolment.component.scss'],
})
export class ActiveEnrolmentComponent {
    @Input() enrolment!: ExamEnrolment & { occasion?: { startAt: string; endAt: string; tz: string } };
    @Output() removed = new EventEmitter<number>();

    showGuide = false;
    showInstructions = false;
    showMaterials = false;

    constructor(
        private translate: TranslateService,
        private Enrolment: EnrolmentService,
        private Files: FileService,
    ) {}

    hasUpcomingAlternativeEvents = () => this.Enrolment.hasUpcomingAlternativeEvents(this.enrolment);

    makeReservation = () => this.Enrolment.makeReservation(this.enrolment);

    addEnrolmentInformation = () => this.Enrolment.addEnrolmentInformation(this.enrolment);

    enrolmentRemoved = ($event: number) => this.removed.emit($event);

    getRoomInstruction = () => {
        const reservation = this.enrolment.reservation;
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
            `/app/student/enrolments/${this.enrolment.id}/configFile`,
            (this.enrolment.exam.name || this.translate.instant('i18n_no_name')).replace(' ', '-') + '.seb',
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
