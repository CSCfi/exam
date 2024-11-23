// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { Exam } from 'src/app/exam/exam.model';
import type { User } from 'src/app/session/session.model';
import { Attachment } from 'src/app/shared/attachment/attachment.model';
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
    statement: { attachment?: Attachment; comment: string };
}

export interface LanguageInspectionData extends LanguageInspection {
    ownerAggregate: string;
    studentName: string;
    studentNameAggregate: string;
    inspectorName: string;
    inspectorNameAggregate: string;
    answerLanguage?: string;
}

export interface QueryParams {
    text?: string;
    start?: number;
    end?: number;
}
