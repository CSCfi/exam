// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { forkJoin, of } from 'rxjs';
import { EnrolmentService } from 'src/app/enrolment/enrolment.service';
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
                            @if (config.id && reasons()[config.id]) {
                                <div class="alert alert-warning py-1 px-2 mb-0 mt-1">
                                    <small>{{ reasons()[config.id!] }}</small>
                                </div>
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
export class SelectExaminationEventDialogComponent implements OnInit {
    readonly exam = signal<Exam | null>(null);
    readonly enrolmentId = signal<number | undefined>(undefined);

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

    readonly reasons = signal<Record<number, string | null>>({});

    private readonly existingEventId = signal<number | undefined>(undefined);
    private readonly activeModal = inject(NgbActiveModal);
    private readonly Enrolment = inject(EnrolmentService);

    ngOnInit() {
        const configs = this.configs();
        const eid = this.enrolmentId();
        if (!eid || configs.length === 0) return;

        const checks = configs.map((c) =>
            c.id != null ? this.Enrolment.checkExaminationEventConfig$(eid, c.id) : of(null),
        );
        forkJoin(checks).subscribe((results) => {
            const map: Record<number, string | null> = {};
            configs.forEach((c, i) => {
                if (c.id != null) map[c.id] = results[i];
            });
            this.reasons.set(map);
        });
    }

    selectEvent(event: ExaminationEventConfiguration) {
        this.activeModal.close(event);
    }

    cancel() {
        this.activeModal.dismiss();
    }
}
