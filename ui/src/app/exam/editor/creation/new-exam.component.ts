// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
    imports: [NgbPopover, TranslateModule, PageHeaderComponent, PageContentComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewExamComponent {
    readonly executionTypes = signal<(ExamExecutionType & { name: string })[]>([]);
    readonly type = signal<ExamExecutionType | undefined>(undefined);
    readonly examinationType = signal<Implementation>('AQUARIUM');
    readonly homeExaminationSupported = signal(false);
    readonly sebExaminationSupported = signal(false);
    readonly canCreateByodExams = signal(false);

    private readonly http = inject(HttpClient);
    private readonly Exam = inject(ExamService);
    private readonly Session = inject(SessionService);

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

    onTypeChange(event: Event) {
        const value = (event.target as HTMLSelectElement).value;
        this.type.set(this.executionTypes().find((t) => t.type === value));
        this.selectType();
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
