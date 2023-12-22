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
import { NgFor, NgIf } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import type { OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { HistoryBackComponent } from '../../../shared/history/history-back.component';
import type { ExamExecutionType, Implementation } from '../../exam.model';
import { ExamService } from '../../exam.service';

@Component({
    selector: 'xm-new-exam',
    templateUrl: './new-exam.component.html',
    standalone: true,
    imports: [HistoryBackComponent, FormsModule, NgbPopover, NgFor, NgIf, TranslateModule],
})
export class NewExamComponent implements OnInit {
    executionTypes: (ExamExecutionType & { name: string })[] = [];
    type?: ExamExecutionType;
    examinationType: Implementation = 'AQUARIUM';
    homeExaminationSupported = false;
    sebExaminationSupported = false;

    constructor(private http: HttpClient, private Exam: ExamService) {}

    ngOnInit() {
        this.Exam.listExecutionTypes$().subscribe((types) => {
            this.executionTypes = types;
            this.http
                .get<{ homeExaminationSupported: boolean; sebExaminationSupported: boolean }>('/app/settings/byod')
                .subscribe((resp) => {
                    this.homeExaminationSupported = resp.homeExaminationSupported;
                    this.sebExaminationSupported = resp.sebExaminationSupported;
                });
        });
    }

    selectType = () => {
        if (!this.homeExaminationSupported && !this.sebExaminationSupported && this.type) {
            this.Exam.createExam(this.type.type, this.examinationType);
        }
    };

    createExam = () => {
        if (this.type) {
            this.Exam.createExam(this.type.type, this.examinationType);
        }
    };
}
