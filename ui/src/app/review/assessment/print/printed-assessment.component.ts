// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, LowerCasePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AfterViewInit, ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import type { ExamEnrolment, ExamParticipation } from 'src/app/enrolment/enrolment.model';
import { Exam } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { QuestionScoringService } from 'src/app/question/question-scoring.service';
import type { QuestionAmounts } from 'src/app/question/question.model';
import { ClozeTestAnswer } from 'src/app/question/question.model';
import type { Reservation } from 'src/app/reservation/reservation.model';
import { AssessmentService } from 'src/app/review/assessment/assessment.service';
import type { User } from 'src/app/session/session.model';
import { SessionService } from 'src/app/session/session.service';
import { ApplyDstPipe } from 'src/app/shared/date/apply-dst.pipe';
import { DateTimeService } from 'src/app/shared/date/date.service';
import { MathUnifiedDirective } from 'src/app/shared/math/math.directive';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';
import { CourseCodeComponent } from 'src/app/shared/miscellaneous/course-code.component';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { PrintedSectionComponent } from './printed-section.component';

type PreviousParticipation = Omit<Partial<ExamParticipation>, 'exam'> & { exam: Partial<Exam> };

@Component({
    selector: 'xm-printed-assessment',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './printed-assessment.component.html',
    imports: [
        CourseCodeComponent,
        MathUnifiedDirective,
        PrintedSectionComponent,
        LowerCasePipe,
        DatePipe,
        TranslateModule,
        ApplyDstPipe,
        OrderByPipe,
    ],
    styleUrls: ['./print.shared.scss'],
})
export class PrintedAssessmentComponent implements OnInit, AfterViewInit {
    collaborative = false;
    questionSummary = signal<QuestionAmounts>({ accepted: 0, rejected: 0, hasEssays: false });
    exam = signal<Exam | undefined>(undefined);
    user: User;
    participation = signal<ExamParticipation | undefined>(undefined);
    previousParticipations = signal<PreviousParticipation[]>([]);
    student = signal<User | undefined>(undefined);
    enrolment = signal<ExamEnrolment | undefined>(undefined);
    reservation = signal<Reservation | undefined>(undefined);
    id = 0;
    ref = '';

    private route = inject(ActivatedRoute);
    private http = inject(HttpClient);
    private QuestionScore = inject(QuestionScoringService);
    private Exam = inject(ExamService);
    private CommonExam = inject(CommonExamService);
    private Assessment = inject(AssessmentService);
    private Session = inject(SessionService);
    private DateTime = inject(DateTimeService);

    constructor() {
        this.user = this.Session.getUser();
    }

    ngOnInit() {
        this.id = this.route.snapshot.params.id;
        this.ref = this.route.snapshot.params.ref;
        this.collaborative = this.route.snapshot.data.collaborative;
    }

    ngAfterViewInit() {
        const path = this.collaborative ? `${this.id}/${this.ref}` : this.id;
        const url = this.getResource(path.toString());

        this.http.get<ExamParticipation>(url).subscribe((participation) => {
            //TODO: Some duplicates here, refactor some more
            const exam = participation.exam;
            exam.examSections.forEach((es) =>
                es.sectionQuestions
                    .filter((esq) => esq.question.type === 'ClozeTestQuestion' && esq.clozeTestAnswer?.answer)
                    .forEach(
                        (esq) =>
                            ((esq.clozeTestAnswer as ClozeTestAnswer).answer = JSON.parse(
                                esq.clozeTestAnswer?.answer as string,
                            )),
                    ),
            );

            this.questionSummary.set(this.QuestionScore.getQuestionAmounts(exam));
            this.exam.set(exam);
            this.user = this.Session.getUser();
            this.participation.set(participation);
            const participationValue = participation;
            const duration = DateTime.fromISO(participationValue.duration as string)
                .set({ second: 0, millisecond: 0 })
                .toJSDate();
            participationValue.duration = this.DateTime.formatInTimeZone(duration, 'UTC') as string;

            this.student.set(participationValue.user);
            this.enrolment.set(exam.examEnrolments[0]);
            this.reservation.set(exam.examEnrolments[0]?.reservation as Reservation);
            if (!this.collaborative) {
                this.http
                    .get<ExamParticipation[]>(`/app/examparticipations/${exam.id}`)
                    .subscribe(this.handleParticipations);
            } else {
                this.http
                    .get<ExamParticipation[]>(`/app/iop/reviews/${this.id}/participations/${this.ref}`)
                    .subscribe(this.handleParticipations);
            }
        });
    }

    translateGrade = (participation: PreviousParticipation) =>
        !participation.exam.grade ? 'N/A' : this.CommonExam.getExamGradeDisplayName(participation.exam.grade.name);

    getGrade = () => {
        const examValue = this.exam();
        return !examValue?.grade ? 'N/A' : this.CommonExam.getExamGradeDisplayName(examValue.grade.name);
    };

    getCreditType = () => {
        const examValue = this.exam();
        return !examValue ? 'N/A' : this.CommonExam.getExamTypeDisplayName(examValue.examType.type);
    };

    getLanguage = () => {
        const examValue = this.exam();
        if (!examValue) return 'N/A';
        const lang = this.Assessment.pickExamLanguage(examValue);
        return !lang ? 'N/A' : lang.name;
    };

    getExamMaxPossibleScore = () => {
        const examValue = this.exam();
        return examValue ? this.Exam.getMaxScore(examValue) : 0;
    };

    getExamTotalScore = () => {
        const examValue = this.exam();
        return examValue ? this.Exam.getTotalScore(examValue) : 0;
    };

    getTeacherCount = () => {
        const examValue = this.exam();
        if (!examValue) return 0;
        // Do not add up if user exists in both groups
        const exam = this.collaborative ? examValue : (examValue.parent as Exam);
        const owners = exam.examOwners.filter(
            (owner) => examValue.examInspections.map((i) => i.user.id).indexOf(owner.id) === -1,
        );
        return examValue.examInspections.length + owners.length;
    };

    translateState = (participation: PreviousParticipation) => 'i18n_exam_status_' + participation.exam.state;

    private handleParticipations = (data: ExamParticipation[]) => {
        const examValue = this.exam();
        const participationValue = this.participation();
        if (!examValue || !participationValue) return;

        if (this.collaborative) {
            //TODO: Add collaborative support for noshows.
            this.previousParticipations.set(data);
            this.printPage();
            return;
        }
        // Filter out the participation we are looking into
        const previousParticipations: PreviousParticipation[] = data.filter((p) => p.id !== participationValue.id);
        this.http.get<Reservation[]>(`/app/usernoshows/${examValue.id}`).subscribe((resp) => {
            const noShows: PreviousParticipation[] = resp.map((r) => ({
                noShow: true,
                started: r.startAt,
                exam: { state: 'no_show' },
            }));
            this.previousParticipations.set(previousParticipations.concat(noShows));
            this.printPage();
        });
    };

    private printPage = async () => {
        // FIXME: check how to do this angular-style
        // $('#vmenu').hide();
        // const mainView = $('#mainView');
        // mainView.css('margin', '0 15px');
        // mainView.css('max-width', '1000px');
        // Math content is now in MathLive format, no typesetting needed
        window.setTimeout(() => window.print(), 2000);
    };

    private getResource = (path: string) => (this.collaborative ? `/app/iop/reviews/${path}` : `/app/review/${path}`);
}
