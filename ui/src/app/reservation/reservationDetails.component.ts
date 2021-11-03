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
import { HttpClient } from '@angular/common/http';
import { Component, Input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as toast from 'toastr';

import { AnyReservation } from './reservation.base.component';
import { ReservationService } from './reservation.service';

import type { Reservation } from './reservation.model';

type ReservationDetail = Reservation & { org: { name: string; code: string }; userAggregate: string };

@Component({
    selector: 'reservation-details',
    templateUrl: './reservationDetails.component.html',
})
export class ReservationDetailsComponent {
    @Input() reservations: AnyReservation[] = [];
    @Input() isAdminView = false;

    predicate = 'reservation.startAt';
    reverse = false;
    fixedReservations: ReservationDetail[] = [];

    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private Reservation: ReservationService,
    ) {}

    ngOnInit() {
        // This is terrible but modeling these is a handful. Maybe we can move some reservation types to different views.
        this.fixedReservations = this.reservations as ReservationDetail[];
    }

    printExamState = (reservation: Reservation) => this.Reservation.printExamState(reservation);

    getStateClass = (reservation: Reservation) =>
        reservation.noShow ? 'no_show' : reservation.enrolment.exam.state.toLowerCase();

    removeReservation(reservation: ReservationDetail) {
        this.Reservation.cancelReservation(reservation)
            .then(() => {
                this.fixedReservations.splice(this.fixedReservations.indexOf(reservation), 1);
                toast.info(this.translate.instant('sitnet_reservation_removed'));
            })
            .catch((err) => toast.error(err));
    }

    permitRetrial(reservation: Reservation) {
        this.http.put(`/app/reservations/${reservation.id}`, {}).subscribe(
            () => {
                reservation.retrialPermitted = true;
                toast.info(this.translate.instant('sitnet_retrial_permitted'));
            },
            (err) => toast.error(err),
        );
    }

    changeReservationMachine = (reservation: Reservation) => this.Reservation.changeMachine(reservation);

    setPredicate = (predicate: string) => {
        if (this.predicate === predicate) {
            this.reverse = !this.reverse;
        }
        this.predicate = predicate;
    };
}
