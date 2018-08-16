import { Exam } from '../exam/exam.model';

export interface ExamEnrolment {
    id: number;
    information: string;
    reservation: any;
    exam: Exam;
}

export interface EnrolmentInfo extends Exam {
    languages: string[];
    maturityInstructions?: string;
    alreadyEnrolled: boolean;
    reservationMade: boolean;
    noTrialsLeft: boolean;
}
