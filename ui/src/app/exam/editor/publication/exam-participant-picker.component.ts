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
import type { OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import type { NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Observable } from 'rxjs';
import { from } from 'rxjs';
import { debounceTime, distinctUntilChanged, exhaustMap, take, tap } from 'rxjs/operators';
import type { ExamEnrolment } from '../../../enrolment/enrolment.model';
import { EnrolmentService } from '../../../enrolment/enrolment.service';
import type { User } from '../../../session/session.service';
import type { Exam, ExamParticipation } from '../../exam.model';

@Component({
    selector: 'xm-exam-participant-selector',
    template: `<div class="row">
            <div class="col-md-9 offset-md-3">
                <input
                    type="text"
                    class="form-control wdth-30 make-inline"
                    placeholder="{{ 'sitnet_write_participant_name' | translate }}"
                    [(ngModel)]="newParticipant.name"
                    [ngbTypeahead]="listStudents$"
                    [inputFormatter]="nameFormat"
                    [resultFormatter]="nameFormat"
                    (selectItem)="setExamParticipant($event)"
                />
                <button [disabled]="!newParticipant.id" (click)="addParticipant()" class="btn btn-primary green">
                    {{ 'sitnet_add' | translate }}
                </button>
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
                            title="{{ 'sitnet_remove' | translate }}"
                        >
                            <img
                                [hidden]="exam.state === 'PUBLISHED'"
                                src="/assets/images/icon_remove.svg"
                                alt="exam"
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
    nameFormat = (u: User & { name: string }) => {
        return u.name;
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
                this.toast.info(this.translate.instant('sitnet_participant_removed'));
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
