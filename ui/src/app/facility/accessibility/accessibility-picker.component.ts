// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import type { OnInit } from '@angular/core';
import { Component, Input, inject } from '@angular/core';
import { NgbDropdown, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Accessibility, ExamRoom } from 'src/app/reservation/reservation.model';
import { AccessibilityService } from './accessibility.service';

@Component({
    selector: 'xm-accessibility-picker',
    template: `<div class="row">
        <div class="col-md-12">
            <div class="facility-info-text">{{ 'i18n_room_accessibility_info' | translate }}</div>
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
    imports: [NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownItem, NgClass, TranslateModule],
})
export class AccessibilitySelectorComponent implements OnInit {
    @Input() room!: ExamRoom;

    accessibilities: Accessibility[] = [];

    private translate = inject(TranslateService);
    private toast = inject(ToastrService);
    private accessibilityService = inject(AccessibilityService);

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
