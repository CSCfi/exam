import { User } from '../session/session.service';
import { Exam } from '../exam/exam.model';

export interface LanguageInspection {
    id: number;
    exam: Exam;
    assignee?: User;
    startedAt?: Date;
    finishedAt?: Date;
    approved?: boolean;
    modifier: User;
}
