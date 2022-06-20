/*
 * Copyright (c) 2018 Exam Consortium
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
import type { OnInit } from '@angular/core';
import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { from, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { ExaminationTypeSelectorComponent } from '../../../../exam/editor/common/examination-type-picker.component';
import type { Exam, ExamExecutionType } from '../../../../exam/exam.model';
import { ExamService } from '../../../../exam/exam.service';
import { SessionService } from '../../../../session/session.service';
import { DateTimeService } from '../../../../shared/date/date.service';
import { ConfirmationDialogService } from '../../../../shared/dialogs/confirmation-dialog.service';
import { CommonExamService } from '../../../../shared/miscellaneous/common-exam.service';
import { DashboardExam, TeacherDashboardService } from '../teacher-dashboard.service';
export interface ExtraData {
    text: string;
    property: keyof DashboardExam;
    link: string[];
    checkOwnership: boolean;
}
type ExecutionType = ExamExecutionType & { examinationTypes: { type: string; name: string }[] };
@Component({
    selector: 'xm-exam-list-category',
    templateUrl: './exam-list-category.component.html',
})
export class ExamListCategoryComponent implements OnInit, OnDestroy {
    @Input() items: DashboardExam[] = [];
    @Input() examTypes: ExecutionType[] = [];
    @Input() extraData: ExtraData[] = [];
    @Input() defaultPredicate = '';
    @Input() defaultReverse = false;
    @Output() filtered = new EventEmitter<string>();

    userId: number;
    pageSize = 10;
    sorting = { predicate: '', reverse: false };
    filterText = '';
    filterChanged = new Subject<string>();
    ngUnsubscribe = new Subject();

    constructor(
        private router: Router,
        private translate: TranslateService,
        private modal: NgbModal,
        private toast: ToastrService,
        private Dashboard: TeacherDashboardService,
        private Dialog: ConfirmationDialogService,
        private Exam: ExamService,
        private CommonExam: CommonExamService,
        private DateTime: DateTimeService,
        private Session: SessionService,
    ) {
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
        this.sorting = {
            predicate: this.defaultPredicate,
            reverse: this.defaultReverse,
        };
        if (this.filterText) {
            this.search(this.filterText);
        }
    }

    setPredicate = (predicate: string) => {
        if (this.sorting.predicate === predicate) {
            this.sorting.reverse = !this.sorting.reverse;
        }
        this.sorting.predicate = predicate;
    };

    search = (text: string) => this.filterChanged.next(text);

    printExamDuration = (exam: Exam) => this.DateTime.printExamDuration(exam);

    getUsername = () => this.Session.getUserName();

    getExecutionTypeTranslation = (exam: Exam) => {
        const type = this.Exam.getExecutionTypeTranslation(exam.executionType);
        const impl = this.CommonExam.getExamImplementationTranslation(exam.implementation);
        return `${this.translate.instant(type)} - ${this.translate.instant(impl)}`;
    };

    copyExam = (exam: DashboardExam) =>
        from(this.modal.open(ExaminationTypeSelectorComponent, { backdrop: 'static' }).result)
            .pipe(
                switchMap((data: { type: string; examinationType: string }) =>
                    this.Dashboard.copyExam$(exam.id, data.type, data.examinationType),
                ),
            )
            .subscribe({
                next: (resp) => {
                    this.toast.success(this.translate.instant('sitnet_exam_copied'));
                    this.router.navigate(['/staff/exams', resp.id, '1']);
                },
                error: this.toast.error,
            });

    deleteExam = (exam: DashboardExam) => {
        this.Dialog.open$(
            this.translate.instant('sitnet_confirm'),
            this.translate.instant('sitnet_remove_exam'),
        ).subscribe({
            next: () =>
                this.Dashboard.deleteExam$(exam.id).subscribe({
                    next: () => {
                        this.toast.success(this.translate.instant('sitnet_exam_removed'));
                        this.items.splice(this.items.indexOf(exam), 1);
                    },
                    error: this.toast.error,
                }),
            error: this.toast.error,
        });
    };

    getLink = (data: ExtraData, exam: DashboardExam) => {
        const copy = [...data.link];
        copy.splice(data.link.indexOf('__'), 1, exam.id.toString());
        return copy;
    };

    isOwner = (exam: Exam) => exam.examOwners.some((eo) => eo.id === this.userId);
}
