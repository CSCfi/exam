import type { Organisation } from '../calendar/calendar.service';
import type { ExamEnrolment } from '../enrolment/enrolment.model';
import type { LanguageInspection } from '../maturity/maturity.model';
import type { Reservation } from '../reservation/reservation.model';
import type { User } from '../session/session.service';

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

export interface Attachment {
    id?: number;
    externalId?: string;
    fileName: string;
    removed: boolean;
    modified: boolean;
    size: number;
    file?: File;
    rev?: string;
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

export interface ExamSectionQuestionOption {
    id?: number;
    score: number;
    answered: boolean;
    option: MultipleChoiceOption;
}

export interface ContentElement {
    order: number;
    type: string;
}
export interface TextElement extends ContentElement {
    text: string;
}
export function isTextElement(element: ContentElement): element is TextElement {
    return element.type === 'Text';
}
export function isBlankElement(element: ContentElement): element is BlankElement {
    return element.type === 'Blank';
}
interface BlankElement extends ContentElement {
    id: string;
    numeric: boolean;
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
    sequenceNumber: number;
    expanded: boolean;
    derivedMaxScore?: number;
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
    examActiveStartDate: string | number;
    examActiveEndDate: string | number;
}

export interface Feedback {
    comment: string;
    id?: number;
    attachment?: Attachment;
    feedbackStatus?: boolean;
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

export interface Software {
    id: number;
    name: string;
    turnedOn: boolean;
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
    examActiveStartDate: string | null;
    examActiveEndDate: string | null;
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
    languageInspection: LanguageInspection;
    inspectionComments: { comment: string; creator: User; created: Date }[];
    examInspections: ExamInspection[];
    examinationEventConfigurations: ExaminationEventConfiguration[];
    totalScore: number;
    organisations?: string;
}

export interface Exam extends ExamImpl {
    answerLanguage?: string;
}

export interface ExamParticipation {
    id: number;
    exam: Exam;
    ended: string;
    started: string;
    reservation?: Reservation;
    examinationEvent?: ExaminationEvent;
    collaborativeExam?: CollaborativeExam;
    externalExam?: { started: Date };
    user: User;
    duration: string;
    deadline: string;
    displayName?: string;
    _id?: string;
    _rev?: string;
}

export function isParticipation(event: ExamParticipation | ExamEnrolment): event is ExamParticipation {
    return (
        event.reservation !== null &&
        event.reservation !== undefined &&
        event.reservation.enrolment.noShow === undefined // FIXME: check this
    );
}

export enum ClaimChoiceOptionType {
    CorrectOption = 'CorrectOption',
    IncorrectOption = 'IncorrectOption',
    SkipOption = 'SkipOption',
}

export type MaintenancePeriod = {
    id?: number;
    startsAt: string;
    endsAt: string;
    description: string;
};
