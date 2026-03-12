// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { combineLatest, EMPTY } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import type { ReviewedExam, Scores } from 'src/app/enrolment/enrolment.model';
import { Exam } from 'src/app/exam/exam.model';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { ModalService } from 'src/app/shared/dialogs/modal.service';
import { FileService } from 'src/app/shared/file/file.service';
import { ExamAnswersDialogComponent } from './exam-answers-dialog.component';

@Component({
    selector: 'xm-exam-feedback',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './exam-feedback.component.html',
    imports: [DatePipe, TranslateModule],
    styles: [
        `
            .notice-wrap {
                margin-left: 1em;
                display: inline-block;
                margin-bottom: 30px;
                margin-top: 10px;
            }
        `,
    ],
})
export class ExamFeedbackComponent {
    readonly assessment = input.required<ReviewedExam>();
    readonly participationTime = input('');
    readonly participationDuration = input<number | string>(0);
    readonly scores = input.required<Scores>();
    readonly collaborative = input(false);

    // Load answers reactively when assessment or collaborative changes
    readonly assessmentWithAnswers = toSignal(
        combineLatest([toObservable(this.assessment), toObservable(this.collaborative)]).pipe(
            switchMap(([assessment, collaborative]) => {
                if (collaborative) {
                    return EMPTY;
                }
                return this.http.get<Exam | undefined>(`/app/feedback/exams/${assessment.id}/answers`);
            }),
        ),
        { initialValue: undefined },
    );

    private readonly http = inject(HttpClient);
    private readonly modal = inject(ModalService);
    private readonly Attachment = inject(AttachmentService);
    private readonly Files = inject(FileService);

    downloadFeedbackAttachment() {
        const assessment = this.assessment();
        const attachment = assessment.examFeedback?.attachment;
        if (this.collaborative() && attachment && attachment.externalId) {
            this.Attachment.downloadCollaborativeAttachment(attachment.externalId, attachment.fileName);
        } else {
            this.Attachment.downloadFeedbackAttachment(assessment);
        }
    }

    downloadStatementAttachment() {
        this.Attachment.downloadStatementAttachment(this.assessment());
    }

    showAnswers() {
        const modal = this.modal.openRef(ExamAnswersDialogComponent, { size: 'xl' });
        modal.componentInstance.exam.set(this.assessmentWithAnswers());
        modal.componentInstance.participationTime.set(this.participationTime());
        modal.componentInstance.participationDuration.set(this.participationDuration());
    }

    downloadScoreReport() {
        const assessment = this.assessment();
        const url = `/app/feedback/exams/${assessment.id}/report`;
        this.Files.download(url, `${assessment.name}_${DateTime.now().toFormat('dd-LL-yyyy')}.xlsx`);
    }
}
