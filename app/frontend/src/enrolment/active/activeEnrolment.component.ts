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
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { StateService } from '@uirouter/angular';
import * as toast from 'toastr';

import { ExamRoom } from '../../reservation/reservation.model';
import { ReservationService } from '../../reservation/reservation.service';
import { ConfirmationDialogService } from '../../utility/dialogs/confirmationDialog.service';
import { FileService } from '../../utility/file/file.service';
import { ExamEnrolment } from '../enrolment.model';
import { EnrolmentService } from '../enrolment.service';

@Component({
    selector: 'active-enrolment',
    template: require('./activeEnrolment.component.html'),
})
export class ActiveEnrolmentComponent {
    @Input() enrolment: ExamEnrolment;
    @Output() onRemoval = new EventEmitter<ExamEnrolment>();

    constructor(
        private translate: TranslateService,
        private state: StateService,
        private ConfirmationDialog: ConfirmationDialogService,
        private Enrolment: EnrolmentService,
        private Reservation: ReservationService,
        private Files: FileService,
    ) {}

    removeReservation = () => {
        if (this.enrolment.reservation) {
            this.Reservation.removeReservation(this.enrolment);
        } else {
            this.Enrolment.removeExaminationEvent(this.enrolment);
        }
    };

    makeReservation = () => {
        if (this.enrolment.exam && this.enrolment.exam.implementation !== 'AQUARIUM') {
            this.Enrolment.selectExaminationEvent(this.enrolment.exam, this.enrolment);
        } else {
            this.goToCalendar();
        }
    };

    hasUpcomingAlternativeEvents = () =>
        this.enrolment.exam &&
        this.enrolment.exam.examinationEventConfigurations.some(
            eec =>
                new Date(eec.examinationEvent.start) > new Date() &&
                (!this.enrolment.examinationEventConfiguration ||
                    eec.id !== this.enrolment.examinationEventConfiguration.id),
        );

    removeEnrolment = () => {
        if (this.enrolment.reservation) {
            toast.error(this.translate.instant('sitnet_cancel_reservation_first'));
        } else {
            this.ConfirmationDialog.open(
                this.translate.instant('sitnet_confirm'),
                this.translate.instant('sitnet_are_you_sure'),
            ).result.then(() =>
                this.Enrolment.removeEnrolment(this.enrolment).subscribe(() => this.onRemoval.emit(this.enrolment)),
            );
        }
    };

    goToCalendar = () => {
        const params = {
            id: this.enrolment.collaborativeExam ? this.enrolment.collaborativeExam.id : this.enrolment.exam.id,
        };
        this.state.go(this.enrolment.collaborativeExam ? 'collaborativeCalendar' : 'calendar', params);
    };

    addEnrolmentInformation = () => this.Enrolment.addEnrolmentInformation(this.enrolment);

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
            (this.enrolment.exam.name || this.translate.instant('sitnet_no_name')).replace(' ', '-') + '.seb',
        );
}
