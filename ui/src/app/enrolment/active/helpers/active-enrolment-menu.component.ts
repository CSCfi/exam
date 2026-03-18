// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { ToastrService } from 'ngx-toastr';
import type { ExamEnrolment } from 'src/app/enrolment/enrolment.model';
import { EnrolmentService } from 'src/app/enrolment/enrolment.service';
import type { ExaminationEventConfiguration } from 'src/app/exam/exam.model';
import { Reservation } from 'src/app/reservation/reservation.model';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';

@Component({
    selector: 'xm-active-enrolment-menu',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './active-enrolment-menu.component.html',
    imports: [RouterLink, TranslateModule],
})
export class ActiveEnrolmentMenuComponent {
    readonly enrolment = input.required<ExamEnrolment>();
    readonly removed = output<number>();
    readonly reservationRemoved = output<number>();
    readonly eventConfigSelected = output<ExaminationEventConfiguration>();

    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastrService);
    private readonly Enrolment = inject(EnrolmentService);
    private readonly Confirmation = inject(ConfirmationDialogService);
    private readonly destroyRef = inject(DestroyRef);

    makeReservation = () =>
        this.Enrolment.makeReservation$(this.enrolment())
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((config) => this.eventConfigSelected.emit(config));

    canChangeReservation = (reservation: Reservation) => {
        const now = DateTime.now();
        const [start, end] = [DateTime.fromISO(reservation.startAt), DateTime.fromISO(reservation.endAt)];
        return now < start || now > end;
    };

    removeReservation = () => {
        const enrolment = this.enrolment();
        const obs$ = enrolment.reservation
            ? this.Enrolment.removeReservation$(enrolment)
            : this.Enrolment.removeExaminationEvent$(enrolment);
        obs$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.reservationRemoved.emit(enrolment.id));
    };

    removeEnrolment = () => {
        if (this.enrolment().reservation) {
            this.toast.error(this.translate.instant('i18n_cancel_reservation_first'));
        } else {
            this.Confirmation.open$(
                this.translate.instant('i18n_confirm'),
                this.translate.instant('i18n_are_you_sure'),
            ).subscribe({
                next: () =>
                    this.Enrolment.removeEnrolment$(this.enrolment()).subscribe(() =>
                        this.removed.emit(this.enrolment().id),
                    ),
            });
        }
    };

    hasUpcomingAlternativeEvents = () => this.Enrolment.hasUpcomingAlternativeEvents(this.enrolment());
}
