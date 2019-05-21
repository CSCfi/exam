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

import * as toastr from 'toastr';
import * as _ from 'lodash';
import { CollaborativeExamService } from '../../exam/collaborative/collaborativeExam.service';
import { CollaborativeExam } from '../../exam/exam.model';
import { EnrolmentService } from '../enrolment.service';
import { Component, OnInit } from '@angular/core';
import { LanguageService } from '../../utility/language/language.service';


interface CollaborativeExamInfo extends CollaborativeExam {
    languages: string[];
    reservationMade: boolean;
    enrolled: boolean;
}

@Component({
    selector: 'collaborative-exam-search',
    template: `
    <div id="dashboard">
        <div>
            <div class="student-details-title-wrap padtop padleft">
                <div class="student-exam-search-title">{{'sitnet_collaborative_exams' | translate}}</div>
            </div>
        </div>
        <div class="exams-list marr30 list-item" *ngFor="let exam of exams">
            <exam-search-result [exam]="exam" [collaborative]="true"></exam-search-result>
        </div>
    </div>
    `
})
export class CollaborativeExamSearchComponent implements OnInit {

    exams: CollaborativeExamInfo[];

    constructor(
        private Enrolment: EnrolmentService,
        private Language: LanguageService,
        private CollaborativeExam: CollaborativeExamService
    ) { }

    ngOnInit() {
        this.CollaborativeExam.listExams().subscribe((exams: CollaborativeExam[]) => {
            this.exams = exams.map(e =>
                _.assign(e, {
                    reservationMade: false,
                    enrolled: false,
                    languages: e.examLanguages.map(l => this.Language.getLanguageNativeName(l.code))
                }));
            this.exams.forEach(e => {
                this.Enrolment.getEnrolments(e.id, true).subscribe(
                    enrolments => {
                        e.reservationMade = enrolments.some(e => _.isObject(e.reservation));
                        e.enrolled = enrolments.length > 0;
                    },
                    err => toastr.error(err.data)
                );
            });
        });

    }
}
