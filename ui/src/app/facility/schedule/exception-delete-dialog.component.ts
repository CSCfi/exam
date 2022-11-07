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
import { ExceptionWorkingHours } from '../../reservation/reservation.model';

@Component({
    selector: 'xm-publication-delete-dialog',
    template: `<div id="sitnet-dialog">
        <div class="student-message-dialog-wrapper-padding">
            <div class="student-enroll-dialog-wrap">
                <div class="student-enroll-title">{{ 'sitnet_remove_exception_confirmation' | translate }}</div>
            </div>
            <div class="modal-body">
                <div class="flex">
                    <div class="min-width-300 marr10">
                        {{ message }}
                    </div>
                    <div class="text-danger" *ngIf="exception?.outOfService">
                        {{ 'sitnet_room_out_of_service' | translate }}
                    </div>
                    <div class="text-info" *ngIf="!exception?.outOfService">
                        {{ 'sitnet_room_in_service' | translate }}
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <div class="student-message-dialog-button-save float-end">
                    <button class="btn btn-sm btn-primary" (click)="activeModal.close()">
                        {{ 'sitnet_confirm' | translate }}
                    </button>
                </div>
                <div class="student-message-dialog-button-cancel">
                    <button class="btn btn-sm btn-danger" (click)="activeModal.dismiss()">
                        {{ 'sitnet_button_cancel' | translate }}
                    </button>
                </div>
            </div>
        </div>
    </div> `,
})
export class ExceptionDeleteDialogComponent {
    @Input() message?: string;
    @Input() exception?: ExceptionWorkingHours;

    constructor(public activeModal: NgbActiveModal) {}
}
