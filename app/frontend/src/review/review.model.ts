import { Attachment, EssayAnswer, Question, ReverseExamSectionQuestion } from '../exam/exam.model';

export interface ScorableEssayAnswer extends EssayAnswer {
    id: number;
    evaluatedScore: number; // score entered and saved
    temporaryScore: number; // score entered but not saved
    textualScore: string; // score as text for html-select mapping purposes in approved/rejected case
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
    selected: boolean;
}
