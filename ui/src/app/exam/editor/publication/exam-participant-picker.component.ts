// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbTypeahead, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Observable } from 'rxjs';
import { from } from 'rxjs';
import { debounceTime, distinctUntilChanged, exhaustMap, take } from 'rxjs/operators';
import type { ExamEnrolment, ExamParticipation } from 'src/app/enrolment/enrolment.model';
import { EnrolmentService } from 'src/app/enrolment/enrolment.service';
import type { Exam } from 'src/app/exam/exam.model';
import type { User } from 'src/app/session/session.model';

@Component({
    selector: 'xm-exam-participant-selector',
    template: `
        <div class="row">
            <div class="col-md-5 offset-md-3">
                <div class="input-group">
                    <input
                        type="text"
                        class="form-control"
                        placeholder="{{ 'i18n_write_participant_name' | translate }}"
                        [(ngModel)]="participantName"
                        [ngbTypeahead]="listStudents$"
                        [inputFormatter]="nameFormat"
                        [resultFormatter]="nameFormat"
                        (selectItem)="setExamParticipant($event)"
                    />
                    <button
                        [disabled]="!newParticipantData().id"
                        (click)="addParticipant()"
                        class="input-group-text btn btn-success"
                    >
                        {{ 'i18n_add' | translate }}
                    </button>
                </div>
            </div>
        </div>

        <div class="row mt-1">
            <span class="col-md-9 offset-md-3 text-break mt-2">
                {{ 'i18n_maturity_exam_participants_info' | translate }}
                @if (exam().state === 'PUBLISHED') {
                    {{ 'i18n_exam_published' | translate }}
                } @else {
                    {{ 'i18n_exam_not_published' | translate }}
                }
            </span>
        </div>
        @if (examEnrolments().length > 0) {
            <div class="row mt-3">
                <div class="col-md-5 offset-md-3">{{ 'i18n_exam_participants' | translate }}:</div>
            </div>
            <!-- Students not having finished the exam, sorted alphabetically -->
            @for (enrolment of examEnrolments(); track enrolment) {
                <div class="row" [class.hover-grey]="exam().state !== 'PUBLISHED'">
                    <div class="col-md-5 offset-md-3 d-flex align-items-center justify-content-between mt-2">
                        <small>
                            {{ renderParticipantLabel(enrolment) }}
                            @if (enrolment.user?.email) {
                                &lt;{{ enrolment.user?.email }}&gt;
                            }
                            @if (enrolment.user?.userIdentifier) {
                                ({{ enrolment.user?.userIdentifier }})
                            }
                        </small>
                        <button
                            class="btn btn-outline-danger btn-sm ms-3 flex-shrink-0"
                            (click)="removeParticipant(enrolment.id)"
                            [hidden]="exam().state === 'PUBLISHED'"
                            [ariaLabel]="renderParticipantLabel(enrolment)"
                        >
                            {{ 'i18n_remove' | translate }}
                        </button>
                    </div>
                </div>
            }
        }
        @if (participants().length > 0) {
            <div class="row mt-3">
                <div class="col-md-5 offset-md-3">{{ 'i18n_finished_exam_participants' | translate }}:</div>
            </div>
            <!-- Students that have finished the exam -->
            @for (participant of participants(); track participant) {
                <div class="row">
                    <div class="col-md-5 offset-md-3 mt-2">
                        <small>
                            {{ participant.firstName }} {{ participant.lastName }} &lt;{{ participant.email }}&gt;
                            @if (participant.userIdentifier) {
                                ({{ participant.userIdentifier }})
                            }
                        </small>
                    </div>
                </div>
            }
        }
    `,
    imports: [FormsModule, NgbTypeahead, TranslateModule],
    styleUrls: ['../../exam.shared.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExamParticipantSelectorComponent {
    readonly exam = input.required<Exam>();

    readonly examEnrolments = linkedSignal(() => this.exam().examEnrolments);
    readonly newParticipantData = signal<{ id?: number }>({});
    readonly participants = computed(() => {
        const currentExam = this.exam();
        return currentExam.children
            .map((c) => c.examParticipation)
            .filter((p): p is ExamParticipation => p !== undefined)
            .map((p) => p.user);
    });
    participantName = '';

    private readonly http = inject(HttpClient);
    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastrService);
    private readonly Enrolment = inject(EnrolmentService);

    listStudents$ = (criteria$: Observable<string>): Observable<User[]> =>
        criteria$.pipe(
            debounceTime(200),
            distinctUntilChanged(),
            exhaustMap((s) => (s.length < 2 ? from([]) : this.findUsers$(s))),
            take(15),
        );

    nameFormat = (u: User | string) => {
        if (typeof u === 'string') return u;
        const uid = u.userIdentifier ? ` (${u.userIdentifier})` : '';
        return `${u.firstName} ${u.lastName} <${u.email}>${uid}`;
    };

    setExamParticipant(event: NgbTypeaheadSelectItemEvent) {
        this.newParticipantData.update((p) => ({ ...p, id: event.item.id }));
    }

    addParticipant() {
        this.Enrolment.enrollStudent$(this.exam(), this.newParticipantData()).subscribe({
            next: (enrolment) => {
                this.examEnrolments.update((list) => [...list, enrolment]);
                this.newParticipantData.set({});
                this.participantName = '';
            },
            error: (err) => this.toast.error(err),
        });
    }

    removeParticipant(id: number) {
        this.http.delete(`/app/enrolments/student/${id}`).subscribe({
            next: () => {
                this.examEnrolments.update((list) => list.filter((ee) => ee.id !== id));
                this.toast.info(this.translate.instant('i18n_participant_removed'));
            },
            error: (err) => this.toast.error(err),
        });
    }

    renderParticipantLabel(enrolment: ExamEnrolment) {
        return enrolment.preEnrolledUserEmail
            ? enrolment.preEnrolledUserEmail
            : enrolment.user?.firstName + ' ' + enrolment?.user.lastName;
    }

    private findUsers$(criteria: string) {
        return this.http.get<User[]>(`/app/students/${this.exam().id}`, { params: { q: criteria } });
    }
}
