// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewExamComponent {
    executionTypes = signal<(ExamExecutionType & { name: string })[]>([]);
    type = signal<ExamExecutionType | undefined>(undefined);
    examinationType = signal<Implementation>('AQUARIUM');
    homeExaminationSupported = signal(false);
    sebExaminationSupported = signal(false);
    canCreateByodExams = signal(false);

    private http = inject(HttpClient);
    private Exam = inject(ExamService);
    private Session = inject(SessionService);

    constructor() {
        this.canCreateByodExams.set(this.Session.getUser().canCreateByodExam);
        this.Exam.listExecutionTypes$().subscribe((types) => {
            this.executionTypes.set(types);
            this.http
                .get<{ homeExaminationSupported: boolean; sebExaminationSupported: boolean }>('/app/settings/byod')
                .subscribe((resp) => {
                    this.homeExaminationSupported.set(resp.homeExaminationSupported);
                    this.sebExaminationSupported.set(resp.sebExaminationSupported);
                });
        });
    }

    selectType() {
        if (!this.homeExaminationSupported() && !this.sebExaminationSupported()) {
            const currentType = this.type();
            if (currentType) {
                this.Exam.createExam(currentType.type, this.examinationType());
            }
        }
    }

    createExam() {
        const currentType = this.type();
        if (currentType) {
            this.Exam.createExam(currentType.type, this.examinationType());
        }
    }
}
