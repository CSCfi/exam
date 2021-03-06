import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as toast from 'toastr';

import { ReservationService } from '../../../reservation/reservation.service';
import { ConfirmationDialogService } from '../../../utility/dialogs/confirmationDialog.service';
import { ExamEnrolment } from '../../enrolment.model';
import { EnrolmentService } from '../../enrolment.service';

@Component({
    selector: 'active-enrolment-menu',
    templateUrl: './activeEnrolmentMenu.component.html',
})
export class ActiveEnrolmentMenuComponent {
    @Input() enrolment: ExamEnrolment;
    @Output() onRemoval = new EventEmitter<ExamEnrolment>();

    constructor(
        private translate: TranslateService,
        private Reservation: ReservationService,
        private Enrolment: EnrolmentService,
        private Confirmation: ConfirmationDialogService,
    ) {}

    makeReservation = () => this.Enrolment.makeReservation(this.enrolment);

    removeReservation = () => {
        if (this.enrolment.reservation) {
            this.Reservation.removeReservation(this.enrolment);
        } else {
            this.Enrolment.removeExaminationEvent(this.enrolment);
        }
    };

    removeEnrolment = () => {
        if (this.enrolment.reservation) {
            toast.error(this.translate.instant('sitnet_cancel_reservation_first'));
        } else {
            this.Confirmation.open(
                this.translate.instant('sitnet_confirm'),
                this.translate.instant('sitnet_are_you_sure'),
            ).result.then(() =>
                this.Enrolment.removeEnrolment(this.enrolment).subscribe(() => this.onRemoval.emit(this.enrolment)),
            );
        }
    };

    hasUpcomingAlternativeEvents = () => this.Enrolment.hasUpcomingAlternativeEvents(this.enrolment);
}
