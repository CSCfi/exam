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
import { merge } from 'lodash';
import type { Exam, ExaminationEventConfiguration } from '../../../exam/exam.model';

@Component({
    selector: 'xm-select-examination-event-dialog',
    template: `<div id="sitnet-dialog">
        <div class="student-message-dialog-wrapper-padding">
            <div class="student-enroll-dialog-wrap">
                <h1 class="student-enroll-title">
                    <i class="bi-calendar-event"></i>&nbsp;&nbsp;{{ 'sitnet_pick_examination_event' | translate }}
                </h1>
            </div>
            <div class="modal-body">
                <div class="row">
                    <div class="col-md-12">
                        <h3>
                            {{ 'sitnet_exam_duration' | translate }}: {{ exam.duration }}
                            {{ 'sitnet_minutes' | translate }}
                        </h3>
                    </div>
                </div>
                <div *ngFor="let config of configs" class="examination-event">
                    <div class="row">
                        <div class="col-md-12">
                            <h3>{{ config.examinationEvent.start | date: 'dd.MM.yyyy HH:mm' }}</h3>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-12">
                            <span>{{ config.examinationEvent.description }}</span>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-12 mart10">
                            <button class="btn btn-sm btn-success" (click)="selectEvent(config)">
                                {{ 'sitnet_select' | translate }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <div class="col-md-12">
                    <button class="btn btn-sm btn-danger float-end" (click)="cancel()">
                        {{ 'sitnet_button_decline' | translate }}
                    </button>
                </div>
            </div>
        </div>
    </div> `,
})
export class SelectExaminationEventDialogComponent implements OnInit {
    @Input() exam!: Exam;
    @Input() existingEventId?: number;

    configs: ExaminationEventConfiguration[] = [];

    constructor(public activeModal: NgbActiveModal) {}

    ngOnInit() {
        this.configs = this.exam.examinationEventConfigurations
            .map((ec) => merge(ec, { examinationEvent: { start: new Date(ec.examinationEvent.start) } }))
            .filter((ec) => ec.examinationEvent.start > new Date() && ec.id !== this.existingEventId)
            .sort((a, b) => a.examinationEvent.start.getTime() - b.examinationEvent.start.getTime());
    }

    selectEvent(event: ExaminationEventConfiguration) {
        this.activeModal.close(event);
    }

    cancel() {
        this.activeModal.dismiss();
    }
}
