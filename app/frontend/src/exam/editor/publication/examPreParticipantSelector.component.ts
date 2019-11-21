/*
 * Copyright (c) 2017 Exam Consortium
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
 */
import { HttpClient } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as toast from 'toastr';

import { ExamEnrolment } from '../../../enrolment/enrolment.model';
import { EnrolmentService } from '../../../enrolment/enrolment.service';
import { Exam } from '../../exam.model';

@Component({
    selector: 'exam-pre-participant-selector',
    template: require('./examPreParticipantSelector.component.html'),
})
export class ExamPreParticipantSelectorComponent implements OnInit {
    @Input() exam: Exam;

    newPreParticipant: { email: string } = { email: '' };
    enrolments: ExamEnrolment[];

    constructor(private translate: TranslateService, private http: HttpClient, private Enrolment: EnrolmentService) {}

    ngOnInit() {
        this.enrolments = this.exam.examEnrolments.filter(ee => ee.preEnrolledUserEmail);
    }

    addPreParticipant = () => {
        const exists =
            this.exam.examEnrolments.map(e => e.preEnrolledUserEmail).indexOf(this.newPreParticipant.email) > -1;
        if (!exists) {
            this.Enrolment.enrollStudent(this.exam, this.newPreParticipant).subscribe(
                enrolment => {
                    this.enrolments.push(enrolment);
                    delete this.newPreParticipant.email;
                },
                error => toast.error(error.data),
            );
        }
    };

    removeParticipant = (id: number) => {
        this.http.delete(`/app/enrolments/student/${id}`).subscribe(
            () => {
                this.enrolments = this.enrolments.filter(ee => ee.id !== id);
                toast.info(this.translate.instant('sitnet_participant_removed'));
            },
            err => toast.error(err.data),
        );
    };
}
