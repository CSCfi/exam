/*
 * Copyright (c) 2018 Exam Consortium
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
 *
 */
import type { OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { ExaminationEventConfiguration, MaintenancePeriod } from '../../exam.model';
import { ExamService } from '../../exam.service';

@Component({
    selector: 'xm-examination-event-dialog',
    templateUrl: './examination-event-dialog.component.html',
})
export class ExaminationEventDialogComponent implements OnInit {
    @Input() examId = 0;
    @Input() config?: ExaminationEventConfiguration;
    @Input() maintenancePeriods: MaintenancePeriod[] = [];
    @Input() requiresPassword = false;
    @Input() examMaxDate?: string;
    start = new Date();
    description = '';
    capacity = 0;
    password?: string;
    hasEnrolments = false;
    pwdInputType = 'password';
    now = new Date();
    maxDateValidator?: Date;

    constructor(
        public activeModal: NgbActiveModal,
        private translate: TranslateService,
        private toast: ToastrService,
        private Exam: ExamService,
    ) {}

    ngOnInit() {
        if (this.config) {
            this.start = new Date(this.config.examinationEvent.start);
            this.description = this.config.examinationEvent.description;
            this.capacity = this.config.examinationEvent.capacity;
            this.password = this.config.settingsPassword;
            this.hasEnrolments = this.config.examEnrolments.length > 0;
        }
        if (this.examMaxDate) {
            const maxDate = new Date(Date.parse(this.examMaxDate)).getTime() - new Date(0).getTime();
            this.maxDateValidator = new Date(this.now.getTime() + maxDate);
        }
    }

    togglePasswordInputType = () => (this.pwdInputType = this.pwdInputType === 'text' ? 'password' : 'text');
    onStartDateChange = (event: { date: Date }) => {
        if (this.maxDateValidator && this.maxDateValidator > event.date) {
            this.start = event.date;
        }
    };

    ok() {
        if (!this.start) {
            this.toast.error(this.translate.instant('sitnet_no_examination_start_date_picked'));
        }
        if (this.maxDateValidator && this.maxDateValidator < this.start) {
            this.toast.error(this.translate.instant('sitnet_invalid_start_date_picked'));
            return;
        }
        const config = {
            config: {
                examinationEvent: {
                    start: this.start.toISOString(),
                    description: this.description,
                    capacity: this.capacity,
                },
                settingsPassword: this.password,
            },
        };
        if (!this.config) {
            // new config
            this.Exam.addExaminationEvent$(this.examId, config).subscribe({
                next: (response: ExaminationEventConfiguration) => {
                    this.activeModal.close(response);
                },
                error: (err) => this.toast.error(err),
            });
        } else {
            this.Exam.updateExaminationEvent$(this.examId, { ...config, id: this.config.id }).subscribe({
                next: (response: ExaminationEventConfiguration) => {
                    this.activeModal.close(response);
                },
                error: (err) => this.toast.error(err),
            });
        }
    }

    cancel = () => this.activeModal.dismiss();
}
