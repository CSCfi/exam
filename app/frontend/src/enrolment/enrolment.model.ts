import { Exam, CollaborativeExam } from '../exam/exam.model';
import { Reservation } from '../reservation/reservation.model';

export interface ExamEnrolment {
    id: number;
    information: string;
    reservation?: Reservation;
    exam: Exam;
    collaborativeExam: CollaborativeExam;
    reservationCanceled: boolean;
}

export interface EnrolmentInfo extends Exam {
    languages: string[];
    maturityInstructions: string | null;
    alreadyEnrolled: boolean;
    reservationMade: boolean;
    noTrialsLeft: boolean;
}
