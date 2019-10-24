import { MomentInput } from 'moment';

import { CollaborativeExam, Exam } from '../exam/exam.model';
import { Reservation } from '../reservation/reservation.model';

export interface ExamParticipation {
    id: number;
    exam: Exam;
    ended: MomentInput;
    started: MomentInput;
    reservation: Reservation;
}

export interface Scores {
    maxScore: number;
    totalScore: number;
    approvedAnswerCount: number;
    rejectedAnswerCount: number;
}

export interface ReviewedExam extends Exam, Scores {}

export interface AssessedParticipation extends ExamParticipation {
    reviewedExam: Exam;
    scores: {
        maxScore: number;
        totalScore: number;
        approvedAnswerCount: number;
        rejectedAnswerCount: number;
        hasApprovedRejectedAnswers: boolean;
    };
}

export interface ExamEnrolment {
    id: number;
    information: string;
    reservation?: Reservation;
    exam: Exam;
    collaborativeExam: CollaborativeExam;
    reservationCanceled: boolean;
    externalExam?: any; // TBD
}

export interface EnrolmentInfo extends Exam {
    languages: string[];
    maturityInstructions: string | null;
    alreadyEnrolled: boolean;
    reservationMade: boolean;
    noTrialsLeft: boolean;
}
