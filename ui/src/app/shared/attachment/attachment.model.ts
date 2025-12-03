// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

export interface Attachment {
    id?: number;
    externalId?: string;
    fileName: string;
    removed: boolean;
    modified: boolean;
    size: number;
    file?: File;
    rev?: string;
    objectVersion?: number;
}

export interface FileResult {
    $value: { attachmentFile: File };
}

export interface AnsweredQuestion {
    id: number;
    essayAnswer: { objectVersion: number; attachment?: { fileName: string } };
}
