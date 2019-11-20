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
import { Component, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import * as toast from 'toastr';

import { ExaminationEventConfiguration } from '../../exam.model';

@Component({
    selector: 'examination-event-dialog',
    template: require('./examinationEventDialog.component.html'),
})
export class ExaminationEventDialogComponent implements OnInit {
    config?: ExaminationEventConfiguration;
    start: Date;
    description: string;
    password: string;
    hasEnrolments: boolean;
    pwdInputType = 'password';

    constructor(public activeModal: NgbActiveModal, private translate: TranslateService) {}

    ngOnInit() {
        if (this.config) {
            this.start = new Date(this.config.examinationEvent.start);
            this.description = this.config.examinationEvent.description;
            this.password = this.config.settingsPassword;
            this.hasEnrolments = this.config.examEnrolments.length > 0;
        } else {
            this.start = new Date();
        }
    }

    togglePasswordInputType = () => (this.pwdInputType = this.pwdInputType === 'text' ? 'password' : 'text');
    onStartDateChange = (date: Date) => (this.start = date);

    ok() {
        if (!this.start) {
            toast.error(this.translate.instant('sitnet_no_examination_start_date_picked'));
        }
        this.activeModal.close({
            $value: {
                config: {
                    examinationEvent: {
                        start: this.start,
                        description: this.description,
                    },
                    settingsPassword: this.password,
                },
            },
        });
    }

    cancel = () => this.activeModal.dismiss();
}
