// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, OnInit, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
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
        TableSortComponent,
        RouterLink,
        CourseCodeComponent,
        TeacherListComponent,
        DatePipe,
        TranslateModule,
        OrderByPipe,
    ],
})
export class ExamListCategoryComponent implements OnInit {
    readonly items = input.required<DashboardExam[]>();
    readonly extraData = input.required<ExtraData[]>();
    readonly defaultPredicate = input('');
    readonly defaultReverse = input(false);
    readonly filtered = output<string>();
    readonly sorting = signal<{ predicate: string; reverse: boolean }>({ predicate: '', reverse: false });
    filterText = '';

    private readonly filterChanged = new Subject<string>();
    private readonly userId: number;

    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    private readonly translate = inject(TranslateService);
    private readonly ModalService = inject(ModalService);
    private readonly toast = inject(ToastrService);
    private readonly Dashboard = inject(TeacherDashboardService);
    private readonly Dialog = inject(ConfirmationDialogService);
    private readonly Exam = inject(ExamService);
    private readonly CommonExam = inject(CommonExamService);
    private readonly DateTime = inject(DateTimeService);
    private readonly Session = inject(SessionService);

    constructor() {
        this.filterChanged
            .pipe(debounceTime(500), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
            .subscribe((text) => {
                this.filterText = text;
                this.filtered.emit(this.filterText);
            });
        this.userId = this.Session.getUser().id;
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

    onFilterInput = (event: Event) => {
        const value = (event.target as HTMLInputElement).value;
        this.filterText = value;
        this.search(value);
    };

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
            .pipe(
                switchMap((data) => this.Dashboard.copyExam$(exam.id, data.type, data.examinationType)),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe({
                next: (resp) => {
                    this.toast.success(this.translate.instant('i18n_exam_copied'));
                    this.router.navigate(['/staff/exams', resp.id, '1']);
                },
                error: () => this.toast.error(this.translate.instant('i18n_error_access_forbidden')),
            });

    deleteExam = (exam: DashboardExam) => {
        if (this.isAllowedToUnpublishOrRemove(exam)) {
            this.Dialog.open$(this.translate.instant('i18n_confirm'), this.translate.instant('i18n_remove_exam'))
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: () =>
                        this.Dashboard.deleteExam$(exam.id)
                            .pipe(takeUntilDestroyed(this.destroyRef))
                            .subscribe({
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
