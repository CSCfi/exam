// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import type { OnInit } from '@angular/core';
import { Component, Input, computed, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { ExaminationEvent, ExaminationEventConfiguration } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { MaintenancePeriod } from 'src/app/facility/facility.model';
import { DateTimePickerComponent } from 'src/app/shared/date/date-time-picker.component';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';

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
    @Input() examMinDate = '';
    @Input() examMaxDate = '';
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
        this.http
            .get<{ max: number }>('/app/settings/byodmaxparticipants')
            .subscribe((value) => this.maxSimultaneousCapacity.set(value.max));
    }

    toggleSettingsPasswordInputType = () =>
        this.settingsPasswordInputType.set(this.settingsPasswordInputType() === 'text' ? 'password' : 'text');
    toggleQuitPasswordInputType = () =>
        this.quitPasswordInputType.set(this.quitPasswordInputType() === 'text' ? 'password' : 'text');

    onStartDateChange = (event: { date: Date }) => {
        if (this.now > event.date) {
            this.toast.error(this.translate.instant('i18n_select_time_in_future'));
        }
        this.start.set(event.date);
    };

    ok() {
        if (!this.start) {
            this.toast.error(this.translate.instant('i18n_no_examination_start_date_picked'));
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
