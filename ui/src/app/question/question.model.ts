// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ReverseExamSection } from 'src/app/exam/exam.model';
import { User } from 'src/app/session/session.model';
import { Attachment } from 'src/app/shared/attachment/attachment.model';

export interface ReverseExamSectionQuestion extends ExamSectionQuestion {
    examSection: ReverseExamSection;
}

export interface ReverseQuestion extends Question {
    examSectionQuestions: ReverseExamSectionQuestion[];
}

export interface Tag {
    id?: number;
    name: string;
    creator?: User;
    questions: Question[];
}

export interface Question {
    id: number;
    question: string;
    creator?: User;
    type: string;
    attachment?: Attachment;
    options: MultipleChoiceOption[];
    tags: Tag[];
    questionOwners: User[];
    parent?: Question;
    state: string;
    defaultMaxScore?: number;
    modifier?: User;
    modified?: Date;
    shared?: boolean;
    defaultAnswerInstructions?: string;
    defaultEvaluationCriteria?: string;
    defaultExpectedWordCount?: number;
    defaultEvaluationType?: string;
    defaultNegativeScoreAllowed: boolean;
    defaultOptionShufflingOn: boolean;
}

export type QuestionDraft = Omit<ReverseQuestion, 'id'> & { id: undefined };
export type QuestionAmounts = {
    accepted: number;
    rejected: number;
    hasEssays: boolean;
};

export interface LibraryQuestion extends ReverseQuestion {
    icon: string;
    displayedMaxScore: number | string;
    typeOrd: number;
    ownerAggregate: string;
    allowedToRemove: boolean;
}

export interface EssayAnswer {
    id?: number;
    evaluatedScore?: number;
    answer?: string;
    objectVersion?: number;
    attachment?: Attachment;
}

export interface MultipleChoiceOption {
    id?: number;
    option: string;
    correctOption: boolean;
    defaultScore: number;
    claimChoiceType?: string;
}

export enum ClaimChoiceOptionType {
    CorrectOption = 'CorrectOption',
    IncorrectOption = 'IncorrectOption',
    SkipOption = 'SkipOption',
}

export interface ExamSectionQuestionOption {
    id?: number;
    score: number;
    answered: boolean;
    option: MultipleChoiceOption;
}

export interface ClozeTestAnswer {
    id: number;
    score?: { correctAnswers: number; incorrectAnswers: number };
    maxScore: number;
    answer: string;
    objectVersion: number;
    question: string;
}

export interface ExamSectionQuestion {
    id: number;
    question: Question;
    evaluationType?: string;
    forcedScore: number | null;
    maxScore: number;
    essayAnswer?: EssayAnswer;
    clozeTestAnswer?: ClozeTestAnswer;
    options: ExamSectionQuestionOption[];
    answerInstructions: string;
    evaluationCriteria: string;
    expectedWordCount?: number;
    negativeScoreAllowed: boolean;
    optionShufflingOn: boolean;
    sequenceNumber: number;
    expanded: boolean;
    derivedMaxScore?: number;
    derivedAssessedScore?: number;
}
