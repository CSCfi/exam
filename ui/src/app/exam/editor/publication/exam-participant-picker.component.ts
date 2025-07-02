// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import type { OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbTypeahead, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Observable } from 'rxjs';
import { from } from 'rxjs';
import { debounceTime, distinctUntilChanged, exhaustMap, take, tap } from 'rxjs/operators';
import type { ExamEnrolment, ExamParticipation } from 'src/app/enrolment/enrolment.model';
import { EnrolmentService } from 'src/app/enrolment/enrolment.service';
import type { Exam } from 'src/app/exam/exam.model';
import type { User } from 'src/app/session/session.model';

@Component({
    selector: 'xm-exam-participant-selector',
    template: `
        <div class="row">
            <div class="col-md-9 offset-md-3">
                <input
                    type="text"
                    class="form-control w-50 make-inline"
                    placeholder="{{ 'i18n_write_participant_name' | translate }}"
                    [(ngModel)]="newParticipant.name"
                    [ngbTypeahead]="listStudents$"
                    [inputFormatter]="nameFormat"
                    [resultFormatter]="nameFormat"
                    (selectItem)="setExamParticipant($event)"
                />
                <button [disabled]="!newParticipant.id" (click)="addParticipant()" class="btn btn-success">
                    {{ 'i18n_add' | translate }}
                </button>
            </div>
        </div>

        <div class="row mt-1">
            <span class="col-md-9 offset-md-3 w-auto text-break mt-2">
                {{ 'i18n_maturity_exam_participants_info' | translate }}
                @if (exam.state === 'PUBLISHED') {
                    {{ 'i18n_exam_published' | translate }}
                } @else {
                    {{ 'i18n_exam_not_published' | translate }}
                }
            </span>
        </div>
        @if (exam.examEnrolments.length > 0) {
            <div class="row mt-3">
                <div class="col-md-12">{{ 'i18n_exam_participants' | translate }}:</div>
            </div>
            <!-- Students not having finished the exam, sorted alphabetically -->
            @for (enrolment of exam.examEnrolments; track enrolment) {
                <div class="row" [ngClass]="{ 'hover-grey': exam.state !== 'PUBLISHED' }">
                    <div class="col-md-12">
                        &hyphen; {{ renderParticipantLabel(enrolment) }} <small><{{ enrolment.user?.email }}></small>
                        @if (enrolment.user?.userIdentifier) {
                            <small> ({{ enrolment.user.userIdentifier }})</small>
                        }
                        <button
                            class="btn btn-danger btn-sm ms-1 w-auto m-1"
                            (click)="removeParticipant(enrolment.id)"
                            [hidden]="exam.state === 'PUBLISHED'"
                            [attr.aria-label]="renderParticipantLabel(enrolment)"
                        >
                            {{ 'i18n_remove' | translate }}
                        </button>
                    </div>
                </div>
            }
        }
        @if (participants.length > 0) {
            <div class="row mt-3">
                <div class="col-md-12">{{ 'i18n_finished_exam_participants' | translate }}:</div>
            </div>
            <!-- Students that have finished the exam -->
            @for (participant of participants; track participant) {
                <div class="row">
                    <div class="col-md-12">
                        &hyphen; {{ participant.firstName }} {{ participant.lastName }}
                        <small><{{ participant.email }}></small>
                        @if (participant.userIdentifier) {
                            ({{ participant.userIdentifier }})
                        }
                    </div>
                </div>
            }
        }
    `,
    imports: [FormsModule, NgClass, NgbTypeahead, TranslateModule],
    styleUrls: ['../../exam.shared.scss'],
})
export class ExamParticipantSelectorComponent implements OnInit {
    @Input() exam!: Exam;
    newParticipant: { id?: number; name?: string } = {};
    participants: User[] = [];

    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private toast: ToastrService,
        private Enrolment: EnrolmentService,
    ) {}

    ngOnInit() {
        this.participants = this.exam.children
            .map((c) => c.examParticipation)
            .filter((p): p is ExamParticipation => p !== undefined)
            .map((p) => p.user);
    }

    listStudents$ = (criteria$: Observable<string>): Observable<User[]> =>
        criteria$.pipe(
            tap((name) => (this.newParticipant.name = name)),
            debounceTime(200),
            distinctUntilChanged(),
            exhaustMap((s) => (s.length < 2 ? from([]) : this.findUsers$(s))),
            take(15),
        );

    idFormat = (u: User) => u.id;
    nameFormat = (u: User) => {
        const uid = u.userIdentifier ? ` (${u.userIdentifier})` : '';
        return `${u.firstName} ${u.lastName} <${u.email}>${uid}`;
    };

    setExamParticipant = (event: NgbTypeaheadSelectItemEvent) => {
        this.newParticipant.id = event.item.id;
    };

    addParticipant = () =>
        this.Enrolment.enrollStudent$(this.exam, this.newParticipant).subscribe({
            next: (enrolment) => {
                // push to the list
                this.exam.examEnrolments.push(enrolment);
                // nullify input fields
                delete this.newParticipant.name;
                delete this.newParticipant.id;
            },
            error: (err) => this.toast.error(err),
        });

    removeParticipant = (id: number) =>
        this.http.delete(`/app/enrolments/student/${id}`).subscribe({
            next: () => {
                this.exam.examEnrolments = this.exam.examEnrolments.filter((ee) => ee.id !== id);
                this.toast.info(this.translate.instant('i18n_participant_removed'));
            },
            error: (err) => this.toast.error(err),
        });

    renderParticipantLabel = (enrolment: ExamEnrolment) =>
        enrolment.preEnrolledUserEmail
            ? enrolment.preEnrolledUserEmail
            : enrolment.user?.firstName + ' ' + enrolment?.user.lastName;

    private findUsers$ = (criteria: string) =>
        this.http.get<User[]>(`/app/students/${this.exam.id}`, { params: { q: criteria } });
}
