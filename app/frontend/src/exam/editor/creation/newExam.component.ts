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
import { Component, OnInit } from '@angular/core';

import { ExamExecutionType } from '../../exam.model';
import { ExamService } from '../../exam.service';

@Component({
    selector: 'new-exam',
    template: require('./newExam.component.html'),
})
export class NewExamComponent implements OnInit {
    executionTypes: ExamExecutionType[];
    type: ExamExecutionType; // the one selected (on UI)

    constructor(private Exam: ExamService) {}

    ngOnInit() {
        this.Exam.listExecutionTypes().subscribe(types => (this.executionTypes = types));
    }

    createExam = () => {
        if (this.type) {
            this.Exam.createExam(this.type.type);
        }
    };
}
