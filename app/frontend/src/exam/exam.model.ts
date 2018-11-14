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
    credits: number;
    gradeScale: GradeScale | null;
}

export interface ExamExecutionType {
    type: string;
    name?: string;
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
    objectVersion: number;
}

export interface Tag {
    id: number;
    name: string;
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

export interface Question {
    id?: number;
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
}

export interface MultipleChoiceOption {
    id: number;
    correctOption: boolean;
    defaultScore: number;
}

export interface ExamSectionQuestionOption {
    id: number;
    score: number;
    answered: boolean;
    option: MultipleChoiceOption;
}

export interface ClozeTestAnswer {
    id: number;
    score: { correctAnswers: number, incorrectAnswers: number };
    maxScore: number;
}

export interface ExamSectionQuestion {
    id: number;
    question: Question;
    evaluationType?: string;
    maxScore: number;
    essayAnswer?: EssayAnswer;
    clozeTestAnswer?: ClozeTestAnswer;
    options: ExamSectionQuestionOption[];
    answerInstructions: string;
    evaluationCriteria: string;
    expectedWordCount?: number;
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
    _rev: string;
}

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
    examType: { type: string, name?: string };
    executionType: ExamExecutionType;
    examEnrolments: { reservation?: { endAt: number } }[];
    gradeScale: GradeScale | null;
    autoEvaluationConfig: AutoEvaluationConfig;
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
    assessmentInfo: string;
    internalRef: string;
    objectVersion: number;
    examFeedback: { comment: string };
    grade: Grade;
    gradeless: boolean;
    creditType: { type: string };
    customCredit: number;
    additionalInfo: string;
    instruction: string;
}

// TODO: should somehow make it clearer whether answerLanguage can be a string or an object
export interface Exam extends ExamImpl {
    answerLanguage?: ExamLanguage;
}

