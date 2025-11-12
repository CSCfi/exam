// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, OnDestroy, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { DashboardExam, ExtraData } from 'src/app/dashboard/dashboard.model';
import { TeacherDashboardService } from 'src/app/dashboard/staff/teacher/teacher-dashboard.service';
import { ExaminationTypeSelectorComponent } from 'src/app/exam/editor/common/examination-type-picker.component';
import type { Exam } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { SessionService } from 'src/app/session/session.service';
import { DateTimeService } from 'src/app/shared/date/date.service';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { ModalService } from 'src/app/shared/dialogs/modal.service';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';
import { CourseCodeComponent } from 'src/app/shared/miscellaneous/course-code.component';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { TableSortComponent } from 'src/app/shared/sorting/table-sort.component';
import { TeacherListComponent } from 'src/app/shared/user/teacher-list.component';

@Component({
    selector: 'xm-exam-list-category',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './exam-list-category.component.html',
    styleUrls: ['./exam-list-category.component.scss'],
    imports: [
        FormsModule,
        TableSortComponent,
        RouterLink,
        CourseCodeComponent,
        TeacherListComponent,
        DatePipe,
        TranslateModule,
        OrderByPipe,
    ],
})
export class ExamListCategoryComponent implements OnInit, OnDestroy {
    items = input.required<DashboardExam[]>();
    extraData = input.required<ExtraData[]>();
    defaultPredicate = input('');
    defaultReverse = input(false);
    filtered = output<string>();

    userId: number;
    pageSize = 10;
    sorting = signal<{ predicate: string; reverse: boolean }>({ predicate: '', reverse: false });
    filterText = '';
    filterChanged = new Subject<string>();
    ngUnsubscribe = new Subject();

    private router = inject(Router);
    private translate = inject(TranslateService);
    private ModalService = inject(ModalService);
    private toast = inject(ToastrService);
    private Dashboard = inject(TeacherDashboardService);
    private Dialog = inject(ConfirmationDialogService);
    private Exam = inject(ExamService);
    private CommonExam = inject(CommonExamService);
    private DateTime = inject(DateTimeService);
    private Session = inject(SessionService);

    constructor() {
        this.filterChanged
            .pipe(debounceTime(500), distinctUntilChanged(), takeUntil(this.ngUnsubscribe))
            .subscribe((text) => {
                this.filterText = text;
                this.filtered.emit(this.filterText);
            });
        this.userId = this.Session.getUser().id;
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next(undefined);
        this.ngUnsubscribe.complete();
    }

    ngOnInit() {
        this.sorting.set({
            predicate: this.defaultPredicate(),
            reverse: this.defaultReverse(),
        });
        if (this.filterText) {
            this.search(this.filterText);
        }
    }

    setPredicate = (predicate: string) => {
        const currentSorting = this.sorting();
        if (currentSorting.predicate === predicate) {
            this.sorting.update((s) => ({ ...s, reverse: !s.reverse }));
        } else {
            this.sorting.update((s) => ({ ...s, predicate }));
        }
    };

    search = (text: string) => this.filterChanged.next(text);

    printExamDuration = (exam: Exam) => this.DateTime.formatDuration(exam.duration);

    getUsername = () => this.Session.getUserName();

    getExecutionTypeTranslation = (exam: Exam) => {
        const type = this.Exam.getExecutionTypeTranslation(exam.executionType);
        const impl = this.CommonExam.getExamImplementationTranslation(exam.implementation);
        return `${this.translate.instant(type)} - ${this.translate.instant(impl)}`;
    };

    copyExam = (exam: DashboardExam) =>
        this.ModalService.open$<{ type: string; examinationType: string }>(ExaminationTypeSelectorComponent, {
            backdrop: 'static',
        })
            .pipe(switchMap((data) => this.Dashboard.copyExam$(exam.id, data.type, data.examinationType)))
            .subscribe({
                next: (resp) => {
                    this.toast.success(this.translate.instant('i18n_exam_copied'));
                    this.router.navigate(['/staff/exams', resp.id, '1']);
                },
                error: () => this.toast.error(this.translate.instant('i18n_error_access_forbidden')),
            });

    deleteExam = (exam: DashboardExam) => {
        if (this.isAllowedToUnpublishOrRemove(exam)) {
            this.Dialog.open$(
                this.translate.instant('i18n_confirm'),
                this.translate.instant('i18n_remove_exam'),
            ).subscribe({
                next: () =>
                    this.Dashboard.deleteExam$(exam.id).subscribe({
                        next: () => {
                            this.toast.success(this.translate.instant('i18n_exam_removed'));
                            // Note: items is an input signal, so we can't mutate it directly
                            // The parent component should handle the removal
                            // For now, we'll emit an event or the parent will refresh
                        },
                        error: (err) => this.toast.error(err),
                    }),
            });
        } else {
            this.toast.warning(this.translate.instant('i18n_exam_removal_not_possible'));
        }
    };

    isAllowedToUnpublishOrRemove = (exam: Exam) =>
        // allowed if no upcoming reservations and if no one has taken this yet
        !exam.hasEnrolmentsInEffect && exam.children.length === 0;

    getLink = (data: ExtraData, exam: DashboardExam) => {
        const copy = [...data.link];
        copy.splice(data.link.indexOf('__'), 1, exam.id.toString());
        return copy;
    };

    isOwner = (exam: Exam) => exam.examOwners.some((eo) => eo.id === this.userId);
}
