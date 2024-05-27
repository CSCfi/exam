/*
 *
 *  * Copyright (c) 2018 Exam Consortium
 *  *
 *  * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 *  * versions of the EUPL (the "Licence");
 *  * You may not use this work except in compliance with the Licence.
 *  * You may obtain a copy of the Licence at:
 *  *
 *  * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *  *
 *  * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 *  * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  * See the Licence for the specific language governing permissions and limitations under the Licence.
 *
 */
import { DatePipe, LowerCasePipe, NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Input, OnChanges } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { ExamEnrolment } from 'src/app/enrolment/enrolment.model';
import { ApplyDstPipe } from 'src/app/shared/date/apply-dst.pipe';
import { CourseCodeComponent } from 'src/app/shared/miscellaneous/course-code.component';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { TableSortComponent } from 'src/app/shared/sorting/table-sort.component';
import { TeacherListComponent } from 'src/app/shared/user/teacher-list.component';
import type { Reservation } from './reservation.model';
import { ReservationService } from './reservation.service';
import { AnyReservation } from './reservations.component';

type ReservationDetail = Reservation & { org: { name: string; code: string }; userAggregate: string };

@Component({
    selector: 'xm-reservation-details',
    templateUrl: './reservation-details.component.html',
    standalone: true,
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
    ],
    styles: '.wrap { white-space: wrap !important }',
})
export class ReservationDetailsComponent implements OnChanges {
    @Input() reservations: AnyReservation[] = [];
    @Input() isAdminView = false;

    predicate = 'reservation.startAt';
    reverse = false;
    fixedReservations: ReservationDetail[] = [];

    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private toast: ToastrService,
        private Reservation: ReservationService,
    ) {}

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
            .catch((err) => this.toast.error(err));
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

    setPredicate = (predicate: string) => {
        if (this.predicate === predicate) {
            this.reverse = !this.reverse;
        }
        this.predicate = predicate;
    };
}
