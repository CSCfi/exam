import type { CollaborativeExam, Exam, ExaminationEventConfiguration } from '../exam/exam.model';
import type { Reservation } from '../reservation/reservation.model';
import type { User } from '../session/session.service';

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
}

export interface EnrolmentInfo extends Exam {
    languages: string[];
    maturityInstructions: string | null;
    alreadyEnrolled: boolean;
    reservationMade: boolean;
    noTrialsLeft: boolean;
}
