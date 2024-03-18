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
import { NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NgbActiveModal, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import type { User } from '../session.service';

@Component({
    standalone: true,
    imports: [TranslateModule, NgClass, NgbDropdownModule],
    template: `
        <div class="modal-header">
            <h4 class="modal-title"><i class="bi-person"></i>&nbsp;&nbsp;{{ 'i18n_select_role' | translate }}</h4>
        </div>
        <div class="modal-body">
            <div ngbDropdown>
                <button ngbDropdownToggle class="btn btn-sm btn-light" type="button" id="dropDownMenu1">
                    {{ 'i18n_choose' | translate }}
                </button>
                <div ngbDropdownMenu aria-labelledby="dropDownMenu1">
                    @for (role of user.roles; track role) {
                        <button
                            ngbDropdownItem
                            title="{{ role.displayName || '' | translate }}"
                            (click)="activeModal.close(role)"
                        >
                            {{ role.displayName || '' | translate }} <i class="ps-1" [ngClass]="role.icon"></i>
                        </button>
                    }
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-danger" (click)="activeModal.dismiss('i18n_canceled')">
                {{ 'i18n_button_decline' | translate }}
            </button>
        </div>
    `,
})
export class SelectRoleDialogComponent {
    @Input() user!: User;

    constructor(public activeModal: NgbActiveModal) {}
}
