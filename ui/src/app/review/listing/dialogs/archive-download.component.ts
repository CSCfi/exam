/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */
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
    template: `<div id="sitnet-dialog" role="dialog" aria-modal="true">
        <div class="student-details-title-wrap mart20">
            <div class="student-enroll-title">{{ 'i18n_exam_validity' | translate }}</div>
        </div>
        <div class="modal-body mx-4">
            <div id="dashboard">
                <div>
                    <label for="archive-download-start">{{ 'i18n_begin' | translate }}:</label>
                    <xm-date-picker
                        id="archive-download-start"
                        (updated)="startDateChanged($event)"
                        autofocus
                    ></xm-date-picker>
                </div>
                <div>
                    <label for="archive-download-end">{{ 'i18n_end' | translate }}:</label>
                    <xm-date-picker id="archive-download-end" (updated)="endDateChanged($event)"></xm-date-picker>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-primary" (click)="cancel()">
                {{ 'i18n_button_cancel' | translate }}
            </button>
            <button class="btn btn btn-success" (click)="ok()">
                {{ 'i18n_search' | translate }}
            </button>
        </div>
    </div> `,
})
export class ArchiveDownloadComponent {
    params: { startDate: Date | null; endDate: Date | null } = { startDate: new Date(), endDate: new Date() };

    constructor(private modal: NgbActiveModal, private translate: TranslateService, private toast: ToastrService) {}

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
