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

import * as toast from 'toastr';
import { Option } from '../../utility/select/dropDownSelect.component';
import { Component, Input, OnInit } from '@angular/core';
import { Reservation, ExamMachine } from '../reservation.model';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';

@Component({
    selector: 'change-machine-dialog',
    template: require('./changeMachineDialog.component.html')
})
export class ChangeMachineDialogComponent implements OnInit {

    @Input() reservation: Reservation;
    selection: ExamMachine;
    availableMachineOptions: Option[];

    constructor(
        public activeModal: NgbActiveModal,
        private http: HttpClient,
        private translate: TranslateService
    ) { }

    ngOnInit() {
        this.http.get<ExamMachine[]>(`/app/reservations/${this.reservation.id}/machines`).subscribe(resp =>
            this.availableMachineOptions = resp.map(o => {
                return {
                    id: o.id,
                    label: o.name,
                    value: o
                };
            })
        );
    }

    machineChanged = (machine: ExamMachine) => this.selection = machine;

    ok = () =>
        this.http.put<ExamMachine>(`/app/reservations/${this.reservation.id}/machine`, { machineId: this.selection.id })
            .subscribe(
                resp => {
                    toast.info(this.translate.instant('sitnet_updated'));
                    this.activeModal.close(resp);
                },
                err => toast.error(err.data))


    cancel = () => this.activeModal.dismiss();

}
