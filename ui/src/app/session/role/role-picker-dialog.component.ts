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
import type { User } from '../session.service';

@Component({
    selector: 'xm-role-selector-dialog',
    template: `
        <div>
            <div class="modal-header">
                <h4 class="modal-title"><i class="bi-person"></i>&nbsp;&nbsp;{{ 'sitnet_select_role' | translate }}</h4>
            </div>
            <div class="modal-body">
                <div ngbDropdown>
                    <button ngbDropdownToggle class="btn btn-light" type="button" id="dropDownMenu1">
                        {{ 'sitnet_choose' | translate }}
                    </button>
                    <div ngbDropdownMenu aria-labelledby="dropDownMenu1">
                        <button
                            ngbDropdownItem
                            *ngFor="let role of user.roles"
                            title="{{ role.displayName || '' | translate }}"
                            (click)="activeModal.close(role)"
                        >
                            {{ role.displayName || '' | translate }} <i [ngClass]="role.icon || ''"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-danger" (click)="activeModal.dismiss('sitnet_canceled')">
                    {{ 'sitnet_button_decline' | translate }}
                </button>
            </div>
        </div>
    `,
})
export class SelectRoleDialogComponent {
    @Input() user!: User;

    constructor(public activeModal: NgbActiveModal) {}
}
