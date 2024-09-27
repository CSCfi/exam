import type { Exam, ExamSection, ExamSectionQuestion, ExamSectionQuestionOption } from 'src/app/exam/exam.model';

export interface Examination extends Exam {
    cloned: boolean;
    external: boolean;
    examSections: ExaminationSection[];
}
export interface ExaminationQuestion extends ExamSectionQuestion {
    questionStatus: string;
    autosaved: Date;
    derivedMaxScore: number;
    derivedMinScore: number;
    selectedOption: number;
    answered: boolean;
    expanded: boolean;
    options: ExamSectionQuestionOption[];
}

export interface ExaminationSection extends ExamSection {
    sectionQuestions: ExaminationQuestion[];
}

export interface NavigationPage {
    index: number;
    id: number;
    text: string;
    type: string;
    valid: boolean;
}
