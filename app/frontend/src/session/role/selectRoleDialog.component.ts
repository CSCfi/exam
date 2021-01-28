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

import { User } from '../session.service';

@Component({
    selector: 'role-selector-dialog',
    template: `
        <div id="sitnet-dialog">
            <div class="student-message-dialog-wrapper-padding">
                <div class="student-enroll-dialog-wrap">
                    <h2 class="student-enroll-title">
                        <i class="bi-person-circle"></i>&nbsp;&nbsp;{{ 'sitnet_select_role' | translate }}
                    </h2>
                </div>
            </div>
            <div class="modal-body">
                <div ngbDropdown>
                    <button ngbDropdownToggle class="btn btn-default" type="button" id="dropDownMenu1">
                        {{ 'sitnet_choose' | translate }}
                    </button>
                    <div ngbDropdownMenu aria-labelledby="dropDownMenu1">
                        <button
                            ngbDropdownItem
                            *ngFor="let role of user.roles"
                            title="{{ role.displayName | translate }}"
                            (click)="activeModal.close(role)"
                        >
                            {{ role.displayName | translate }} <i [ngClass]="role.icon"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <div class="row">
                    <div class="col-md-12">
                        <button class="btn btn-sm btn-danger pull-right" (click)="activeModal.dismiss()">
                            {{ 'sitnet_button_decline' | translate }}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `,
})
export class SelectRoleDialogComponent {
    @Input() user: User;

    constructor(public activeModal: NgbActiveModal) {}
}
