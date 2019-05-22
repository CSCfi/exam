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

import { Reservation } from './reservation.model';
import { ReservationService } from './reservation.service';


@Component({
    selector: 'reservation-details',
    template: require('./reservationDetails.component.html')
})
export class ReservationDetailsComponent {

    @Input() reservations: Reservation[];
    @Input() isAdminView: boolean;

    predicate = 'reservation.startAt';
    reverse = false;

    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private Reservation: ReservationService
    ) { }

    printExamState = (reservation: Reservation) => this.Reservation.printExamState(reservation);

    getStateClass = (reservation: Reservation) =>
        reservation.noShow ? 'no_show' : reservation.enrolment.exam.state.toLowerCase()

    removeReservation(reservation: Reservation) {
        this.Reservation.cancelReservation(reservation).then(() => {
            this.reservations.splice(this.reservations.indexOf(reservation), 1);
            toast.info(this.translate.instant('sitnet_reservation_removed'));
        }).catch(err => toast.error(err));
    }

    permitRetrial(reservation) {
        this.http.put(`/app/reservations/${reservation.id}`, {}).subscribe(
            () => {
                reservation.retrialPermitted = true;
                toast.info(this.translate.instant('sitnet_retrial_permitted'));
            },
            err => toast.error(err));
    }

    changeReservationMachine = (reservation: Reservation) => this.Reservation.changeMachine(reservation);

}
