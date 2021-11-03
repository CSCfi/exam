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
import { Component, Input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as toast from 'toastr';

import { EnrolmentService } from '../../../enrolment/enrolment.service';

import type { Exam } from '../../exam.model';
import type { ExamEnrolment } from '../../../enrolment/enrolment.model';

@Component({
    selector: 'exam-pre-participant-selector',
    templateUrl: './examPreParticipantSelector.component.html',
})
export class ExamPreParticipantSelectorComponent {
    @Input() exam!: Exam;

    newPreParticipant: { email?: string } = { email: '' };

    constructor(private translate: TranslateService, private http: HttpClient, private Enrolment: EnrolmentService) {}

    addPreParticipant = () => {
        const exists =
            this.exam.examEnrolments.map((e) => e.preEnrolledUserEmail).indexOf(this.newPreParticipant.email) > -1;
        if (!exists) {
            this.Enrolment.enrollStudent(this.exam, this.newPreParticipant).subscribe(
                (enrolment) => {
                    this.exam.examEnrolments.push(enrolment);
                    delete this.newPreParticipant.email;
                },
                (error) => toast.error(error),
            );
        }
    };

    removeParticipant = (id: number) => {
        this.http.delete(`/app/enrolments/student/${id}`).subscribe(
            () => {
                this.exam.examEnrolments = this.exam.examEnrolments.filter((ee) => ee.id !== id);
                toast.info(this.translate.instant('sitnet_participant_removed'));
            },
            (err) => toast.error(err.data),
        );
    };

    renderParticipantLabel = (enrolment: ExamEnrolment) =>
        enrolment.preEnrolledUserEmail
            ? enrolment.preEnrolledUserEmail
            : enrolment.user?.firstName + ' ' + enrolment?.user.lastName;
}
