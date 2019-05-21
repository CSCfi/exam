import { ExamImpl, Attachment } from '../exam/exam.model';
import { User } from '../session/session.service';

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
    statement: { attachment: Attachment };
}
