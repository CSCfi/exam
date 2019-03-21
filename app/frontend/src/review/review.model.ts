import { Question, ReverseExamSectionQuestion, Attachment } from '../exam/exam.model';

export interface EssayAnswer {
    id: number;
    evaluatedScore: number;
    textualScore: string;
    score: number;
    answer: string;
    attachment: Attachment;
}

export interface ReviewQuestion extends ReverseExamSectionQuestion {
    essayAnswer: EssayAnswer;
    selected: boolean;
    expanded: boolean;
}

export interface QuestionReview {
    question: Question;
    answers: ReviewQuestion[];
    selected: boolean;
}
