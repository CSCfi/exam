import { HttpClient } from '@angular/common/http';
import { Component, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Toast, ToastPackage, ToastrService } from 'ngx-toastr';

@Component({
    selector: `xm-session-expire-warning`,
    styles: [
        `
            :host {
                position: relative;
                overflow: hidden;
                margin: 0 0 6px;
                padding: 10px 10px 10px 10px;
                width: 300px;
                border-radius: 3px 3px 3px 3px;
                pointer-events: all;
                cursor: pointer;
            }
            .btn-pink {
                -webkit-backface-visibility: hidden;
                -webkit-transform: translateZ(0);
            }
        `,
    ],
    template: `
        <div class="row">
            <div class="col-9" tabindex="0" (keydown.enter)="continue()" (click)="continue()">
                <div [class]="options.titleClass">
                    {{ title }}
                </div>
                <div role="alert" [class]="options.messageClass">
                    {{ message }}
                </div>
            </div>
        </div>
    `,
    preserveWhitespaces: false,
})
export class SessionExpireWarningComponent extends Toast {
    // constructor is only necessary when not using AoT
    constructor(
        protected override toastrService: ToastrService,
        public override toastPackage: ToastPackage,
        private http: HttpClient,
        private i18n: TranslateService,
        private router: Router,
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
                this.toastrService.info(this.i18n.instant('sitnet_session_extended'), '', {
                    timeOut: 1000,
                });
            },
            error: (resp) => this.toastrService.error(resp),
        });
    };
}
