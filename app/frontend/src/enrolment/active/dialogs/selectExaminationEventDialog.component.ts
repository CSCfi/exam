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
import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { merge } from 'lodash';

import { Exam, ExaminationEventConfiguration } from '../../../exam/exam.model';

@Component({
    selector: 'select-examination-event-dialog',
    template: require('./selectExaminationEventDialog.component.html'),
})
export class SelectExaminationEventDialogComponent implements OnInit {
    @Input() exam: Exam;
    @Input() existingEventId?: number;

    configs: ExaminationEventConfiguration[];

    constructor(public activeModal: NgbActiveModal) {}

    ngOnInit() {
        this.configs = this.exam.examinationEventConfigurations
            .map(ec => merge(ec, { examinationEvent: { start: new Date(ec.examinationEvent.start) } }))
            .filter(ec => ec.examinationEvent.start > new Date() && ec.id !== this.existingEventId)
            .sort((a, b) => a.examinationEvent.start.getTime() - b.examinationEvent.start.getTime());
    }

    selectEvent(event: ExaminationEventConfiguration) {
        this.activeModal.close(event);
    }

    cancel() {
        this.activeModal.dismiss();
    }
}
