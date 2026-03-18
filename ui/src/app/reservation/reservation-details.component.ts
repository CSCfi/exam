// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, LowerCasePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, linkedSignal, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { ExamEnrolment } from 'src/app/enrolment/enrolment.model';
import { ApplyDstPipe } from 'src/app/shared/date/apply-dst.pipe';
import { CourseCodeComponent } from 'src/app/shared/miscellaneous/course-code.component';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { TableSortComponent } from 'src/app/shared/sorting/table-sort.component';
import { TeacherListComponent } from 'src/app/shared/user/teacher-list.component';
import type { AnyReservation, Reservation } from './reservation.model';
import { ReservationService } from './reservation.service';

type ReservationDetail = Reservation & { org: { name: string; code: string }; userAggregate: string };

@Component({
    selector: 'xm-reservation-details',
    templateUrl: './reservation-details.component.html',
    imports: [
        TableSortComponent,
        RouterLink,
        CourseCodeComponent,
        TeacherListComponent,
        LowerCasePipe,
        DatePipe,
        TranslateModule,
        ApplyDstPipe,
        OrderByPipe,
        NgbDropdownModule,
    ],
    styles: '.wrap { white-space: wrap !important }',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReservationDetailsComponent {
    readonly reservations = input<AnyReservation[]>([]);
    readonly isAdminView = input(false);
    readonly isSupportView = input(false);

    readonly predicate = signal('reservation.startAt');
    readonly reverse = signal(false);
    readonly fixedReservations = linkedSignal<ReservationDetail[]>(() => this.reservations() as ReservationDetail[]);

    private readonly http = inject(HttpClient);
    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastrService);
    private readonly Reservation = inject(ReservationService);

    printExamState(reservation: Reservation) {
        return this.Reservation.printExamState(reservation);
    }

    getStateClass(reservation: Reservation) {
        if (reservation.enrolment.noShow) {
            return 'text-danger';
        }
        return reservation.enrolment.exam.state === 'REVIEW' ? 'text-success' : '';
    }

    removeReservation(reservation: ReservationDetail) {
        this.Reservation.cancelReservation$(reservation).subscribe(() => {
            const currentReservations = this.fixedReservations();
            const updated = currentReservations.filter((r) => r.id !== reservation.id);
            this.fixedReservations.set(updated);
            this.toast.info(this.translate.instant('i18n_reservation_removed'));
        });
    }

    permitRetrial(enrolment: ExamEnrolment) {
        this.http.put(`/app/enrolments/${enrolment.id}/retrial`, {}).subscribe({
            next: () => {
                enrolment.retrialPermitted = true;
                this.toast.info(this.translate.instant('i18n_retrial_permitted'));
            },
            error: (err) => this.toast.error(err),
        });
    }

    reservationIsInPast(reservation: Reservation): boolean {
        const date = new Date();
        const startOfYear = new Date(0);
        startOfYear.setFullYear(date.getFullYear());
        const DSTCorrectedDate = new Date(
            date.getTime() + (startOfYear.getTimezoneOffset() - date.getTimezoneOffset()) * 60000,
        );
        return new Date(reservation.endAt) < DSTCorrectedDate;
    }

    changeReservationMachine(reservation: Reservation) {
        // Update the reservation in the local array after the modal closes
        // The service updates the reservation object, but we need to trigger change detection
        // by updating the array reference
        this.Reservation.changeMachine$(reservation).subscribe((updatedReservation) => {
            if (updatedReservation) {
                const currentReservations = this.fixedReservations();
                const updatedReservations = currentReservations.map((r) =>
                    r.id === reservation.id ? { ...r, ...updatedReservation } : r,
                );
                this.fixedReservations.set(updatedReservations);
            }
        });
    }

    hasAvailableActions(r: ReservationDetail): boolean {
        const canRemoveReservation =
            r.enrolment.exam.state === 'PUBLISHED' &&
            !r.enrolment.noShow &&
            r.enrolment.exam.implementation === 'AQUARIUM' &&
            !this.reservationIsInPast(r);

        const canPermitRetrial =
            r.enrolment.exam.state === 'ABORTED' && r.enrolment.exam.executionType.type === 'PUBLIC';

        const canChangeReservationMachine =
            r.enrolment.exam.state === 'PUBLISHED' &&
            !r.enrolment.noShow &&
            !r.externalReservation &&
            r.enrolment.exam.implementation === 'AQUARIUM';

        return canRemoveReservation || canPermitRetrial || canChangeReservationMachine;
    }

    setPredicate(predicate: string) {
        if (this.predicate() === predicate) {
            this.reverse.update((v) => !v);
        }
        this.predicate.set(predicate);
    }
}
