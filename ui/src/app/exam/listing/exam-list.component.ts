// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, UpperCasePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgbNav, NgbNavItem, NgbNavItemRole, NgbNavLink, NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { ExaminationTypeSelectorComponent } from 'src/app/exam/editor/common/examination-type-picker.component';
import type { Exam, Implementation } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { ModalService } from 'src/app/shared/dialogs/modal.service';
import { CourseCodeComponent } from 'src/app/shared/miscellaneous/course-code.component';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { TableSortComponent } from 'src/app/shared/sorting/table-sort.component';
import { TeacherListComponent } from 'src/app/shared/user/teacher-list.component';

type ExamListExam = Exam & { expired: boolean; ownerAggregate: string };

@Component({
    selector: 'xm-exam-list',
    templateUrl: './exam-list.component.html',
    imports: [
        NgbNav,
        NgbNavItem,
        NgbNavItemRole,
        NgbNavLink,
        NgbPopover,
        TableSortComponent,
        CourseCodeComponent,
        RouterLink,
        TeacherListComponent,
        UpperCasePipe,
        DatePipe,
        TranslateModule,
        OrderByPipe,
        PageHeaderComponent,
        PageContentComponent,
    ],
})
export class ExamListingComponent implements OnInit, OnDestroy {
    activeId = 0;
    views = [
        { view: 'PUBLISHED', showExpired: false },
        { view: 'PUBLISHED', showExpired: true },
        { view: 'SAVED', showExpired: false },
        { view: 'DRAFT', showExpired: false },
    ];
    examsPredicate = 'periodEnd';
    reverse = true;
    loader = { loading: false };
    exams: ExamListExam[] = [];
    subject = new Subject<string>();
    ngUnsubscribe = new Subject();

    private translate = inject(TranslateService);
    private router = inject(Router);
    private http = inject(HttpClient);
    private toast = inject(ToastrService);
    private Confirmation = inject(ConfirmationDialogService);
    private Exam = inject(ExamService);
    private Modal = inject(ModalService);

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
                            e.expired = e.periodEnd != null && new Date() > new Date(e.periodEnd);
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
        this.Modal.open$<{ type: string; examinationType: string }>(ExaminationTypeSelectorComponent)
            .pipe(switchMap((data) => this.http.post<Exam>(`/app/exams/${exam.id}`, data)))
            .subscribe({
                next: (resp) => {
                    this.toast.success(this.translate.instant('i18n_exam_copied'));
                    this.router.navigate(['/staff/exams', resp.id, '1']);
                },
                error: (err) => this.toast.error(err),
            });

    deleteExam = (exam: ExamListExam) =>
        this.Confirmation.open$(
            this.translate.instant('i18n_confirm'),
            this.translate.instant('i18n_remove_exam'),
        ).subscribe({
            next: () => {
                this.http.delete(`/app/exams/${exam.id}`).subscribe({
                    next: () => {
                        this.toast.success(this.translate.instant('i18n_exam_removed'));
                        this.exams.splice(this.exams.indexOf(exam), 1);
                    },
                    error: (err) => this.toast.error(err),
                });
            },
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
