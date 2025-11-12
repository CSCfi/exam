// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { take } from 'rxjs';
import type { ExaminationEvent, ExaminationEventConfiguration } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { MaintenancePeriod } from 'src/app/facility/facility.model';
import { DateTimePickerComponent } from 'src/app/shared/date/date-time-picker.component';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';

@Component({
    selector: 'xm-examination-event-dialog',
    imports: [NgClass, FormsModule, DatePipe, TranslateModule, DateTimePickerComponent, OrderByPipe],
    templateUrl: './examination-event-dialog.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExaminationEventDialogComponent {
    examId = model.required<number>();
    duration = model.required<number>();
    config = model<ExaminationEventConfiguration | undefined>(undefined);
    maintenancePeriods = model<MaintenancePeriod[]>([]);
    requiresPassword = model(false);
    examMinDate = model('');
    examMaxDate = model('');

    start = signal(new Date(new Date().getTime() + 60 * 1000));
    description = signal('');
    capacity = signal(0);
    maxSimultaneousCapacity = signal(0);
    conflictingEvents = signal<ExaminationEvent[]>([]);
    availableCapacity = computed(
        () => this.maxSimultaneousCapacity() - (this.conflictingEvents() || []).reduce((sum, e) => sum + e.capacity, 0),
    );
    quitPassword = signal<string | undefined>(undefined);
    settingsPassword = signal<string | undefined>(undefined);
    hasEnrolments = signal(false);
    settingsPasswordInputType = signal('password');
    quitPasswordInputType = signal('password');

    private activeModal = inject(NgbActiveModal);
    private http = inject(HttpClient);
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);
    private Exam = inject(ExamService);

    private now = new Date();

    constructor() {
        effect(() => {
            const currentStart = this.start();
            const currentDuration = this.duration();
            this.http
                .get<ExaminationEvent[]>('/app/examinationevents/conflicting', {
                    params: { start: currentStart.toISOString(), duration: currentDuration.toString() },
                })
                .pipe(take(1))
                .subscribe((events) => {
                    const currentConfig = this.config();
                    this.conflictingEvents.set(events.filter((e) => e.id !== currentConfig?.examinationEvent.id));
                });
        });

        effect(() => {
            const currentConfig = this.config();
            if (currentConfig) {
                this.start.set(new Date(currentConfig.examinationEvent.start));
                this.description.set(currentConfig.examinationEvent.description);
                this.capacity.set(currentConfig.examinationEvent.capacity);
                this.quitPassword.set(currentConfig.quitPassword);
                this.settingsPassword.set(currentConfig.settingsPassword);
                this.hasEnrolments.set(currentConfig.examEnrolments.length > 0);
            } else {
                // set start to next full hour
                this.start.update((d) => {
                    const nextHour = new Date(d.getTime());
                    nextHour.setMinutes(0, 0, 0);
                    nextHour.setHours(nextHour.getHours() + 1);
                    return nextHour;
                });
            }
        });

        this.http
            .get<{ max: number }>('/app/settings/byodmaxparticipants')
            .subscribe((value) => this.maxSimultaneousCapacity.set(value.max));
    }

    toggleSettingsPasswordInputType() {
        this.settingsPasswordInputType.update((v) => (v === 'text' ? 'password' : 'text'));
    }

    toggleQuitPasswordInputType() {
        this.quitPasswordInputType.update((v) => (v === 'text' ? 'password' : 'text'));
    }

    onStartDateChange(event: { date: Date }) {
        if (this.now > event.date) {
            this.toast.error(this.translate.instant('i18n_select_time_in_future'));
        }
        // date needs copying for signal to upate
        const newDate = new Date(event.date.getTime());
        this.start.set(newDate);
    }

    ok() {
        const currentStart = this.start();
        if (!currentStart) {
            this.toast.error(this.translate.instant('i18n_no_examination_start_date_picked'));
            return;
        }
        const config = {
            config: {
                examinationEvent: {
                    start: currentStart.toISOString(),
                    description: this.description(),
                    capacity: this.capacity(),
                },
                settingsPassword: this.settingsPassword(),
                quitPassword: this.quitPassword(),
            },
        };
        const currentConfig = this.config();
        if (!currentConfig) {
            // new config
            this.Exam.addExaminationEvent$(this.examId(), config).subscribe({
                next: (response: ExaminationEventConfiguration) => {
                    this.activeModal.close(response);
                },
                error: (err) => this.toast.error(err),
            });
        } else {
            this.Exam.updateExaminationEvent$(this.examId(), { ...config, id: currentConfig.id }).subscribe({
                next: (response: ExaminationEventConfiguration) => {
                    this.activeModal.close(response);
                },
                error: (err) => this.toast.error(err),
            });
        }
    }

    cancel() {
        this.activeModal.dismiss();
    }
}
