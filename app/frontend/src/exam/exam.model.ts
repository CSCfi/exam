import { ExamEnrolment } from '../enrolment/enrolment.model';
import { LanguageInspection } from '../maturity/maturity.model';
import { User } from '../session/session.service';

export interface Grade {
    id: number;
    name: string;
    marksRejection: boolean;
}

export type TypedGrade = Grade & { type: string };
export type NoGrade = Omit<TypedGrade, 'id'> & { type: 'NONE' };
export type SelectableGrade = TypedGrade | NoGrade;
const isRealGrade = (grade: SelectableGrade): grade is TypedGrade => grade.type !== 'NONE';
export default isRealGrade;

export interface GradeEvaluation {
    id?: number;
    grade: Grade;
    percentage: number;
}

export interface AutoEvaluationConfig {
    id?: number;
    releaseDate: Date;
    amountDays?: number;
    releaseType?: string;
    gradeEvaluations: GradeEvaluation[];
}

export interface Course {
    id: number;
    name: string;
    code: string;
    credits: number;
    gradeScale: GradeScale | null;
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
    date: Date | number;
}

export interface ExamLanguage {
    code: string;
    name: string;
}

export interface Attachment {
    id?: number;
    externalId?: string;
    fileName: string;
    removed: boolean;
    modified: boolean;
    size: number;
    file?: File;
    objectVersion?: number;
}
export interface ReverseExamSection extends ExamSection {
    exam: Exam;
}

export interface ReverseExamSectionQuestion extends ExamSectionQuestion {
    examSection: ReverseExamSection;
}

export interface ReverseQuestion extends Question {
    examSectionQuestions: ReverseExamSectionQuestion[];
}

export interface Tag {
    id?: number;
    name: string;
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
    state: string;
    defaultMaxScore?: number;
    shared?: boolean;
    defaultAnswerInstructions?: string;
    defaultEvaluationCriteria?: string;
    defaultExpectedWordCount?: number;
    defaultEvaluationType?: string;
}

export interface EssayAnswer {
    id: number;
    evaluatedScore: number;
    answer: string;
    objectVersion: number;
}

export interface MultipleChoiceOption {
    id: number;
    option: string;
    correctOption: boolean;
    defaultScore: number;
    claimChoiceType: string;
}

export interface ExamSectionQuestionOption {
    id: number;
    score: number;
    answered: boolean;
    option: MultipleChoiceOption;
}

export interface ClozeTestAnswer {
    id: number;
    score: { correctAnswers: number; incorrectAnswers: number };
    maxScore: number;
    answer: string;
    objectVersion: number;
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
    evaluationType?: string;
    forcedScore: number;
    maxScore: number;
    essayAnswer?: EssayAnswer;
    clozeTestAnswer?: ClozeTestAnswer;
    options: ExamSectionQuestionOption[];
    answerInstructions: string;
    evaluationCriteria: string;
    expectedWordCount?: number;
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
    examActiveStartDate: string | number;
    examActiveEndDate: string | number;
}

export interface Participation {
    id: number;
    exam: Exam;
    _rev: string;
}

export interface Feedback {
    comment: string;
    id?: number;
    attachment?: Attachment;
    feedbackStatus: boolean;
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

export interface ExamInspection {
    user: User;
    ready: boolean;
}

export interface Software {
    id: number;
    name: string;
}

export interface ExamImpl {
    id: number;
    created: Date;
    attachment?: Attachment;
    hasEnrolmentsInEffect: boolean;
    name: string | null;
    examActiveStartDate: string | number;
    examActiveEndDate: string | number;
    duration: number;
    course: Course | null;
    external: boolean;
    collaborative: boolean;
    hash: string;
    examOwners: User[];
    creator: User;
    examType: { id: number; type: string; name?: string };
    executionType: ExamExecutionType;
    examEnrolments: ExamEnrolment[];
    gradeScale: GradeScale | null;
    autoEvaluationConfig?: AutoEvaluationConfig;
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
    gradeless: boolean;
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
    languageInspection?: LanguageInspection;
    examInspections: ExamInspection[];
    examinationEventConfigurations: ExaminationEventConfiguration[];
    totalScore: number;
}

export interface Exam extends ExamImpl {
    answerLanguage?: string;
}

export interface ExamParticipation {
    id: number;
    exam: Exam;
    externalExam?: { started: Date };
    duration: number;
    displayName?: string;
}

export enum ClaimChoiceOptionType {
    CorrectOption = 'CorrectOption',
    IncorrectOption = 'IncorrectOption',
    SkipOption = 'SkipOption',
}

export interface ExamSectionQuestionOption {
    id: number;
    option: MultipleChoiceOption;
    answered: boolean;
    score: number;
}
