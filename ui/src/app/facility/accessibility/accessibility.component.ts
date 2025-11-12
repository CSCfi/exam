// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Accessibility } from 'src/app/reservation/reservation.model';
import { AccessibilityService } from './accessibility.service';

@Component({
    templateUrl: './accessibility.component.html',
    selector: 'xm-accessibility',
    imports: [FormsModule, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessibilityComponent {
    accessibilities = signal<(Accessibility & { showName: boolean })[]>([]);

    private _newItemName = signal('');
    private accessibilityService = inject(AccessibilityService);
    private toast = inject(ToastrService);
    private translate = inject(TranslateService);

    constructor() {
        this.accessibilityService.getAccessibilities().subscribe((resp) => {
            this.accessibilities.set(resp.map((acc) => ({ ...acc, showName: false })));
        });
    }

    get newItem() {
        return { name: this._newItemName() };
    }

    set newItem(value: { name: string }) {
        this._newItemName.set(value.name);
    }

    initItem() {
        this._newItemName.set('');
    }

    add() {
        const currentName = this._newItemName();
        if (!currentName) return;

        this.accessibilityService.addAccessibility({ name: currentName }).subscribe((resp) => {
            this.accessibilities.update((items) => [...items, { ...resp, showName: false }]);
            this.toast.info(this.translate.instant('i18n_accessibility_added'));
            this.initItem();
        });
    }

    update(accessibility: Accessibility) {
        // Get the updated accessibility from the signal to ensure we have the latest name
        const updated = this.accessibilities().find((item) => item.id === accessibility.id);
        if (updated) {
            this.accessibilityService.updateAccessibility(updated).subscribe(() => {
                this.toast.info(this.translate.instant('i18n_accessibility_updated'));
            });
        }
    }

    saveAndToggle(accessibility: Accessibility & { showName: boolean }) {
        this.toggleShowName(accessibility);
        this.update(accessibility);
    }

    toggleShowName(accessibility: Accessibility & { showName: boolean }) {
        this.accessibilities.update((items) =>
            items.map((item) => (item.id === accessibility.id ? { ...item, showName: !item.showName } : item)),
        );
    }

    updateAccessibilityName(accessibility: Accessibility & { showName: boolean }, name: string) {
        this.accessibilities.update((items) =>
            items.map((item) => (item.id === accessibility.id ? { ...item, name } : item)),
        );
    }

    remove(accessibility: Accessibility & { showName: boolean }) {
        this.accessibilityService.removeAccessibility(accessibility.id).subscribe(() => {
            this.accessibilities.update((items) => items.filter((item) => item.id !== accessibility.id));
            this.toast.info(this.translate.instant('i18n_accessibility_removed'));
        });
    }
}
