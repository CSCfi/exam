/*
 * Copyright (c) 2017 Exam Consortium
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
 */
import { NgClass } from '@angular/common';
import type { OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import { NgbDropdown, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Accessibility, ExamRoom } from '../../reservation/reservation.model';
import { AccessibilityService } from './accessibility.service';

@Component({
    selector: 'xm-accessibility-picker',
    template: `<div class="col-md-12">
        <div class="sitnet-info-text">{{ 'i18n_room_accessibility_info' | translate }}</div>
        <div>
            <span class="dropdown" ngbDropdown>
                <button
                    ngbDropdownToggle
                    class="btn btn-outline-secondary"
                    type="button"
                    id="dropDownMenu1"
                    aria-expanded="true"
                >
                    {{ selectedAccessibilities() }}&nbsp;<span class="caret"></span>
                </button>
                <div
                    ngbDropdownMenu
                    style="padding-left: 0; min-width: 17em"
                    role="menu"
                    aria-labelledby="dropDownMenu1"
                >
                    @for (ac of accessibilities; track ac) {
                        <button
                            ngbDropdownItem
                            role="presentation"
                            class="pointer"
                            [ngClass]="isSelected(ac) ? 'active' : ''"
                            (click)="updateAccessibility(ac)"
                            (keydown.enter)="updateAccessibility(ac)"
                        >
                            {{ ac.name }}
                        </button>
                    }
                </div>
            </span>
        </div>
    </div>`,
    standalone: true,
    imports: [NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownItem, NgClass, TranslateModule],
})
export class AccessibilitySelectorComponent implements OnInit {
    @Input() room!: ExamRoom;
    accessibilities: Accessibility[] = [];

    constructor(
        private translate: TranslateService,
        private toast: ToastrService,
        private accessibilityService: AccessibilityService,
    ) {}

    ngOnInit() {
        this.accessibilityService.getAccessibilities().subscribe((resp) => {
            this.accessibilities = resp;
        });
    }

    selectedAccessibilities = () => {
        return this.room.accessibilities.length === 0
            ? this.translate.instant('i18n_select')
            : this.room.accessibilities
                  .map((ac) => {
                      return ac.name;
                  })
                  .join(', ');
    };

    isSelected = (ac: Accessibility) => {
        return this.getIndexOf(ac) > -1;
    };

    updateAccessibility = (ac: Accessibility) => {
        const index = this.getIndexOf(ac);
        if (index > -1) {
            this.room.accessibilities.splice(index, 1);
        } else {
            this.room.accessibilities.push(ac);
        }
        const ids = this.room.accessibilities.map((item) => item.id).join(', ');

        this.accessibilityService.updateRoomAccessibilities(this.room.id, { ids: ids }).subscribe(() => {
            this.toast.info(this.translate.instant('i18n_room_updated'));
        });
    };

    getIndexOf = (ac: Accessibility) => this.room.accessibilities.map((a) => a.id).indexOf(ac.id);
}
