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
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { from, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { ConfirmationDialogService } from '../../shared/dialogs/confirmation-dialog.service';
import { ExaminationTypeSelectorComponent } from '../editor/common/examination-type-picker.component';
import type { Exam, Implementation } from '../exam.model';
import { ExamService } from '../exam.service';

type ExamListExam = Exam & { expired: boolean; ownerAggregate: string };

@Component({
    selector: 'xm-exam-list',
    templateUrl: './exam-list.component.html',
})
export class ExamListingComponent implements OnInit, OnDestroy {
    activeId = 0;
    views = [
        { view: 'PUBLISHED', showExpired: false },
        { view: 'PUBLISHED', showExpired: true },
        { view: 'SAVED', showExpired: false },
        { view: 'DRAFT', showExpired: false },
    ];
    examsPredicate = 'examActiveEndDate';
    reverse = true;
    loader = { loading: false };
    exams: ExamListExam[] = [];
    subject = new Subject<string>();
    ngUnsubscribe = new Subject();

    constructor(
        private translate: TranslateService,
        private router: Router,
        private http: HttpClient,
        private modal: NgbModal,
        private toast: ToastrService,
        private Confirmation: ConfirmationDialogService,
        private Exam: ExamService,
    ) {}

    ngOnDestroy() {
        this.ngUnsubscribe.next(undefined);
        this.ngUnsubscribe.complete();
    }

    ngOnInit() {
        this.subject
            .pipe(
                debounceTime(500),
                distinctUntilChanged(),
                switchMap((term) => this.http.get<ExamListExam[]>('/app/exams', { params: { filter: term } })),
                tap(() => (this.loader.loading = true)),
                map((exams: ExamListExam[]) => {
                    exams.forEach((e) => {
                        e.ownerAggregate = e.examOwners.map((o) => `${o.firstName} ${o.lastName}`).join();
                        if (e.state === 'PUBLISHED') {
                            e.expired = e.examActiveEndDate != null && new Date() > new Date(e.examActiveEndDate);
                        } else {
                            e.expired = false;
                        }
                    });
                    return exams;
                }),
                tap((exams) => {
                    this.exams = exams;
                    this.loader.loading = false;
                }),
                takeUntil(this.ngUnsubscribe),
            )
            .subscribe();
    }

    newExam = () => this.router.navigate(['/staff/exams']);

    search = (event: KeyboardEvent) => {
        const e = event.target as HTMLInputElement;
        return this.subject.next(e.value);
    };

    createExam = (executionType: Implementation) => this.Exam.createExam(executionType);

    copyExam = (exam: Exam) =>
        from(this.modal.open(ExaminationTypeSelectorComponent, { backdrop: 'static' }).result)
            .pipe(
                switchMap((data: { type: string; examinationType: string }) =>
                    this.http.post<Exam>(`/app/exams/${exam.id}`, data),
                ),
            )
            .subscribe({
                next: (resp) => {
                    this.toast.success(this.translate.instant('sitnet_exam_copied'));
                    this.router.navigate(['/staff/exams', resp.id, '1']);
                },
                error: this.toast.error,
            });

    deleteExam = (exam: ExamListExam) =>
        this.Confirmation.open$(
            this.translate.instant('sitnet_confirm'),
            this.translate.instant('sitnet_remove_exam'),
        ).subscribe({
            next: () => {
                this.http.delete(`/app/exams/${exam.id}`).subscribe({
                    next: () => {
                        this.toast.success(this.translate.instant('sitnet_exam_removed'));
                        this.exams.splice(this.exams.indexOf(exam), 1);
                    },
                    error: (err) => this.toast.error(err),
                });
            },
            error: this.toast.error,
        });

    filterByStateAndExpiration = (state: string, expired: boolean) =>
        this.exams.filter((e) => e.state === state && e.expired == expired);

    filterByState = (state: string) => this.exams.filter((e) => e.state === state);

    getExecutionTypeTranslation = (exam: ExamListExam) => this.Exam.getExecutionTypeTranslation(exam.executionType);

    setPredicate = (predicate: string) => {
        if (this.examsPredicate === predicate) {
            this.reverse = !this.reverse;
        }
        this.examsPredicate = predicate;
    };
}
