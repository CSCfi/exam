// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import type { OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import type { ExamExecutionType, Implementation } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { SessionService } from 'src/app/session/session.service';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';

@Component({
    selector: 'xm-new-exam',
    templateUrl: './new-exam.component.html',
    imports: [FormsModule, NgbPopover, TranslateModule, PageHeaderComponent, PageContentComponent],
})
export class NewExamComponent implements OnInit {
    executionTypes: (ExamExecutionType & { name: string })[] = [];
    type?: ExamExecutionType;
    examinationType: Implementation = 'AQUARIUM';
    homeExaminationSupported = false;
    sebExaminationSupported = false;
    canCreateByodExams = false;

    constructor(
        private http: HttpClient,
        private Exam: ExamService,
        private Session: SessionService,
    ) {}

    ngOnInit() {
        this.canCreateByodExams = this.Session.getUser().canCreateByodExam;
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
