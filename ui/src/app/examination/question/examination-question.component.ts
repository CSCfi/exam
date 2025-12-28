// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass, SlicePipe, UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type { Examination, ExaminationQuestion } from 'src/app/examination/examination.model';
import { ExaminationService } from 'src/app/examination/examination.service';
import { EssayAnswer } from 'src/app/question/question.model';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { MathUnifiedDirective } from 'src/app/shared/math/math.directive';
import { DynamicClozeTestComponent } from './dynamic-cloze-test.component';
import { ExaminationClozeTestComponent } from './examination-cloze-test.component';
import { ExaminationEssayQuestionComponent } from './examination-essay-question.component';
import { ExaminationMultiChoiceComponent } from './examination-multi-choice-question.component';
import { ExaminationWeightedMultiChoiceComponent } from './examination-weighted-multi-choice-question.component';

@Component({
    selector: 'xm-examination-question',
    templateUrl: './examination-question.component.html',
    imports: [
        NgClass,
        MathUnifiedDirective,
        DynamicClozeTestComponent,
        ExaminationEssayQuestionComponent,
        ExaminationClozeTestComponent,
        ExaminationMultiChoiceComponent,
        ExaminationWeightedMultiChoiceComponent,
        UpperCasePipe,
        SlicePipe,
        TranslateModule,
    ],
    styleUrls: ['../examination.shared.scss', './question.shared.scss', './examination-question.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExaminationQuestionComponent {
    exam = input<Examination | undefined>(undefined);
    question = input.required<ExaminationQuestion>();
    isPreview = input(false);
    isCollaborative = input(false);

    clozeAnswer = signal<{ [key: string]: string }>({});
    expanded = signal(true);

    sq = computed(() => {
        const q = this.question() as Omit<ExaminationQuestion, 'essayAnswer'> & { essayAnswer: EssayAnswer }; // FIXME
        return { ...q, expanded: true };
    });

    questionTitle = computed(() => {
        // Extract plain text from HTML for aria-label (screen readers need plain text, not HTML)
        const html = this.sq().question.question;
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        return doc.documentElement.innerText;
    });

    private Examination = inject(ExaminationService);
    private Attachment = inject(AttachmentService);
    private translate = inject(TranslateService);

    constructor() {
        // Initialize clozeAnswer when question changes
        effect(() => {
            const currentSq = this.sq();
            if (currentSq.question.type === 'ClozeTestQuestion' && currentSq.clozeTestAnswer?.answer) {
                const { answer } = currentSq.clozeTestAnswer;
                this.clozeAnswer.set(JSON.parse(answer));
            }
        });
    }

    parseAriaLabel(expanded: string): string {
        return `${this.translate.instant(expanded)} ${this.translate.instant('i18n_question')} ${this.questionTitle()}`;
    }

    toggleExpanded() {
        this.expanded.update((v) => !v);
    }

    answered(answer: { id: string; value: string }) {
        const { id, value } = answer;
        const currentSq = this.sq();
        if (currentSq.clozeTestAnswer) {
            this.clozeAnswer.update((current) => ({
                ...current,
                [id]: value,
            }));
            currentSq.clozeTestAnswer.answer = JSON.stringify(this.clozeAnswer());
        }
    }

    downloadQuestionAttachment() {
        const currentExam = this.exam();
        const currentSq = this.sq();
        if (currentExam) {
            if (currentExam.external) {
                this.Attachment.downloadExternalQuestionAttachment(currentExam, currentSq);
            } else if (this.isCollaborative()) {
                this.Attachment.downloadCollaborativeQuestionAttachment(currentExam.id, currentSq);
            } else {
                this.Attachment.downloadQuestionAttachment(currentSq.question);
            }
            console.error('Cannot retrieve attachment without exam.');
        }
    }

    isAnswered() {
        return this.Examination.isAnswered(this.sq());
    }
}
