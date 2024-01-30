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
import { DatePipe, NgClass } from '@angular/common';
import type { OnInit } from '@angular/core';
import { Component, Input, computed, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { ToastrService } from 'ngx-toastr';
import { DateTimePickerComponent } from 'src/app/shared/date/date-time-picker.component';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import type { ExaminationEvent, ExaminationEventConfiguration, MaintenancePeriod } from '../../exam.model';
import { ExamService } from '../../exam.service';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';

@Component({
    selector: 'xm-examination-event-dialog',
    standalone: true,
    imports: [NgClass, FormsModule, DatePipe, TranslateModule, DateTimePickerComponent, OrderByPipe],
    templateUrl: './examination-event-dialog.component.html',
})
export class ExaminationEventDialogComponent implements OnInit {
    @Input() examId = 0;
    @Input() duration = 0;
    @Input() config?: ExaminationEventConfiguration;
    @Input() maintenancePeriods: MaintenancePeriod[] = [];
    @Input() requiresPassword = false;
    @Input() examMaxDate?: string;
    start = signal(new Date(new Date().getTime() + 60 * 1000));
    description = signal('');
    capacity = signal(0);
    maxSimultaneousCapacity = signal(0);
    conflictingEvents = signal<ExaminationEvent[]>([]); // based on effect
    availableCapacity = computed(
        () => this.maxSimultaneousCapacity() - (this.conflictingEvents() || []).reduce((sum, e) => sum + e.capacity, 0),
    );
    quitPassword = signal<string | undefined>(undefined);
    settingsPassword = signal<string | undefined>(undefined);
    hasEnrolments = signal(false);
    settingsPasswordInputType = signal('password');
    quitPasswordInputType = signal('password');
    maxDateValidator?: Date;
    private now = new Date();

    constructor(
        public activeModal: NgbActiveModal,
        private http: HttpClient,
        private translate: TranslateService,
        private toast: ToastrService,
        private Exam: ExamService,
    ) {
        effect(() =>
            this.http
                .get<ExaminationEvent[]>('/app/examinationevents/conflicting', {
                    params: { start: this.start().toISOString(), duration: this.duration },
                })
                .pipe(map((events) => events.filter((e) => e.examinationEventConfiguration.exam.id !== this.examId)))
                .subscribe((events) => this.conflictingEvents.set(events)),
        );
    }

    ngOnInit() {
        if (this.config) {
            this.start.set(new Date(this.config.examinationEvent.start));
            this.description.set(this.config.examinationEvent.description);
            this.capacity.set(this.config.examinationEvent.capacity);
            this.quitPassword.set(this.config.quitPassword);
            this.settingsPassword.set(this.config.settingsPassword);
            this.hasEnrolments.set(this.config.examEnrolments.length > 0);
        } else {
            this.start.update((d) => {
                const d2 = d;
                d2.setMinutes(60);
                return d;
            });
        }
        if (this.examMaxDate) {
            const maxDate = new Date(Date.parse(this.examMaxDate)).getTime() - new Date(0).getTime();
            this.maxDateValidator = new Date(this.now.getTime() + maxDate);
        }
        this.http
            .get<{ max: number }>('/app/settings/byodmaxparticipants')
            .subscribe((value) => this.maxSimultaneousCapacity.set(value.max));
    }

    toggleSettingsPasswordInputType = () =>
        this.settingsPasswordInputType.set(this.settingsPasswordInputType() === 'text' ? 'password' : 'text');
    toggleQuitPasswordInputType = () =>
        this.quitPasswordInputType.set(this.quitPasswordInputType() === 'text' ? 'password' : 'text');

    onStartDateChange = (event: { date: Date }) => {
        if (this.maxDateValidator && this.maxDateValidator < event.date) {
            this.toast.error(
                this.translate.instant('i18n_date_too_far_in_future') +
                    ' ' +
                    DateTime.fromJSDate(this.maxDateValidator || new Date()).toFormat('dd.MM.yyyy HH:mm'),
            );
        }
        if (this.now > event.date) {
            this.toast.error(this.translate.instant('i18n_select_time_in_future'));
        }
        this.start.set(event.date);
    };

    ok() {
        if (!this.start) {
            this.toast.error(this.translate.instant('i18n_no_examination_start_date_picked'));
        }
        if (this.maxDateValidator && this.maxDateValidator < this.start()) {
            this.toast.error(this.translate.instant('i18n_invalid_start_date_picked'));
            return;
        }
        const config = {
            config: {
                examinationEvent: {
                    start: this.start().toISOString(),
                    description: this.description(),
                    capacity: this.capacity(),
                },
                settingsPassword: this.settingsPassword(),
                quitPassword: this.quitPassword(),
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
