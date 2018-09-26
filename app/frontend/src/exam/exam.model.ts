import { User } from '../session/session.service';

export interface Grade {
    id: number;
    name: string;
    marksRejection: boolean;
}

export interface GradeEvaluation {
    id: number;
    grade: Grade;
    percentage: number;
}

export interface AutoEvaluationConfig {
    id: number;
    releaseDate: VarDate | null;
    amountDays: number | null;
    releaseType: { name: string };
    gradeEvaluations: GradeEvaluation[];
}

export interface Course {
    id: number;
    name: string;
    code: string;
    gradeScale: GradeScale | null;
}

export interface ExamExecutionType {
    type: string;
    id: number;
}

export interface GradeScale {
    id: number;
    displayName: string;
    grades: Grade[];
}

export interface ExaminationDate {
    id: number;
    date: Date;
}

export interface ExamLanguage {
    code: string;
    name: string;
}

export interface Attachment {
    id?: number;
    externalId?: number;
    fileName: string;
    removed: boolean;
    modified: boolean;
    size: number;
    file?: File;
}

export interface Question {
    id: number;
    question: string;
    type: string;
    attachment:  Attachment;
}

export interface ExamSectionQuestion {
    id: number;
    question: Question;
    evaluationType: string;
    maxScore: number;
}

export interface ExamSection {
    id: number;
    name: string;
    index: number;
    description: string;
    lotteryOn: boolean;
    lotteryItemCount: number;
    sequenceNumber: number;
    expanded: boolean;
    sectionQuestions: ExamSectionQuestion[];
}

export interface CollaborativeExam {
    id: number;
    name: string;
    examLanguages: ExamLanguage[];
}

export interface Participation {
    id: number;
    exam: Exam;
}

export interface Exam {
    id: number;
    attachment: Attachment | null;
    hasEnrolmentsInEffect: boolean;
    name: string | null;
    examActiveStartDate: VarDate;
    examActiveEndDate: VarDate;
    duration: number;
    course: Course | null;
    external: boolean;
    collaborative: boolean;
    hash: string;
    examOwners: User[];
    examType: { type: string };
    executionType: ExamExecutionType;
    examEnrolments: { reservation?: { endAt: number } }[];
    gradeScale: GradeScale | null;
    autoEvaluationConfig: AutoEvaluationConfig;
    children: Exam[];
    examinationDates: ExaminationDate[];
    trialCount: number | null;
    state: string;
    examSections: ExamSection[];
    examLanguages: ExamLanguage[];
    subjectToLanguageInspection: boolean | null;
    enrollInstruction: string;
    anonymous: boolean;
}
