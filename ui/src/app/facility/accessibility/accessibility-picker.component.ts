// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
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
                <div ngbDropdownMenu role="menu" aria-labelledby="dropDownMenu1">
                    @for (ac of accessibilities(); track ac) {
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
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessibilitySelectorComponent {
    room = input.required<ExamRoom>();

    accessibilities = signal<Accessibility[]>([]);
    roomAccessibilities = signal<Accessibility[]>([]);

    selectedAccessibilities = computed(() => {
        const accessibilities = this.roomAccessibilities();
        return accessibilities.length === 0
            ? this.translate.instant('i18n_select')
            : accessibilities.map((ac) => ac.name).join(', ');
    });

    private translate = inject(TranslateService);
    private toast = inject(ToastrService);
    private accessibilityService = inject(AccessibilityService);

    constructor() {
        this.accessibilityService.getAccessibilities().subscribe((resp) => {
            this.accessibilities.set(resp);
        });

        // Sync roomAccessibilities signal with room input
        effect(() => {
            const currentRoom = this.room();
            this.roomAccessibilities.set([...currentRoom.accessibilities]);
        });
    }

    isSelected(ac: Accessibility) {
        return this.getIndexOf(ac) > -1;
    }

    updateAccessibility(ac: Accessibility) {
        const currentAccessibilities = this.roomAccessibilities();
        const index = this.getIndexOf(ac);
        let updatedAccessibilities: Accessibility[];

        if (index > -1) {
            updatedAccessibilities = currentAccessibilities.filter((item) => item.id !== ac.id);
        } else {
            updatedAccessibilities = [...currentAccessibilities, ac];
        }

        // Update local signal
        this.roomAccessibilities.set(updatedAccessibilities);

        // Update the room object for backward compatibility (if parent is not using signals)
        const currentRoom = this.room();
        currentRoom.accessibilities = updatedAccessibilities;

        const ids = updatedAccessibilities.map((item) => item.id).join(', ');

        this.accessibilityService.updateRoomAccessibilities(currentRoom.id, { ids: ids }).subscribe(() => {
            this.toast.info(this.translate.instant('i18n_room_updated'));
        });
    }

    getIndexOf(ac: Accessibility) {
        return this.roomAccessibilities()
            .map((a) => a.id)
            .indexOf(ac.id);
    }
}
