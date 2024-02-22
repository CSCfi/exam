/*
 * Copyright (c) 2018 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 *
 */

import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ExceptionWorkingHours } from '../../reservation/reservation.model';

@Component({
    template: `<div id="exam-dialog" role="dialog" aria-modal="true">
        <div class="modal-header">
            <div class="xm-page-header-title">{{ 'i18n_remove_exception_confirmation' | translate }}</div>
        </div>
        <div class="modal-body">
            <div class="d-flex">
                <div class="me-2">
                    {{ message }}
                </div>
                @if (exception?.outOfService) {
                    <div class="text-danger">
                        {{ 'i18n_room_out_of_service' | translate }}
                    </div>
                }
                @if (!exception?.outOfService) {
                    <div class="text-info">
                        {{ 'i18n_room_in_service' | translate }}
                    </div>
                }
            </div>
        </div>
        <div class="modal-footer">
            <button class="xm-ok-button" (click)="activeModal.close()" autofocus>
                {{ 'i18n_confirm' | translate }}
            </button>
            <button class="xm-cancel-button" (click)="activeModal.dismiss()">
                {{ 'i18n_button_cancel' | translate }}
            </button>
        </div>
    </div>`,
    styleUrls: ['../rooms/rooms.component.scss'],
    standalone: true,
    imports: [TranslateModule],
})
export class ExceptionDeleteDialogComponent {
    @Input() message?: string;
    @Input() exception?: ExceptionWorkingHours;

    constructor(public activeModal: NgbActiveModal) {}
}
