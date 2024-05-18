// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type {
    Attachment,
    EssayAnswer,
    ExamParticipation,
    Question,
    ReverseExamSectionQuestion,
    SelectableGrade,
} from 'src/app/exam/exam.model';

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
