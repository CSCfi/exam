// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { Attachment, Exam } from 'src/app/exam/exam.model';
import type { User } from 'src/app/session/session.service';
export interface LanguageInspection {
    id: number;
    exam: Exam;
    assignee?: User;
    startedAt?: Date;
    finishedAt?: Date;
    approved?: boolean;
    modifier: User;
    creator: User;
    created: Date;
    statement: { attachment?: Attachment; comment?: string };
}
