// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Organisation } from 'src/app/calendar/calendar.model';
import type { ExamEnrolment, ExamParticipation } from 'src/app/enrolment/enrolment.model';
import { Software } from 'src/app/facility/facility.model';
import type { LanguageInspection } from 'src/app/maturity/maturity.model';
import { ExamSectionQuestion } from 'src/app/question/question.model';
import { Feedback } from 'src/app/review/review.model';
import type { User } from 'src/app/session/session.model';
import { Attachment } from 'src/app/shared/attachment/attachment.model';

export interface Grade {
    id: number;
    name: string;
    marksRejection: boolean;
}

export type TypedGrade = Grade & { type: string };
export type NoGrade = Omit<TypedGrade, 'id'> & { id?: number; type: 'NONE' };
export type SelectableGrade = TypedGrade | NoGrade;
export function isRealGrade(grade: SelectableGrade): grade is TypedGrade {
    return grade.type !== 'NONE';
}

export interface GradeEvaluation {
    id?: number;
    grade: Grade;
    percentage: number;
}

export interface AutoEvaluationConfig {
    id?: number;
    releaseDate: Date | null;
    amountDays?: number;
    releaseType?: string;
    gradeEvaluations: GradeEvaluation[];
}

export interface ExamFeedbackConfig {
    id?: number;
    releaseType?: string;
    releaseDate: Date | null;
    amountDays?: number;
}

export interface Course {
    id: number;
    name: string;
    code: string;
    credits: number;
    gradeScale?: GradeScale;
    organisation?: Organisation;
}

export interface ExamExecutionType {
    type: string;
    id: number;
}

export interface GradeScale {
    id: number;
    displayName: string;
    description: string;
    name?: string;
    grades: Grade[];
}

export interface ExaminationDate {
    id: number;
    date: string;
}

export interface ExamLanguage {
    code: string;
    name: string;
}

export interface ReverseExamSection extends ExamSection {
    exam: Exam;
}

export interface ExamMaterial {
    id: number;
    name: string;
    isbn?: string;
    author?: string;
}

export interface ExamSection {
    id: number;
    name: string;
    description: string;
    lotteryOn: boolean;
    lotteryItemCount: number;
    sequenceNumber: number;
    expanded: boolean;
    sectionQuestions: ExamSectionQuestion[];
    examMaterials: ExamMaterial[];
    optional: boolean;
}

export enum CollaborativeExamState {
    DRAFT = 'DRAFT',
    PUBLISHED = 'PUBLISHED',
    PRE_PUBLISHED = 'PRE_PUBLISHED',
}

export interface CollaborativeExam {
    id: number;
    anonymous: boolean;
    name: string;
    examLanguages: ExamLanguage[];
    state: CollaborativeExamState;
    examOwners: User[];
    executionType: ExamExecutionType;
    enrollInstruction: string;
    periodStart: string | number;
    periodEnd: string | number;
    externalRef?: string;
}

export interface ExaminationEvent {
    id?: number;
    start: string;
    description: string;
    capacity: number;
    examinationEventConfiguration: ExaminationEventConfiguration;
}

export interface ExaminationEventConfiguration {
    id?: number;
    quitPassword?: string;
    settingsPassword?: string;
    exam: Exam;
    examinationEvent: ExaminationEvent;
    examEnrolments: ExamEnrolment[];
}

export type Implementation = 'AQUARIUM' | 'CLIENT_AUTH' | 'WHATEVER';

export interface ExamInspection {
    id: number;
    user: User;
    ready: boolean;
}

export interface ExamType {
    id: number;
    type: string;
    name?: string;
}

export interface ExamImpl {
    id: number;
    created: Date;
    attachment?: Attachment;
    hasEnrolmentsInEffect: boolean;
    name: string | null;
    periodStart: string | null;
    periodEnd: string | null;
    duration: number;
    course?: Course;
    external: boolean;
    collaborative: boolean;
    hash: string;
    examOwners: User[];
    creator: User;
    examType: ExamType;
    executionType: ExamExecutionType;
    examEnrolments: ExamEnrolment[];
    examParticipation?: ExamParticipation;
    gradeScale?: GradeScale;
    autoEvaluationConfig?: AutoEvaluationConfig;
    examFeedbackConfig?: ExamFeedbackConfig;
    children: Exam[];
    examinationDates: ExaminationDate[];
    trialCount: number | null;
    parent: Exam | null;
    shared: boolean;
    expanded: boolean;
    state: string;
    examSections: ExamSection[];
    examLanguages: ExamLanguage[];
    subjectToLanguageInspection: boolean | null;
    enrollInstruction: string;
    anonymous: boolean;
    implementation: Implementation;
    assessmentInfo: string;
    internalRef: string;
    objectVersion: number;
    examFeedback: Feedback;
    grade?: SelectableGrade;
    gradedTime?: Date;
    contentGrade?: string;
    gradingType: GradingType;
    credit: number;
    creditType?: { type: string; id: number };
    customCredit: number;
    softwares: Software[];
    maxScore: number;
    approvedAnswerCount: number;
    rejectedAnswerCount: number;
    additionalInfo: string;
    instruction: string;
    autoEvaluationNotified: boolean;
    languageInspection: LanguageInspection;
    inspectionComments: { comment: string; creator: User; created: Date }[];
    examInspections: ExamInspection[];
    examinationEventConfigurations: ExaminationEventConfiguration[];
    totalScore: number;
    organisations?: string;
    externalRef?: string;
}

export type GradingType = 'GRADED' | 'NOT_GRADED' | 'POINT_GRADED';

export interface Exam extends ExamImpl {
    answerLanguage?: string;
}
