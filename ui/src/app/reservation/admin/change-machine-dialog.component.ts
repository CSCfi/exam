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
import type { OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { DropdownSelectComponent, Option } from '../../shared/select/dropdown-select.component';
import type { ExamMachine, Reservation } from '../reservation.model';

@Component({
    selector: 'xm-change-machine-dialog',
    standalone: true,
    imports: [TranslateModule, DropdownSelectComponent],
    template: `<div id="exam-dialog" role="dialog" aria-modal="true">
        <div class="terms-dialog-header">
            <h4><i class="bi-info-circle"></i>&nbsp;&nbsp;{{ 'i18n_change_reservation_machine' | translate }}</h4>
        </div>
        <div class="modal-body">
            <strong>{{ 'i18n_exam_machine' | translate }}</strong>
            <xm-dropdown-select
                [options]="availableMachineOptions"
                (optionSelected)="machineChanged($event)"
                (limitTo)="(0)"
                placeholder="{{ 'i18n_select' | translate }}"
                autofocus
            ></xm-dropdown-select>
        </div>
        <div class="modal-footer">
            <button class="btn btn-sm btn-danger" (click)="cancel()">
                {{ 'i18n_button_cancel' | translate }}
            </button>

            <button class="btn btn-sm btn-primary" (click)="ok()" [disabled]="!selection?.id">
                {{ 'i18n_button_save' | translate }}
            </button>
        </div>
    </div> `,
})
export class ChangeMachineDialogComponent implements OnInit {
    @Input() reservation!: Reservation;

    selection?: ExamMachine;
    availableMachineOptions: Option<ExamMachine, number>[] = [];

    constructor(
        public activeModal: NgbActiveModal,
        private http: HttpClient,
        private translate: TranslateService,
        private toast: ToastrService,
    ) {}

    ngOnInit() {
        this.http.get<ExamMachine[]>(`/app/reservations/${this.reservation.id}/machines`).subscribe(
            (resp) =>
                (this.availableMachineOptions = resp.map((o) => {
                    return {
                        id: o.id,
                        label: o.name,
                        value: o,
                    };
                })),
        );
    }

    machineChanged = (event: Option<ExamMachine, number> | undefined) => (this.selection = event?.value);

    ok = () =>
        this.http
            .put<ExamMachine>(`/app/reservations/${this.reservation.id}/machine`, { machineId: this.selection?.id })
            .subscribe({
                next: (resp) => {
                    this.toast.info(this.translate.instant('i18n_updated'));
                    this.activeModal.close(resp);
                },
                error: (err) => this.toast.error(err),
            });

    cancel = () => this.activeModal.dismiss();
}
