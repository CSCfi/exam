// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { format } from 'date-fns';
import { ToastrService } from 'ngx-toastr';
import { DatePickerComponent } from 'src/app/shared/date/date-picker.component';

@Component({
    selector: 'xm-archive-download',
    standalone: true,
    imports: [TranslateModule, DatePickerComponent],
    template: `
        <div class="modal-header">
            <div class="xm-modal-title">{{ 'i18n_exam_validity' | translate }}</div>
        </div>
        <div class="modal-body mx-4">
            <label for="archive-download-start">{{ 'i18n_begin' | translate }}:</label>
            <xm-date-picker id="archive-download-start" (updated)="startDateChanged($event)" autofocus></xm-date-picker>
            <label for="archive-download-end">{{ 'i18n_end' | translate }}:</label>
            <xm-date-picker id="archive-download-end" (updated)="endDateChanged($event)"></xm-date-picker>
        </div>
        <div class="d-flex flex-row-reverse flex-align-r m-3">
            <button class="btn btn btn-success" (click)="ok()">
                {{ 'i18n_search' | translate }}
            </button>
            <button class="btn btn-outline-secondary me-3" (click)="cancel()">
                {{ 'i18n_button_cancel' | translate }}
            </button>
        </div>
    `,
})
export class ArchiveDownloadComponent {
    params: { startDate: Date | null; endDate: Date | null } = { startDate: new Date(), endDate: new Date() };

    constructor(
        private modal: NgbActiveModal,
        private translate: TranslateService,
        private toast: ToastrService,
    ) {}

    startDateChanged = (event: { date: Date | null }) => (this.params.startDate = event.date);

    endDateChanged = (event: { date: Date | null }) => (this.params.endDate = event.date);

    ok = () => {
        let start, end;
        if (this.params.startDate) {
            start = this.params.startDate;
        }
        if (this.params.endDate) {
            end = this.params.endDate;
        }
        if (start && end && end < start) {
            this.toast.error(this.translate.instant('i18n_endtime_before_starttime'));
        } else if (start && end) {
            this.modal.close({
                $value: {
                    start: format(start, 'dd.MM.yyyy'),
                    end: format(end, 'dd.MM.yyyy'),
                },
            });
        }
    };
    cancel = () => this.modal.dismiss();
}
