// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgbActiveModal, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import type { User } from 'src/app/session/session.model';

@Component({
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
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectRoleDialogComponent {
    user!: User; // Set by the component managing the modal

    activeModal = inject(NgbActiveModal);
}
