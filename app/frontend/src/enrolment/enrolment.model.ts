import { MomentInput } from 'moment';

import { CollaborativeExam, Exam, ExaminationEvent, ExaminationEventConfiguration } from '../exam/exam.model';
import { Reservation } from '../reservation/reservation.model';
import { User } from '../session/session.service';

export interface ExamParticipation {
    id: number;
    exam: Exam;
    ended: MomentInput;
    started: MomentInput;
    reservation: Reservation;
    examinationEvent: ExaminationEvent;
    duration: number | string;
    user: User;
    _id?: string;
}

export interface Scores {
    maxScore: number;
    totalScore: number;
    approvedAnswerCount: number;
    rejectedAnswerCount: number;
}

type GradedExam = Omit<Exam, 'grade' | 'creditType'> & {
    grade: { displayName: string; name: string };
    creditType: { displayName: string; type: string };
};

export interface ReviewedExam extends GradedExam, Scores {}

export interface AssessedParticipation extends Omit<ExamParticipation, 'exam'> {
    exam: ReviewedExam;
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
    user: User;
    collaborativeExam: CollaborativeExam;
    reservationCanceled: boolean;
    externalExam?: any; // TBD
    examinationEventConfiguration?: ExaminationEventConfiguration;
}

export interface EnrolmentInfo extends Exam {
    languages: string[];
    maturityInstructions: string | null;
    alreadyEnrolled: boolean;
    reservationMade: boolean;
    noTrialsLeft: boolean;
}
