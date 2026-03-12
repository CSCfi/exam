// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { email, form, FormField } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { ExamEnrolment, ExamParticipation } from 'src/app/enrolment/enrolment.model';
import { EnrolmentService } from 'src/app/enrolment/enrolment.service';
import type { Exam } from 'src/app/exam/exam.model';

@Component({
    selector: 'xm-exam-pre-participant-selector',
    template: `<div class="row">
            <div class="col-md-9 offset-md-3">
                <form>
                    <input
                        type="email"
                        placeholder="{{ 'i18n_write_pre_participant_email' | translate }}"
                        class="form-control w-50 make-inline"
                        [formField]="participantForm.email"
                    />
                    <button
                        [disabled]="participantForm.email().invalid()"
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
                @if (exam().state === 'PUBLISHED') {
                    {{ 'i18n_exam_published' | translate }}
                } @else {
                    {{ 'i18n_exam_not_published' | translate }}
                }
            </span>
            @if (exam().examEnrolments.length > 0) {
                <span class="row offset-md-3 mt-3 w-auto">
                    {{ 'i18n_exam_participants' | translate }}:
                    <!-- Students not having finished the exam, sorted alphabetically -->
                    @for (enrolment of exam().examEnrolments; track enrolment) {
                        <div class="ms-1 mt-1 row" [class.hover-grey]="exam().state !== 'PUBLISHED'">
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
                                [hidden]="exam().state === 'PUBLISHED'"
                            >
                                {{ 'i18n_remove' | translate }}
                            </button>
                        </div>
                    }
                </span>
            }
            @if (participants().length > 0) {
                <span class="row col-md-9 offset-md-3 mt-3 ">
                    {{ 'i18n_finished_exam_participants' | translate }}:
                    <!-- Students that have finished the exam -->
                    @for (participant of participants(); track participant) {
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
    imports: [FormField, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExamPreParticipantSelectorComponent {
    readonly exam = input.required<Exam>();

    readonly participantForm = form(signal({ email: '' }), (path) => {
        email(path.email);
    });
    readonly participants = computed(() => {
        const currentExam = this.exam();
        return currentExam.children
            .map((c) => c.examParticipation)
            .filter((p): p is ExamParticipation => p !== undefined)
            .map((p) => p.user);
    });

    private readonly translate = inject(TranslateService);
    private readonly http = inject(HttpClient);
    private readonly toast = inject(ToastrService);
    private readonly Enrolment = inject(EnrolmentService);

    addPreParticipant = () => {
        const currentExam = this.exam();
        const emailValue = this.participantForm.email().value();
        const exists = currentExam.examEnrolments.map((e) => e.preEnrolledUserEmail).indexOf(emailValue) > -1;
        if (!exists) {
            this.Enrolment.enrollStudent$(currentExam, { email: emailValue }).subscribe({
                next: (enrolment) => {
                    currentExam.examEnrolments.push(enrolment);
                    this.participantForm.email().value.set('');
                },
                error: (err) => this.toast.error(err),
            });
        }
    };

    removeParticipant = (id: number) => {
        const currentExam = this.exam();
        this.http.delete(`/app/enrolments/student/${id}`).subscribe({
            next: () => {
                currentExam.examEnrolments = currentExam.examEnrolments.filter((ee) => ee.id !== id);
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
