// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe } from '@angular/common';
import type { OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import type { Exam, ExaminationEventConfiguration } from 'src/app/exam/exam.model';

@Component({
    selector: 'xm-select-examination-event-dialog',
    imports: [TranslateModule, DatePipe],
    template: `
        <div class="modal-header">
            <h1 class="xm-modal-title">
                <i class="bi-calendar-event"></i>&nbsp;&nbsp;{{ 'i18n_pick_examination_event' | translate }}
            </h1>
        </div>
        <div class="modal-body">
            <div class="row mb-2">
                <div class="col-md-12">
                    {{ 'i18n_exam_duration' | translate }}: {{ exam.duration }}
                    {{ 'i18n_minutes' | translate }}
                </div>
            </div>
            @for (config of configs; track config) {
                <div class="row">
                    <div class="col-md-12">
                        {{ config.examinationEvent.start | date: 'dd.MM.yyyy HH:mm' }}
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <span>{{ config.examinationEvent.description }}</span>
                    </div>
                </div>
                <div class="row mb-2">
                    <div class="col-md-12 mt-1">
                        <button class="btn btn-sm btn-success" (click)="selectEvent(config)" autofocus>
                            {{ 'i18n_select' | translate }}
                        </button>
                    </div>
                </div>
            }
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
    @Input() exam!: Exam;
    @Input() existingEventId?: number;

    configs: ExaminationEventConfiguration[] = [];

    constructor(public activeModal: NgbActiveModal) {}

    ngOnInit() {
        // for all confs over
        this.configs = this.exam.examinationEventConfigurations
            .filter(
                (ec) =>
                    DateTime.fromISO(ec.examinationEvent.start).toJSDate() > new Date() &&
                    ec.id !== this.existingEventId,
            )
            .sort((a, b) => (a.examinationEvent.start < b.examinationEvent.start ? -1 : 1));
    }

    selectEvent(event: ExaminationEventConfiguration) {
        this.activeModal.close(event);
    }

    cancel() {
        this.activeModal.dismiss();
    }
}
