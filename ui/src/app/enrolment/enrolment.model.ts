// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type {
    CollaborativeExam,
    Course,
    Exam,
    ExaminationEventConfiguration,
    ExamInspection,
    ExamSection,
} from 'src/app/exam/exam.model';
import type { Reservation } from 'src/app/reservation/reservation.model';
import type { User } from 'src/app/session/session.service';

export interface Scores {
    maxScore: number;
    totalScore: number;
    approvedAnswerCount: number;
    rejectedAnswerCount: number;
    hasApprovedRejectedAnswers: boolean;
}

type GradedExam = Omit<Exam, 'grade' | 'creditType'> & {
    grade?: { displayName: string; name: string };
    creditType: { displayName: string; type: string };
};

export interface ReviewedExam extends GradedExam, Scores {}
export interface ExternalExam {
    id: number;
    hash: string;
    created: Date;
    started: Date;
    finished: Date;
    sent: Date;
    creator: User;
}

export interface ExamEnrolment {
    id: number;
    information: string;
    reservation?: Reservation;
    exam: Exam;
    user: User;
    collaborativeExam: CollaborativeExam;
    reservationCanceled: boolean;
    externalExam?: ExternalExam;
    examinationEventConfiguration?: ExaminationEventConfiguration;
    preEnrolledUserEmail?: string;
    noShow: boolean;
    retrialPermitted: boolean;
    optionalSections: ExamSection[];
    delay: number;
}

export interface EnrolmentInfo extends Exam {
    languages: string[];
    maturityInstructions: string | null;
    alreadyEnrolled: boolean;
    reservationMade: boolean;
    noTrialsLeft: boolean;
}

export interface CollaborativeExamInfo extends CollaborativeExam {
    languages: string[];
    reservationMade: boolean;
    alreadyEnrolled: boolean;
    noTrialsLeft: boolean;
    implementation: string;
    course: Course;
    examInspections: ExamInspection[];
    parent: null;
}
