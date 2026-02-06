// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { KeyValuePipe } from '@angular/common';
import type { OnInit } from '@angular/core';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { AppConfig } from 'src/app/administrative/administrative.model';
import { CKEditorComponent } from 'src/app/shared/ckeditor/ckeditor.component';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { SettingsService } from './settings.service';

@Component({
    templateUrl: './settings.component.html',
    selector: 'xm-settings',
    imports: [
        CKEditorComponent,
        FormsModule,
        NgbPopover,
        KeyValuePipe,
        TranslateModule,
        PageHeaderComponent,
        PageContentComponent,
    ],
})
export class SettingsComponent implements OnInit {
    config!: AppConfig;
    attributes: string[] = [];
    minorAgreementUpdate = false;

    private Settings = inject(SettingsService);
    private toast = inject(ToastrService);
    private translate = inject(TranslateService);

    ngOnInit() {
        this.Settings.getConfig$().subscribe((resp) => (this.config = resp));
        this.Settings.listAttributes$().subscribe((resp) => (this.attributes = resp));
    }

    updateAgreement = () =>
        this.Settings.updateAgreement$(this.config, this.minorAgreementUpdate).subscribe({
            next: this.onSuccess,
            error: this.onError,
        });

    updateDeadline = () =>
        this.Settings.updateDeadline$(this.config).subscribe({ next: this.onSuccess, error: this.onError });

    updateReservationWindow = () =>
        this.Settings.updateReservationWindow$(this.config).subscribe({ next: this.onSuccess, error: this.onError });

    private onSuccess = () =>
        this.toast.info(this.translate.instant('i18n_settings') + ' ' + this.translate.instant('i18n_updated'));

    private onError = (error: string) => this.toast.error(error);
}
