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
import { Component, OnInit } from '@angular/core';
import * as _ from 'lodash';

import { CollaborativeExamService } from '../../exam/collaborative/collaborativeExam.service';
import { CollaborativeExam } from '../../exam/exam.model';
import { LanguageService } from '../../utility/language/language.service';
import { EnrolmentService } from '../enrolment.service';
import { tap, finalize, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';

interface CollaborativeExamInfo extends CollaborativeExam {
    languages: string[];
    reservationMade: boolean;
    enrolled: boolean;
}

@Component({
    selector: 'collaborative-exam-search',
    template: require('./collaborativeExamSearch.component.html'),
})
export class CollaborativeExamSearchComponent implements OnInit {
    exams: CollaborativeExamInfo[];
    filter: { text: string };
    loader: { loading: boolean };
    filterChanged: Subject<string> = new Subject<string>();

    constructor(
        private Enrolment: EnrolmentService,
        private Language: LanguageService,
        private CollaborativeExam: CollaborativeExamService,
    ) {
        this.filterChanged.pipe(debounceTime(500), distinctUntilChanged()).subscribe(this.doSearch);
    }

    ngOnInit() {
        this.filter = { text: '' };
        this.loader = { loading: false };
    }

    search = (text: string) => this.filterChanged.next(text);

    private doSearch = (text: string) => {
        if (text.length <= 2) {
            return;
        }
        this.filter.text = text;
        this.loader = { loading: true };

        this.CollaborativeExam.searchExams(text)
            .pipe(
                tap(exams => this.updateExamList(exams)),
                finalize(() => (this.loader = { loading: false })),
            )
            .subscribe();
    };

    updateExamList(exams: CollaborativeExam[]) {
        this.exams = exams.map(e =>
            _.assign(e, {
                reservationMade: false,
                enrolled: false,
                languages: e.examLanguages.map(l => this.Language.getLanguageNativeName(l.code)),
            }),
        );
        this.exams.forEach(e => {
            this.Enrolment.getEnrolments(e.id, true).subscribe(enrolments => {
                e.reservationMade = enrolments.some(e => _.isObject(e.reservation));
                e.enrolled = enrolments.length > 0;
            });
        });
    }
}
