// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Component, HostListener } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Toast, ToastPackage, ToastrService } from 'ngx-toastr';

@Component({
    selector: `xm-session-expire-warning`,
    template: `
        <b>{{ title }}.</b>
        {{ message }}
    `,
    standalone: true,
})
export class SessionExpireWarningComponent extends Toast {
    // constructor is only necessary when not using AoT
    constructor(
        protected override toastrService: ToastrService,
        public override toastPackage: ToastPackage,
        private http: HttpClient,
        private i18n: TranslateService,
    ) {
        super(toastrService, toastPackage);
    }

    @HostListener('window:keydown', ['$event'])
    handleKeyDown(event: KeyboardEvent) {
        if (event.ctrlKey && event.key === 'e') {
            this.continue();
        }
    }

    continue = () => {
        this.toastrService.clear();
        this.http.put<void>('/app/session', {}).subscribe({
            next: () => {
                this.toastrService.info(this.i18n.instant('i18n_session_extended'), '', {
                    timeOut: 2000,
                });
            },
            error: (resp) => this.toastrService.error(resp),
        });
    };
}
