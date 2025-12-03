// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ExamParticipation } from 'src/app/enrolment/enrolment.model';
import { SelectableGrade } from 'src/app/exam/exam.model';
import { EssayAnswer, Question, ReverseExamSectionQuestion } from 'src/app/question/question.model';
import { Attachment } from 'src/app/shared/attachment/attachment.model';

export interface ScorableEssayAnswer extends EssayAnswer {
    id: number;
    evaluatedScore: number; // score entered and saved
    temporaryScore: number; // score entered but not saved
    answer: string;
    attachment: Attachment;
}

export interface ReviewQuestion extends ReverseExamSectionQuestion {
    essayAnswer: ScorableEssayAnswer;
    selected: boolean;
    expanded: boolean;
}

export interface QuestionReview {
    question: Question;
    answers: ReviewQuestion[];
    evaluationCriteria?: string;
    selected: boolean;
    expanded: boolean;
}

export type Review = {
    examParticipation: ExamParticipation;
    grades: SelectableGrade[];
    selectedGrade?: SelectableGrade;
    duration: string;
    displayName: string;
    isUnderLanguageInspection: boolean;
    selected: boolean;
    displayedGradingTime?: Date;
    displayedGrade?: string;
    displayedCredit?: number;
};

export interface Feedback {
    comment: string;
    id?: number;
    attachment?: Attachment;
    feedbackStatus?: boolean;
}

export type ReviewListView = {
    items: Review[];
    filtered: Review[];
    toggle: boolean;
    pageSize: number;
    predicate: string;
    reverse: boolean;
    page: number;
    filter: string;
};
