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
import { ToastrService } from 'ngx-toastr';
import type { ExamEnrolment } from '../../../enrolment/enrolment.model';
import { EnrolmentService } from '../../../enrolment/enrolment.service';
import { User } from '../../../session/session.service';
import type { Exam, ExamParticipation } from '../../exam.model';

@Component({
    selector: 'exam-pre-participant-selector',
    templateUrl: './examPreParticipantSelector.component.html',
})
export class ExamPreParticipantSelectorComponent implements OnInit {
    @Input() exam!: Exam;

    participants: User[] = [];
    newPreParticipant: { email?: string } = { email: '' };

    constructor(
        private translate: TranslateService,
        private http: HttpClient,
        private toast: ToastrService,
        private Enrolment: EnrolmentService,
    ) {}

    ngOnInit() {
        this.participants = this.exam.children
            .map((c) => c.examParticipation)
            .filter((p): p is ExamParticipation => p !== undefined)
            .map((p) => p.user);
    }

    addPreParticipant = () => {
        const exists =
            this.exam.examEnrolments.map((e) => e.preEnrolledUserEmail).indexOf(this.newPreParticipant.email) > -1;
        if (!exists) {
            this.Enrolment.enrollStudent$(this.exam, this.newPreParticipant).subscribe({
                next: (enrolment) => {
                    this.exam.examEnrolments.push(enrolment);
                    delete this.newPreParticipant.email;
                },
                error: this.toast.error,
            });
        }
    };

    removeParticipant = (id: number) => {
        this.http.delete(`/app/enrolments/student/${id}`).subscribe({
            next: () => {
                this.exam.examEnrolments = this.exam.examEnrolments.filter((ee) => ee.id !== id);
                this.toast.info(this.translate.instant('sitnet_participant_removed'));
            },
            error: this.toast.error,
        });
    };

    renderParticipantLabel = (enrolment: ExamEnrolment) =>
        enrolment.preEnrolledUserEmail
            ? enrolment.preEnrolledUserEmail
            : enrolment.user?.firstName + ' ' + enrolment?.user.lastName;
}
