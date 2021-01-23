import { Attachment, Exam } from '../exam/exam.model';
import { User } from '../session/session.service';

export interface LanguageInspection {
    id: number;
    exam: Exam;
    assignee?: User;
    startedAt?: Date;
    finishedAt?: Date;
    approved?: boolean;
    modifier: User;
    statement: { attachment?: Attachment; comment?: string };
}
