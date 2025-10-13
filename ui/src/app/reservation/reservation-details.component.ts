// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, LowerCasePipe, NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Input, OnChanges, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgbDropdown, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { noop } from 'rxjs';
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
        NgClass,
        LowerCasePipe,
        DatePipe,
        TranslateModule,
        ApplyDstPipe,
        OrderByPipe,
        NgbDropdown,
        NgbDropdownToggle,
        NgbDropdownMenu,
        NgbDropdownItem,
    ],
    styles: '.wrap { white-space: wrap !important }',
})
export class ReservationDetailsComponent implements OnChanges {
    @Input() reservations: AnyReservation[] = [];
    @Input() isAdminView = false;
    @Input() isSupportView = false;
    predicate = 'reservation.startAt';
    reverse = false;
    fixedReservations: ReservationDetail[] = [];

    private http = inject(HttpClient);
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);
    private Reservation = inject(ReservationService);

    ngOnChanges() {
        // This is terrible but modeling these is a handful. Maybe we can move some reservation types to different views.
        this.fixedReservations = this.reservations as ReservationDetail[];
    }

    printExamState = (reservation: Reservation) => this.Reservation.printExamState(reservation);

    getStateClass = (reservation: Reservation) => {
        if (reservation.enrolment.noShow) {
            return 'text-danger';
        }
        return reservation.enrolment.exam.state === 'REVIEW' ? 'text-success' : '';
    };

    removeReservation(reservation: ReservationDetail) {
        this.Reservation.cancelReservation(reservation)
            .then(() => {
                this.fixedReservations.splice(this.fixedReservations.indexOf(reservation), 1);
                this.toast.info(this.translate.instant('i18n_reservation_removed'));
            })
            .catch(noop);
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

    changeReservationMachine = (reservation: Reservation) => this.Reservation.changeMachine(reservation);

    hasAvailableActions(r: ReservationDetail): boolean {
        const canRemoveReservation =
            this.isAdminView &&
            r.enrolment.exam.state === 'PUBLISHED' &&
            !r.enrolment.noShow &&
            r.enrolment.exam.implementation === 'AQUARIUM' &&
            !this.reservationIsInPast(r);

        const canPermitRetrial =
            this.isAdminView &&
            r.enrolment.exam.state === 'ABORTED' &&
            r.enrolment.exam.implementation === 'AQUARIUM' &&
            r.enrolment.exam.executionType.type === 'PUBLIC';

        const canChangeReservationMachine =
            r.enrolment.exam.state === 'PUBLISHED' &&
            !r.enrolment.noShow &&
            !r.externalReservation &&
            r.enrolment.exam.implementation === 'AQUARIUM';

        return canRemoveReservation || canPermitRetrial || canChangeReservationMachine;
    }

    setPredicate = (predicate: string) => {
        if (this.predicate === predicate) {
            this.reverse = !this.reverse;
        }
        this.predicate = predicate;
    };
}
