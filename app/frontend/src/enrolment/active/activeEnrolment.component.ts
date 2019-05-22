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
import { Location } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as toast from 'toastr';

import { ReservationService } from '../../reservation/reservation.service';
import { ConfirmationDialogService } from '../../utility/dialogs/confirmationDialog.service';
import { ExamEnrolment } from '../enrolment.model';
import { EnrolmentService } from '../enrolment.service';


@Component({
    selector: 'active-enrolment',
    template: require('./activeEnrolment.component.html')
})
export class ActiveEnrolmentComponent {
    @Input() enrolment: ExamEnrolment;
    @Output() onRemoval = new EventEmitter<ExamEnrolment>();

    constructor(
        private translate: TranslateService,
        private location: Location,
        private ConfirmationDialog: ConfirmationDialogService,
        private Enrolment: EnrolmentService,
        private Reservation: ReservationService
    ) { }

    removeReservation = () => this.Reservation.removeReservation(this.enrolment);

    removeEnrolment = () => {
        if (this.enrolment.reservation) {
            toast.error(this.translate.instant('sitnet_cancel_reservation_first'));
        } else {
            this.ConfirmationDialog.open(this.translate.instant('sitnet_confirm'),
                this.translate.instant('sitnet_are_you_sure')).result.then(
                    () => this.Enrolment.removeEnrolment(this.enrolment).subscribe(
                        () => this.onRemoval.emit(this.enrolment)
                    ));
        }
    }

    getLinkToCalendar = () => this.enrolment.collaborativeExam ?
        '/calendar/collaborative/' + this.enrolment.collaborativeExam.id :
        '/calendar/' + this.enrolment.exam.id

    addEnrolmentInformation = () => this.Enrolment.addEnrolmentInformation(this.enrolment);

    getRoomInstruction = () => {
        const reservation = this.enrolment.reservation;
        if (!reservation) {
            return;
        }
        let o;
        if (reservation.externalReservation) {
            o = reservation.externalReservation;
        } else if (reservation.machine) {
            o = reservation.machine.room;
        }
        return o['roomInstruction' + this.translate.currentLang.toUpperCase()] || o.roomInstruction;
    }

    goToCalendar = () => this.location.go(this.getLinkToCalendar());

}
