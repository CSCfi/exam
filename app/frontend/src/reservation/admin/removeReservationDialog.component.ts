/*
 *  Copyright (c) 2018 Exam Consortium
 *
 *  Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 *  versions of the EUPL (the "Licence");
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 *  Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 *  on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and limitations under the Licence.
 */
import * as toast from 'toastr';
import { Component, Input } from '@angular/core';
import { Reservation } from '../reservation.model';
import { HttpClient } from '@angular/common/http';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'remove-reservation-dialog',
    template: require('./removeReservationDialog.component.html')
})
export class RemoveReservationDialogComponent {

    @Input() reservation: Reservation;
    message = { text: '' };

    constructor(
        public activeModal: NgbActiveModal,
        private http: HttpClient
    ) { }

    ok = () =>
        this.http.delete(`/app/reservations/${this.reservation.id}`, { params: { 'msg': this.message.text } })
            .subscribe(() => this.activeModal.close(), err => toast.error(err))

    cancel = () => this.activeModal.dismiss();

}

