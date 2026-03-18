// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import type { Exam, ExaminationEventConfiguration } from 'src/app/exam/exam.model';

@Component({
    selector: 'xm-select-examination-event-dialog',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TranslateModule, DatePipe],
    template: `
        <div class="modal-header">
            <h1 class="xm-modal-title">
                <i class="bi-calendar-event"></i>&nbsp;&nbsp;{{ 'i18n_pick_examination_event' | translate }}
            </h1>
        </div>
        <div class="modal-body">
            @if (exam()) {
                <p class="text-muted mb-3">
                    {{ 'i18n_exam_duration' | translate }}: {{ exam()!.duration }}
                    {{ 'i18n_minutes' | translate }}
                </p>
            }
            <div class="list-group">
                @for (config of configs(); track config) {
                    <div class="list-group-item d-flex justify-content-between align-items-center gap-3">
                        <div>
                            <div class="fw-semibold">
                                {{ config.examinationEvent.start | date: 'dd.MM.yyyy HH:mm' }}
                            </div>
                            @if (config.examinationEvent.description) {
                                <small class="text-muted">{{ config.examinationEvent.description }}</small>
                            }
                        </div>
                        <button class="btn btn-sm btn-success flex-shrink-0" (click)="selectEvent(config)" autofocus>
                            {{ 'i18n_select' | translate }}
                        </button>
                    </div>
                }
            </div>
        </div>
        <div class="modal-footer">
            <div class="col-md-12">
                <button class="btn btn-sm btn-danger float-end" (click)="cancel()">
                    {{ 'i18n_button_decline' | translate }}
                </button>
            </div>
        </div>
    `,
})
export class SelectExaminationEventDialogComponent {
    // Regular properties for programmatic access (set by modal service)
    readonly exam = signal<Exam | null>(null);

    // Computed signal for filtered and sorted configurations
    readonly configs = computed(() => {
        const examValue = this.exam();
        const existingId = this.existingEventId();
        if (!examValue) {
            return [];
        }
        return examValue.examinationEventConfigurations
            .filter((ec) => DateTime.fromISO(ec.examinationEvent.start) > DateTime.now() && ec.id !== existingId)
            .sort(
                (a, b) =>
                    DateTime.fromISO(a.examinationEvent.start).toMillis() -
                    DateTime.fromISO(b.examinationEvent.start).toMillis(),
            );
    });

    private readonly existingEventId = signal<number | undefined>(undefined);

    private readonly activeModal = inject(NgbActiveModal);

    selectEvent(event: ExaminationEventConfiguration) {
        this.activeModal.close(event);
    }

    cancel() {
        this.activeModal.dismiss();
    }
}
