import { KeyValuePipe } from '@angular/common';
import type { OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { CKEditorComponent } from '../../shared/ckeditor/ckeditor.component';
import { AppConfig, SettingsService } from './settings.service';

@Component({
    templateUrl: './settings.component.html',
    selector: 'xm-settings',
    standalone: true,
    imports: [CKEditorComponent, FormsModule, NgbPopover, KeyValuePipe, TranslateModule],
})
export class SettingsComponent implements OnInit {
    config!: AppConfig;
    attributes: string[] = [];

    constructor(
        private Settings: SettingsService,
        private toast: ToastrService,
        private translate: TranslateService,
    ) {}

    ngOnInit() {
        this.Settings.getConfig$().subscribe((resp) => (this.config = resp));
        this.Settings.listAttributes$().subscribe((resp) => (this.attributes = resp));
    }

    updateAgreement = () =>
        this.Settings.updateAgreement$(this.config).subscribe({ next: this.onSuccess, error: this.onError });

    updateDeadline = () =>
        this.Settings.updateDeadline$(this.config).subscribe({ next: this.onSuccess, error: this.onError });

    updateReservationWindow = () =>
        this.Settings.updateReservationWindow$(this.config).subscribe({ next: this.onSuccess, error: this.onError });

    private onSuccess = () =>
        this.toast.info(this.translate.instant('i18n_settings') + ' ' + this.translate.instant('i18n_updated'));

    private onError = (error: string) => this.toast.error(error);
}
