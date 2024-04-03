import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgbDropdown, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { ToastrService } from 'ngx-toastr';
import { Reservation } from 'src/app/reservation/reservation.model';
import { ConfirmationDialogService } from '../../../shared/dialogs/confirmation-dialog.service';
import type { ExamEnrolment } from '../../enrolment.model';
import { EnrolmentService } from '../../enrolment.service';

@Component({
    selector: 'xm-active-enrolment-menu',
    templateUrl: './active-enrolment-menu.component.html',
    standalone: true,
    imports: [NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownItem, RouterLink, TranslateModule],
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

    canChangeReservation = (reservation: Reservation) => {
        const now = DateTime.now();
        const [start, end] = [DateTime.fromISO(reservation.startAt), DateTime.fromISO(reservation.endAt)];
        return now < start || now > end;
    };

    removeReservation = () => {
        if (this.enrolment.reservation) {
            this.Enrolment.removeReservation(this.enrolment);
        } else {
            this.Enrolment.removeExaminationEvent(this.enrolment);
        }
    };

    removeEnrolment = () => {
        if (this.enrolment.reservation) {
            this.toast.error(this.translate.instant('i18n_cancel_reservation_first'));
        } else {
            this.Confirmation.open$(
                this.translate.instant('i18n_confirm'),
                this.translate.instant('i18n_are_you_sure'),
            ).subscribe({
                next: () =>
                    this.Enrolment.removeEnrolment$(this.enrolment).subscribe(() =>
                        this.removed.emit(this.enrolment.id),
                    ),
            });
        }
    };

    hasUpcomingAlternativeEvents = () => this.Enrolment.hasUpcomingAlternativeEvents(this.enrolment);
}
