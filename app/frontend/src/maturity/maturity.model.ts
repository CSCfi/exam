import { User } from '../session/session.service';
import { ExamImpl } from '../exam/exam.model';

interface Maturity extends ExamImpl {
    answerLanguage: string;
}

export interface LanguageInspection {
    id: number;
    exam: Maturity;
    assignee?: User;
    startedAt?: Date;
    finishedAt?: Date;
    approved?: boolean;
    modifier: User;
}
