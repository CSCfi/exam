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
import type { OnInit } from '@angular/core';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { StateService } from '@uirouter/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import * as toast from 'toastr';

import type { Exam, ExamExecutionType } from '../../../exam/exam.model';
import { ExamService } from '../../../exam/exam.service';
import { SessionService } from '../../../session/session.service';
import { DateTimeService } from '../../../utility/date/date.service';
import { ConfirmationDialogService } from '../../../utility/dialogs/confirmationDialog.service';

export interface ExtraColumn {
    text: string;
    property: string;
    link: string;
    checkOwnership: boolean;
}
type ExecutionType = ExamExecutionType & { name: string } & { examinationTypes: { type: string; name: string }[] };
@Component({
    selector: 'exam-list-category',
    templateUrl: './examListCategory.component.html',
})
export class ExamListCategoryComponent implements OnInit {
    @Input() items: Exam[];
    @Input() examTypes: ExecutionType[];
    @Input() extraColumns: ExtraColumn[];
    @Input() defaultPredicate: string;
    @Input() defaultReverse: boolean;
    @Output() onFilterChange = new EventEmitter<string>();

    selectedType: ExecutionType;
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
        private dialog: ConfirmationDialogService,
        private Exam: ExamService,
        private DateTime: DateTimeService,
        private Session: SessionService,
    ) {
        this.filterChanged
            .pipe(debounceTime(500), distinctUntilChanged(), takeUntil(this.ngUnsubscribe))
            .subscribe((text) => {
                this.filterText = text;
                this.state.go('dashboard', { tab: this.state.params.tab, filter: this.filterText });
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
        const impl = this.Exam.getExamImplementationTranslation(exam.implementation);
        return `${this.translate.instant(type)} - ${this.translate.instant(impl)}`;
    };

    copyExam = (exam: Exam, type: string) => {
        this.http
            .post<{ id: number }>(`/app/exams/${exam.id}`, { type: type })
            .subscribe(
                (resp) => {
                    toast.success(this.translate.instant('sitnet_exam_copied'));
                    this.state.go('examEditor', { id: resp.id });
                },
                (resp) => toast.error(resp.data),
            );
    };

    deleteExam = (exam: Exam) => {
        const dialog = this.dialog.open(
            this.translate.instant('sitnet_confirm'),
            this.translate.instant('sitnet_remove_exam'),
        );
        dialog.result.then(() => {
            this.http.delete(`/app/exams/${exam.id}`).subscribe(
                () => {
                    toast.success(this.translate.instant('sitnet_exam_removed'));
                    this.items.splice(this.items.indexOf(exam), 1);
                },
                (resp) => toast.error(resp.data),
            );
        });
    };

    isOwner = (exam: Exam) => exam.examOwners.some((eo) => eo.id === this.userId);
}
