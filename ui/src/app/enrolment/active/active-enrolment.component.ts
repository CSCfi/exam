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
import { DatePipe, LowerCasePipe, NgFor, NgIf, SlicePipe, UpperCasePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type { ExamRoom } from '../../reservation/reservation.model';
import { ApplyDstPipe } from '../../shared/date/apply-dst.pipe';
import { FileService } from '../../shared/file/file.service';
import { MathJaxDirective } from '../../shared/math/math-jax.directive';
import { CourseCodeComponent } from '../../shared/miscellaneous/course-code.component';
import { TeacherListComponent } from '../../shared/user/teacher-list.component';
import type { ExamEnrolment } from '../enrolment.model';
import { EnrolmentService } from '../enrolment.service';
import { ActiveEnrolmentMenuComponent } from './helpers/active-enrolment-menu.component';

@Component({
    selector: 'xm-active-enrolment',
    templateUrl: './active-enrolment.component.html',
    standalone: true,
    imports: [
        NgIf,
        RouterLink,
        ActiveEnrolmentMenuComponent,
        CourseCodeComponent,
        TeacherListComponent,
        NgbCollapse,
        NgFor,
        MathJaxDirective,
        UpperCasePipe,
        LowerCasePipe,
        SlicePipe,
        DatePipe,
        TranslateModule,
        ApplyDstPipe,
    ],
})
export class ActiveEnrolmentComponent {
    @Input() enrolment!: ExamEnrolment & { occasion?: { startAt: string; endAt: string; tz: string } };
    @Output() removed = new EventEmitter<number>();

    showGuide = false;
    showInstructions = false;
    showMaterials = false;

    constructor(private translate: TranslateService, private Enrolment: EnrolmentService, private Files: FileService) {}

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
