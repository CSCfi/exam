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
import { NgFor, NgIf } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { ExamEnrolment } from '../../../enrolment/enrolment.model';
import { EnrolmentService } from '../../../enrolment/enrolment.service';
import { User } from '../../../session/session.service';
import type { Exam, ExamParticipation } from '../../exam.model';

@Component({
    selector: 'xm-exam-pre-participant-selector',
    template: `<div class="row">
            <div class="col-md-9 offset-md-3">
                <form #myForm="ngForm" name="myForm">
                    <input
                        type="email"
                        name="email"
                        placeholder="{{ 'i18n_write_pre_participant_email' | translate }}"
                        class="form-control wdth-30 make-inline"
                        [(ngModel)]="newPreParticipant.email"
                        email
                    />
                    <button
                        [disabled]="!myForm.valid || !newPreParticipant.email"
                        (click)="addPreParticipant()"
                        class="btn btn-primary green"
                    >
                        {{ 'i18n_add' | translate }}
                    </button>
                </form>
            </div>
        </div>
        <div class="row">
            <div class="col-md-9 offset-md-3">
                <ul class="muted-list mart10">
                    <!-- Students not having finished the exam -->
                    <li class="marl10" *ngFor="let enrolment of exam.examEnrolments">
                        {{ renderParticipantLabel(enrolment) }}
                        <span *ngIf="enrolment.user?.userIdentifier">({{ enrolment.user.userIdentifier }})</span>
                        <button
                            class="reviewer-remove"
                            [disabled]="exam.state === 'PUBLISHED'"
                            (click)="removeParticipant(enrolment.id)"
                            title="{{ 'i18n_remove' | translate }}"
                        >
                            <img
                                [hidden]="exam.state === 'PUBLISHED'"
                                src="/assets/images/icon_remove.svg"
                                alt=""
                                onerror="this.onerror=null;this.src='/assets/images/icon_remove.png'"
                            />
                        </button>
                    </li>
                    <!-- Students that have finished the exam -->
                    <li class="marl10 text-muted" *ngFor="let participant of participants">
                        {{ participant.firstName }} {{ participant.lastName }}
                        <span *ngIf="participant.userIdentifier">({{ participant.userIdentifier }})</span>
                    </li>
                </ul>
            </div>
        </div> `,
    standalone: true,
    imports: [FormsModule, NgFor, NgIf, TranslateModule],
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
                error: (err) => this.toast.error(err),
            });
        }
    };

    removeParticipant = (id: number) => {
        this.http.delete(`/app/enrolments/student/${id}`).subscribe({
            next: () => {
                this.exam.examEnrolments = this.exam.examEnrolments.filter((ee) => ee.id !== id);
                this.toast.info(this.translate.instant('i18n_participant_removed'));
            },
            error: (err) => this.toast.error(err),
        });
    };

    renderParticipantLabel = (enrolment: ExamEnrolment) =>
        enrolment.preEnrolledUserEmail
            ? enrolment.preEnrolledUserEmail
            : enrolment.user?.firstName + ' ' + enrolment?.user.lastName;
}
