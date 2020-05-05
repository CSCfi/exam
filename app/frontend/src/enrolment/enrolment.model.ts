import { Exam, ExaminationEventConfiguration } from '../exam/exam.model';

export interface ExamEnrolment {
    id: number;
    information: string;
    reservation: any;
    exam: Exam;
    examinationEventConfiguration?: ExaminationEventConfiguration;
}

export interface EnrolmentInfo extends Exam {
    languages: string[];
    maturityInstructions: string | null;
    alreadyEnrolled: boolean;
    reservationMade: boolean;
    noTrialsLeft: boolean;
}
