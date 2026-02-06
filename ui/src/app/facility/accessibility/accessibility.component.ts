// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { OnInit } from '@angular/core';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Accessibility } from 'src/app/reservation/reservation.model';
import { AccessibilityService } from './accessibility.service';

@Component({
    templateUrl: './accessibility.component.html',
    selector: 'xm-accessibility',
    imports: [FormsModule, TranslateModule],
})
export class AccessibilityComponent implements OnInit {
    newItem: { name: string } = { name: '' };
    accessibilities: (Accessibility & { showName: boolean })[] = [];

    private accessibilityService = inject(AccessibilityService);
    private toast = inject(ToastrService);
    private translate = inject(TranslateService);

    ngOnInit() {
        this.newItem = { name: '' };
        this.accessibilityService.getAccessibilities().subscribe((resp) => {
            this.accessibilities = resp.map((acc) => ({ ...acc, showName: false }));
        });
    }

    initItem = () => {
        this.newItem = { name: '' };
    };

    add = () =>
        this.accessibilityService.addAccessibility(this.newItem).subscribe((resp) => {
            this.accessibilities.push({ ...resp, showName: false });
            this.toast.info(this.translate.instant('i18n_accessibility_added'));
            this.initItem();
        });

    update = (accessibility: Accessibility) =>
        this.accessibilityService.updateAccessibility(accessibility).subscribe(() => {
            this.toast.info(this.translate.instant('i18n_accessibility_updated'));
        });

    remove = (accessibility: Accessibility & { showName: boolean }) =>
        this.accessibilityService.removeAccessibility(accessibility.id).subscribe(() => {
            this.accessibilities.splice(this.accessibilities.indexOf(accessibility), 1);
            this.toast.info(this.translate.instant('i18n_accessibility_removed'));
        });
}
