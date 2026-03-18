// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, model, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { disabled, form, FormField, min, required } from '@angular/forms/signals';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { combineLatest, map, switchMap } from 'rxjs';
import type { ExaminationEvent, ExaminationEventConfiguration } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { MaintenancePeriod } from 'src/app/facility/facility.model';
import { DateTimePickerComponent } from 'src/app/shared/date/date-time-picker.component';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';

@Component({
    selector: 'xm-examination-event-dialog',
    imports: [FormField, DatePipe, TranslateModule, DateTimePickerComponent, OrderByPipe],
    templateUrl: './examination-event-dialog.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExaminationEventDialogComponent implements OnInit {
    readonly examId = model.required<number>();
    readonly duration = model.required<number>();
    readonly config = model<ExaminationEventConfiguration | undefined>(undefined);
    readonly maintenancePeriods = model<MaintenancePeriod[]>([]);
    readonly requiresPassword = model(false);
    readonly examMinDate = model('');
    readonly examMaxDate = model('');

    readonly start = signal(new Date(new Date().getTime() + 60 * 1000));
    readonly maxSimultaneousCapacity = signal(0);
    readonly conflictingEvents = signal<ExaminationEvent[]>([]);
    readonly availableCapacity = computed(
        () => this.maxSimultaneousCapacity() - (this.conflictingEvents() || []).reduce((sum, e) => sum + e.capacity, 0),
    );
    readonly hasEnrolments = signal(false);
    readonly eventForm = form(
        signal({ description: '', capacity: 0, settingsPassword: '', quitPassword: '' }),
        (path) => {
            required(path.description);
            required(path.capacity);
            min(path.capacity, 1);
            required(path.settingsPassword);
            disabled(path.settingsPassword, () => !this.requiresPassword() || this.hasEnrolments());
            required(path.quitPassword);
            disabled(path.quitPassword, () => !this.requiresPassword() || this.hasEnrolments());
        },
    );
    readonly settingsPasswordInputType = signal('password');
    readonly quitPasswordInputType = signal('password');

    private readonly activeModal = inject(NgbActiveModal);
    private readonly http = inject(HttpClient);
    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastrService);
    private readonly Exam = inject(ExamService);

    private now = new Date();

    constructor() {
        combineLatest([toObservable(this.start), toObservable(this.duration)])
            .pipe(
                switchMap(([start, duration]) =>
                    this.http.get<ExaminationEvent[]>('/app/examinationevents/conflicting', {
                        params: { start: start.toISOString(), duration: duration.toString() },
                    }),
                ),
                map((events) => events.filter((e) => e.id !== this.config()?.examinationEvent.id)),
                takeUntilDestroyed(),
            )
            .subscribe((events) => this.conflictingEvents.set(events));

        this.http
            .get<{ max: number }>('/app/settings/byodmaxparticipants')
            .subscribe((value) => this.maxSimultaneousCapacity.set(value.max));
    }

    ngOnInit() {
        const currentConfig = this.config();
        if (currentConfig) {
            this.start.set(new Date(currentConfig.examinationEvent.start));
            this.eventForm.description().value.set(currentConfig.examinationEvent.description);
            this.eventForm.capacity().value.set(currentConfig.examinationEvent.capacity);
            this.eventForm.settingsPassword().value.set(currentConfig.settingsPassword ?? '');
            this.eventForm.quitPassword().value.set(currentConfig.quitPassword ?? '');
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
                    description: this.eventForm.description().value(),
                    capacity: this.eventForm.capacity().value(),
                },
                settingsPassword: this.requiresPassword()
                    ? this.eventForm.settingsPassword().value() || undefined
                    : undefined,
                quitPassword: this.requiresPassword() ? this.eventForm.quitPassword().value() || undefined : undefined,
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
