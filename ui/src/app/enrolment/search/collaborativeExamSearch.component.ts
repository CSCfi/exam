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
import { Component, OnDestroy } from '@angular/core';
import { isObject } from 'lodash';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize, takeUntil, tap } from 'rxjs/operators';
import type { CollaborativeExam } from '../../exam/exam.model';
import type { CollaborativeExamInfo } from '../enrolment.model';
import { EnrolmentService } from '../enrolment.service';

@Component({
    selector: 'collaborative-exam-search',
    templateUrl: './collaborativeExamSearch.component.html',
})
export class CollaborativeExamSearchComponent implements OnInit, OnDestroy {
    exams: CollaborativeExamInfo[] = [];
    filter = { text: '' };
    loader = { loading: false };
    filterChanged: Subject<string> = new Subject<string>();
    ngUnsubscribe = new Subject();

    constructor(private Enrolment: EnrolmentService) {
        this.filterChanged
            .pipe(debounceTime(500), distinctUntilChanged(), takeUntil(this.ngUnsubscribe))
            .subscribe(this.doSearch);
    }

    ngOnInit() {
        this.filter = { text: '' };
        this.loader = { loading: false };
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next(undefined);
        this.ngUnsubscribe.complete();
    }

    search = (text: string) => this.filterChanged.next(text);

    private doSearch = (text: string) => {
        if (text.length <= 2) {
            return;
        }
        this.filter.text = text;
        this.loader = { loading: true };

        this.Enrolment.searchExams$(text)
            .pipe(
                tap((exams) => this.updateExamList(exams)),
                finalize(() => (this.loader = { loading: false })),
            )
            .subscribe();
    };

    updateExamList(exams: CollaborativeExam[]) {
        this.exams = exams.map((e) =>
            Object.assign(e, {
                reservationMade: false,
                alreadyEnrolled: false,
                noTrialsLeft: false,
                languages: e.examLanguages.map((l) => l.name),
                implementation: 'AQUARIUM',
                course: { name: '', code: '', id: 0, credits: 0 },
                examInspections: [],
                parent: null,
            }),
        );
        this.exams.forEach((e) => {
            this.Enrolment.getEnrolments(e.id, true).subscribe((enrolments) => {
                e.reservationMade = enrolments.some((e) => isObject(e.reservation));
                e.alreadyEnrolled = enrolments.length > 0;
            });
        });
    }
}
