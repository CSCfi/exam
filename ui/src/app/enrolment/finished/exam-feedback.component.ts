// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import type { ReviewedExam, Scores } from 'src/app/enrolment/enrolment.model';
import { Exam } from 'src/app/exam/exam.model';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { ModalService } from 'src/app/shared/dialogs/modal.service';
import { FileService } from 'src/app/shared/file/file.service';
import { ExamAnswersDialogComponent } from './exam-answers-dialog.component';

@Component({
    selector: 'xm-exam-feedback',
    templateUrl: './exam-feedback.component.html',
    styleUrl: './exam-feedback.component.scss',
    imports: [DatePipe, TranslateModule],
})
export class ExamFeedbackComponent {
    readonly assessment = input.required<ReviewedExam>();
    readonly participationTime = input('');
    readonly participationDuration = input<number | string>(0);
    readonly scores = input.required<Scores>();
    readonly collaborative = input(false);

    // Backend responds with an empty body (null) when answers are not released
    readonly assessmentWithAnswers = computed(() => (this.answers.hasValue() ? this.answers.value() : null));

    // Refetches when assessment or collaborative changes; an undefined request leaves the resource idle
    private readonly answers = httpResource<Exam | null>(() =>
        this.collaborative() ? undefined : `/app/feedback/exams/${this.assessment().id}/answers`,
    );

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
