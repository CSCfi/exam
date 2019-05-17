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

import * as toast from 'toastr';
import { SessionService } from '../../../session/session.service';
import { DateTimeService } from '../../../utility/date/date.service';
import { Component, Input, Output, EventEmitter, OnInit, Inject } from '@angular/core';
import { Exam, ExamExecutionType } from '../../../exam/exam.model';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { Location } from '@angular/common';
import { ConfirmationDialogService } from '../../../utility/dialogs/confirmationDialog.service';
import { ExamService } from '../../../exam/exam.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

export interface ExtraColumn {
    text: string;
    property: string;
    link: string;
    checkOwnership: boolean;
}

@Component({
    selector: 'exam-list-category',
    template: require('./examListCategory.component.html')
})
export class ExamListCategoryComponent implements OnInit {

    @Input() items: Exam[];
    @Input() examTypes: ExamExecutionType[];
    @Input() extraColumns: ExtraColumn[];
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
    filterChanged: Subject<string> = new Subject<string>();

    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private location: Location,
        @Inject('$location') private $location: any,
        private dialog: ConfirmationDialogService,
        private Exam: ExamService,
        private DateTime: DateTimeService,
        private Session: SessionService,
    ) {
        this.filterChanged.pipe(
            debounceTime(500),
            distinctUntilChanged()
        ).subscribe(text => {
            this.filterText = text;
            this.$location.search('filter', this.filterText);
            this.onFilterChange.emit(this.filterText);
        });
    }

    ngOnInit() {
        this.userId = this.Session.getUser().id;
        this.sorting = {
            predicate: this.defaultPredicate,
            reverse: this.defaultReverse
        };
        this.filterText = this.$location.search().filter;
        if (this.filterText) {
            this.search(this.filterText);
        }
    }

    setPredicate = (predicate: string) => {
        if (this.sorting.predicate === predicate) {
            this.sorting.reverse = !this.sorting.reverse;
        }
        this.sorting.predicate = predicate;
    }

    search = (text: string) => this.filterChanged.next(text);

    printExamDuration = (exam: Exam) => this.DateTime.printExamDuration(exam);

    getUsername = () => this.Session.getUserName();

    getExecutionTypeTranslation = (exam: Exam) => this.Exam.getExecutionTypeTranslation(exam.executionType);

    copyExam = (exam: Exam, type: string) => {
        this.http.post<{ id: number }>(`/app/exams/${exam.id}`, { type: type }).subscribe(
            resp => {
                toast.success(this.translate.instant('sitnet_exam_copied'));
                this.location.go(`/exams/${resp.id}/1`);
            },
            resp => toast.error(resp.data));
    }

    deleteExam = (exam: Exam) => {
        const dialog = this.dialog.open(this.translate.instant('sitnet_confirm'),
            this.translate.instant('sitnet_remove_exam'));
        dialog.result.then(() => {
            this.http.delete(`/app/exams/${exam.id}`).subscribe(
                () => {
                    toast.success(this.translate.instant('sitnet_exam_removed'));
                    this.items.splice(this.items.indexOf(exam), 1);
                },
                resp => toast.error(resp.data));
        });
    }

    isOwner = (exam: Exam) => exam.examOwners.some(eo => eo.id === this.userId);

}
