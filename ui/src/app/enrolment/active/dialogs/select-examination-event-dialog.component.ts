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
import { DatePipe } from '@angular/common';
import type { OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import type { Exam, ExaminationEventConfiguration } from 'src/app/exam/exam.model';

@Component({
    selector: 'xm-select-examination-event-dialog',
    standalone: true,
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
