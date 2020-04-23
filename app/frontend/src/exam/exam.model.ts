import { ExamEnrolment } from '../enrolment/enrolment.model';
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

export interface Tag {
    id: number;
    name: string;
}

export interface Question {
    id: number;
    question: string;
    type: string;
    attachment: Attachment;
    tags: Tag[];
}

export interface ReverseExamSection extends ExamSection {
    exam: Exam;
}

export interface ReverseExamSectionQuestion extends ExamSectionQuestion {
    examSection: ReverseExamSection;
}

export interface ExamSectionQuestion {
    id: number;
    question: Question;
    evaluationType: string;
    maxScore: number;
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
    index: number;
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
    examActiveStartDate: VarDate;
    examActiveEndDate: VarDate;
}

export interface Participation {
    id: number;
    exam: Exam;
    _rev: string;
}

export interface ExaminationEvent {
    id?: number;
    start: Date;
    description: string;
}

export interface ExaminationEventConfiguration {
    id?: number;
    settingsPassword?: string;
    examinationEvent: ExaminationEvent;
    examEnrolments: ExamEnrolment[];
}

export type Implementation = 'AQUARIUM' | 'CLIENT_AUTH' | 'WHATEVER';

export interface ExamImpl {
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
    creator: User;
    examType: { type: string };
    executionType: ExamExecutionType;
    examEnrolments: { reservation?: { endAt: number } }[];
    gradeScale: GradeScale | null;
    autoEvaluationConfig: AutoEvaluationConfig;
    children: Exam[];
    examinationDates: ExaminationDate[];
    trialCount: number | null;
    parent: Exam | null;
    state: string;
    examSections: ExamSection[];
    examLanguages: ExamLanguage[];
    subjectToLanguageInspection: boolean | null;
    languageInspection: { finishedAt: string };
    enrollInstruction: string;
    anonymous: boolean;
    assessmentInfo: string;
    examFeedback: { comment: string; feedbackStatus: boolean; attachment?: Attachment };
    grade: Grade;
    gradeless: boolean;
    gradedTime: string;
    creditType: { type: string };
    customCredit: number;
    additionalInfo: string;
    examInspections: { user: User; ready: boolean }[];
    implementation: Implementation;
    examinationEventConfigurations: ExaminationEventConfiguration[];
    totalScore: number;
}

// TODO: should somehow make it clearer whether answerLanguage can be a string or an object
export interface Exam extends ExamImpl {
    answerLanguage?: ExamLanguage;
}

export interface ExamParticipation {
    id: number;
    exam: Exam;
    duration: number;
}

export enum ClaimChoiceOptionType {
    CorrectOption = 'CorrectOption',
    IncorrectOption = 'IncorrectOption',
    SkipOption = 'SkipOption',
}

export interface MultipleChoiceOption {
    id: number;
    option: string;
    correctOption: boolean;
    defaultScore: number;
    claimChoiceType?: ClaimChoiceOptionType;
}

export interface ExamSectionQuestionOption {
    id: number;
    option: MultipleChoiceOption;
    answered: boolean;
    score: number;
}
