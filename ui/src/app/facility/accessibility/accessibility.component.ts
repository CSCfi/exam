// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormField, form, required } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Accessibility } from 'src/app/reservation/reservation.model';
import { AccessibilityService } from './accessibility.service';

@Component({
    templateUrl: './accessibility.component.html',
    selector: 'xm-accessibility',
    imports: [FormsModule, FormField, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessibilityComponent {
    readonly accessibilities = signal<(Accessibility & { showName: boolean })[]>([]);
    readonly newItemForm = form(signal({ name: '' }), (path) => {
        required(path.name);
    });

    private readonly editNameForms = new Map<number, ReturnType<typeof this.createEditNameForm>>();

    private readonly accessibilityService = inject(AccessibilityService);
    private readonly toast = inject(ToastrService);
    private readonly translate = inject(TranslateService);

    constructor() {
        this.accessibilityService.getAccessibilities().subscribe((resp) => {
            this.accessibilities.set(resp.map((acc) => ({ ...acc, showName: false })));
        });
    }

    add() {
        const currentName = this.newItemForm.name().value();
        if (!currentName) return;

        this.accessibilityService.addAccessibility({ name: currentName }).subscribe((resp) => {
            this.accessibilities.update((items) => [...items, { ...resp, showName: false }]);
            this.toast.info(this.translate.instant('i18n_accessibility_added'));
            this.initItem();
        });
    }

    saveAndToggle(accessibility: Accessibility & { showName: boolean }) {
        const nextName = this.getEditNameForm(accessibility).name().value();
        this.accessibilities.update((items) =>
            items.map((item) => (item.id === accessibility.id ? { ...item, name: nextName } : item)),
        );
        this.toggleShowName(accessibility);
        this.update(accessibility);
    }

    toggleShowName(accessibility: Accessibility & { showName: boolean }) {
        this.accessibilities.update((items) =>
            items.map((item) => (item.id === accessibility.id ? { ...item, showName: !item.showName } : item)),
        );
    }

    getEditNameForm(accessibility: Accessibility & { showName: boolean }) {
        const existing = this.editNameForms.get(accessibility.id);
        if (existing) return existing;
        const created = this.createEditNameForm(accessibility.name);
        this.editNameForms.set(accessibility.id, created);
        return created;
    }

    remove(accessibility: Accessibility & { showName: boolean }) {
        this.accessibilityService.removeAccessibility(accessibility.id).subscribe(() => {
            this.accessibilities.update((items) => items.filter((item) => item.id !== accessibility.id));
            this.toast.info(this.translate.instant('i18n_accessibility_removed'));
        });
    }

    private initItem() {
        this.newItemForm.name().value.set('');
    }

    private update(accessibility: Accessibility) {
        // Get the updated accessibility from the signal to ensure we have the latest name
        const updated = this.accessibilities().find((item) => item.id === accessibility.id);
        if (updated) {
            this.accessibilityService.updateAccessibility(updated).subscribe(() => {
                this.toast.info(this.translate.instant('i18n_accessibility_updated'));
            });
        }
    }

    private createEditNameForm(name: string) {
        return form(signal({ name }));
    }
}
