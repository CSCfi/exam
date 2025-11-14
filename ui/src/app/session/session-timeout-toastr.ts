// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Component, HostListener, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Toast, ToastPackage, ToastrService } from 'ngx-toastr';

@Component({
    template: `
        <b>{{ title }}.</b>
        {{ message }}
    `,
})
export class SessionExpireWarningComponent extends Toast {
    public override toastPackage: ToastPackage;
    protected override toastrService: ToastrService;

    private http = inject(HttpClient);
    private i18n = inject(TranslateService);

    // constructor is only necessary when not using AoT
    constructor() {
        const toastrService = inject(ToastrService);
        const toastPackage = inject(ToastPackage);

        super(toastrService, toastPackage);

        this.toastrService = toastrService;
        this.toastPackage = toastPackage;
    }

    @HostListener('window:keydown', ['$event'])
    handleKeyDown(event: KeyboardEvent) {
        if (event.ctrlKey && event.key === 'e') {
            this.continue();
        }
    }

    continue() {
        this.toastrService.clear();
        this.http.put<void>('/app/session', {}).subscribe({
            next: () => {
                this.toastrService.info(this.i18n.instant('i18n_session_extended'), '', {
                    timeOut: 2000,
                });
            },
            error: (resp) => this.toastrService.error(resp),
        });
    }
}
