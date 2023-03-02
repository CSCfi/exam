import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { ConfirmationDialogService } from '../../../shared/dialogs/confirmation-dialog.service';
import type { ExamEnrolment } from '../../enrolment.model';
import { EnrolmentService } from '../../enrolment.service';

@Component({
    selector: 'xm-active-enrolment-menu',
    templateUrl: './active-enrolment-menu.component.html',
})
export class ActiveEnrolmentMenuComponent {
    @Input() enrolment!: ExamEnrolment;
    @Output() removed = new EventEmitter<number>();

    constructor(
        private translate: TranslateService,
        private toast: ToastrService,
        private Enrolment: EnrolmentService,
        private Confirmation: ConfirmationDialogService,
    ) {}

    makeReservation = () => this.Enrolment.makeReservation(this.enrolment);

    removeReservation = () => {
        if (this.enrolment.reservation) {
            this.Enrolment.removeReservation(this.enrolment);
        } else {
            this.Enrolment.removeExaminationEvent(this.enrolment);
        }
    };

    removeEnrolment = () => {
        if (this.enrolment.reservation) {
            this.toast.error(this.translate.instant('sitnet_cancel_reservation_first'));
        } else {
            this.Confirmation.open$(
                this.translate.instant('sitnet_confirm'),
                this.translate.instant('sitnet_are_you_sure'),
            ).subscribe({
                next: () =>
                    this.Enrolment.removeEnrolment$(this.enrolment).subscribe(() =>
                        this.removed.emit(this.enrolment.id),
                    ),
                error: (err) => this.toast.error(err),
            });
        }
    };

    hasUpcomingAlternativeEvents = () => this.Enrolment.hasUpcomingAlternativeEvents(this.enrolment);
}
