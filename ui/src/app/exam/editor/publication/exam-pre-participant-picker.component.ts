// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { ExamEnrolment, ExamParticipation } from 'src/app/enrolment/enrolment.model';
import { EnrolmentService } from 'src/app/enrolment/enrolment.service';
import type { Exam } from 'src/app/exam/exam.model';
import { User } from 'src/app/session/session.model';

@Component({
    selector: 'xm-exam-pre-participant-selector',
    template: `<div class="row">
            <div class="col-md-9 offset-md-3">
                <form #myForm="ngForm" name="myForm">
                    <input
                        type="email"
                        name="email"
                        placeholder="{{ 'i18n_write_pre_participant_email' | translate }}"
                        class="form-control w-50 make-inline"
                        [(ngModel)]="newPreParticipant.email"
                        email
                    />
                    <button
                        [disabled]="!myForm.valid || !newPreParticipant.email"
                        (click)="addPreParticipant()"
                        class="btn btn-success"
                    >
                        {{ 'i18n_add' | translate }}
                    </button>
                </form>
            </div>
        </div>

        <div class="row mt-1">
            <span class="col-md-9 mt-2 offset-md-3 w-auto text-break">
                {{ 'i18n_maturity_exam_participants_info' | translate }}
                @if (exam.state === 'PUBLISHED') {
                    {{ 'i18n_exam_published' | translate }}
                } @else {
                    {{ 'i18n_exam_not_published' | translate }}
                }
            </span>
            @if (exam.examEnrolments.length > 0) {
                <span class="row offset-md-3 mt-3 w-auto">
                    {{ 'i18n_exam_participants' | translate }}:
                    <!-- Students not having finished the exam, sorted alphabetically -->
                    @for (enrolment of exam.examEnrolments; track enrolment) {
                        <div class="ms-1 mt-1 row" [ngClass]="{ 'hover-grey': exam.state !== 'PUBLISHED' }">
                            <div class="ms-1 col-8">
                                {{ renderParticipantLabel(enrolment) }}
                                @if (enrolment.user?.userIdentifier) {
                                    ({{ enrolment.user.userIdentifier }})
                                }
                            </div>
                            <!-- Remove button -->
                            <button
                                class="btn btn-danger btn-sm ms-1 w-auto"
                                (click)="removeParticipant(enrolment.id)"
                                [hidden]="exam.state === 'PUBLISHED'"
                            >
                                {{ 'i18n_remove' | translate }}
                            </button>
                        </div>
                    }
                </span>
            }
            @if (participants.length > 0) {
                <span class="row col-md-9 offset-md-3 mt-3 ">
                    {{ 'i18n_finished_exam_participants' | translate }}:
                    <!-- Students that have finished the exam -->
                    @for (participant of participants; track participant) {
                        <div class="ms-1 row">
                            <div class="ms-1 ">
                                {{ participant.firstName }} {{ participant.lastName }}
                                @if (participant.userIdentifier) {
                                    ({{ participant.userIdentifier }})
                                }
                            </div>
                        </div>
                    }
                </span>
            }
        </div>`,
    imports: [FormsModule, NgClass, TranslateModule],
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
