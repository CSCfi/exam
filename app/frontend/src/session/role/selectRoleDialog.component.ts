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

        <div class="modal-header">
            <h1 class="sitnet-black"><i class="fa fa-user"></i>&nbsp;&nbsp;{{'sitnet_select_role' | translate}}</h1>
        </div>
        <div class="modal-body">
            <div ngbDropdown>
                <button ngbDropdownToggle class="btn btn-default" type="button" id="dropDownMenu1">
                    {{'sitnet_choose' | translate}}&nbsp;<span class="caret"></span>
                </button>
                <ul ngbDropdownMenu aria-labelledby="dropDownMenu1">
                    <li *ngFor="let role of user.roles">
                        <a class="dropdown-item pointer" title="{{role.displayName | translate}}"
                            (click)="activeModal.close(role)">
                            <i class="fa pull-right" [ngClass]="role.icon"></i>
                            {{role.displayName | translate}}
                        </a>
                    </li>
                </ul>
            </div>
        </div>
        <div class="modal-footer">
            <div class="col-md-12">
                <button class="btn btn-sm btn-danger pull-right" (click)="activeModal.dismiss()">
                    {{'sitnet_button_decline' | translate}}
                </button>
            </div>
        </div>
    </div>
    `
})
export class SelectRoleDialogComponent {
    @Input() user: User;

    constructor(public activeModal: NgbActiveModal) { }

}
