// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { KeyValuePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
    changeDetection: ChangeDetectionStrategy.OnPush,
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
export class SettingsComponent {
    config = signal<AppConfig | undefined>(undefined);
    attributes = signal<string[]>([]);
    private _minorAgreementUpdate = signal(false);

    private Settings = inject(SettingsService);
    private toast = inject(ToastrService);
    private translate = inject(TranslateService);

    constructor() {
        this.Settings.getConfig$().subscribe((resp) => this.config.set(resp));
        this.Settings.listAttributes$().subscribe((resp) => this.attributes.set(resp));
    }

    get minorAgreementUpdate(): boolean {
        return this._minorAgreementUpdate();
    }

    get reviewDeadline(): number | undefined {
        return this.config()?.reviewDeadline;
    }

    get reservationWindowSize(): number | undefined {
        return this.config()?.reservationWindowSize;
    }

    set minorAgreementUpdate(value: boolean) {
        this._minorAgreementUpdate.set(value);
    }

    set reviewDeadline(value: number | undefined) {
        const currentConfig = this.config();
        if (currentConfig && value !== undefined) {
            this.config.set({ ...currentConfig, reviewDeadline: value });
        }
    }

    set reservationWindowSize(value: number | undefined) {
        const currentConfig = this.config();
        if (currentConfig && value !== undefined) {
            this.config.set({ ...currentConfig, reservationWindowSize: value });
        }
    }

    updateAgreement() {
        const currentConfig = this.config();
        if (!currentConfig) {
            return;
        }
        this.Settings.updateAgreement$(currentConfig, this._minorAgreementUpdate()).subscribe({
            next: this.onSuccess,
            error: this.onError,
        });
    }

    updateDeadline() {
        const currentConfig = this.config();
        if (!currentConfig) {
            return;
        }
        this.Settings.updateDeadline$(currentConfig).subscribe({ next: this.onSuccess, error: this.onError });
    }

    updateReservationWindow() {
        const currentConfig = this.config();
        if (!currentConfig) {
            return;
        }
        this.Settings.updateReservationWindow$(currentConfig).subscribe({ next: this.onSuccess, error: this.onError });
    }

    eulaChanged(event: string) {
        const currentConfig = this.config();
        if (!currentConfig) {
            return;
        }
        this.config.set({ ...currentConfig, eula: event });
    }

    private onSuccess = () =>
        this.toast.info(this.translate.instant('i18n_settings') + ' ' + this.translate.instant('i18n_updated'));

    private onError = (error: string) => this.toast.error(error);
}
