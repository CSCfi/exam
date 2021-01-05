/*
 * Copyright (c) 2017 Exam Consortium
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
import { Component, OnInit } from '@angular/core';

import { ExamExecutionType, Implementation } from '../../exam.model';
import { ExamService } from '../../exam.service';

@Component({
    selector: 'new-exam',
    template: require('./newExam.component.html'),
})
export class NewExamComponent implements OnInit {
    executionTypes: ExamExecutionType[];
    type: ExamExecutionType; // the one selected (on UI)
    examinationType: Implementation;
    byodExaminationSupported: boolean;

    constructor(private http: HttpClient, private Exam: ExamService) {}

    ngOnInit() {
        this.Exam.listExecutionTypes().subscribe(types => {
            this.executionTypes = types;
            this.examinationType = 'AQUARIUM';
            this.http
                .get<{ isByodExaminationSupported: boolean }>('/app/settings/byod')
                .subscribe(resp => (this.byodExaminationSupported = resp.isByodExaminationSupported));
        });
    }

    selectType = () => {
        if (!this.byodExaminationSupported) {
            this.Exam.createExam(this.type.type, this.examinationType);
        }
    };

    createExam = () => {
        if (this.type) {
            this.Exam.createExam(this.type.type, this.examinationType);
        }
    };
}
