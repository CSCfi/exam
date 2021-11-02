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
import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { StateService } from '@uirouter/core';
import { from, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import * as toast from 'toastr';

import { ExaminationTypeSelectorComponent } from '../../../../exam/editor/common/examinationTypeSelector.component';
import { ExamService } from '../../../../exam/exam.service';
import { SessionService } from '../../../../session/session.service';
import { DateTimeService } from '../../../../utility/date/date.service';
import { ConfirmationDialogService } from '../../../../utility/dialogs/confirmationDialog.service';
import { CommonExamService } from '../../../../utility/miscellaneous/commonExam.service';

import type { OnInit } from '@angular/core';
import type { Exam, ExamExecutionType } from '../../../../exam/exam.model';
export interface ExtraColumnName {
    text: string;
    property: string;
}
export interface ExtraColumnValue {
    link: string;
    checkOwnership: boolean;
    value: unknown;
}
type ExecutionType = ExamExecutionType & { examinationTypes: { type: string; name: string }[] };
@Component({
    selector: 'exam-list-category',
    templateUrl: './examListCategory.component.html',
})
export class ExamListCategoryComponent implements OnInit {
    @Input() items: Exam[];
    @Input() examTypes: ExecutionType[];
    @Input() extraColumnNames: () => ExtraColumnName[] = () => [];
    @Input() extraColumnValues: (exam: Exam) => ExtraColumnValue[] = () => [];
    @Input() defaultPredicate: string;
    @Input() defaultReverse: boolean;
    @Output() onFilterChange = new EventEmitter<string>();

    userId: number;
    pageSize = 10;
    sorting: {
        predicate: string;
        reverse: boolean;
    };
    filterText: string;
    filterChanged = new Subject<string>();
    ngUnsubscribe = new Subject();

    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private state: StateService,
        private modal: NgbModal,
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
                this.state.go('staff.teacher', { tab: this.state.params.tab, filter: this.filterText });
                this.onFilterChange.emit(this.filterText);
            });
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    ngOnInit() {
        this.userId = this.Session.getUser().id;
        this.sorting = {
            predicate: this.defaultPredicate,
            reverse: this.defaultReverse,
        };
        this.filterText = this.state.params.filter;
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

    copyExam = (exam: Exam) =>
        from(this.modal.open(ExaminationTypeSelectorComponent, { backdrop: 'static' }).result)
            .pipe(
                switchMap((data: { type: string; examinationType: string }) =>
                    this.http.post<Exam>(`/app/exams/${exam.id}`, data),
                ),
            )
            .subscribe(
                (resp) => {
                    toast.success(this.translate.instant('sitnet_exam_copied'));
                    this.state.go('staff.examEditor.basic', { id: resp.id, collaborative: 'false' });
                },
                (err) => toast.error(err.data),
            );

    deleteExam = (exam: Exam) => {
        const dialog = this.Dialog.open(
            this.translate.instant('sitnet_confirm'),
            this.translate.instant('sitnet_remove_exam'),
        );
        dialog.result.then(() => {
            this.http.delete(`/app/exams/${exam.id}`).subscribe(
                () => {
                    toast.success(this.translate.instant('sitnet_exam_removed'));
                    this.items.splice(this.items.indexOf(exam), 1);
                },
                (err) => toast.error(err),
            );
        });
    };

    isOwner = (exam: Exam) => exam.examOwners.some((eo) => eo.id === this.userId);
}
