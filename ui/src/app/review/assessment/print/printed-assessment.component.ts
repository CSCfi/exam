/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */
import { DatePipe, LowerCasePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { parseISO, roundToNearestMinutes } from 'date-fns';
import type { ExamEnrolment } from '../../../enrolment/enrolment.model';
import type { ClozeTestAnswer, Exam, ExamParticipation } from '../../../exam/exam.model';
import { ExamService } from '../../../exam/exam.service';
import type { QuestionAmounts } from '../../../question/question.service';
import { QuestionService } from '../../../question/question.service';
import type { Reservation } from '../../../reservation/reservation.model';
import type { User } from '../../../session/session.service';
import { SessionService } from '../../../session/session.service';
import { ApplyDstPipe } from '../../../shared/date/apply-dst.pipe';
import { DateTimeService } from '../../../shared/date/date.service';
import { MathJaxDirective } from '../../../shared/math/math-jax.directive';
import { CommonExamService } from '../../../shared/miscellaneous/common-exam.service';
import { CourseCodeComponent } from '../../../shared/miscellaneous/course-code.component';
import { OrderByPipe } from '../../../shared/sorting/order-by.pipe';
import { AssessmentService } from '../assessment.service';
import { PrintedSectionComponent } from './printed-section.component';

type PreviousParticipation = Omit<Partial<ExamParticipation>, 'exam'> & { exam: Partial<Exam> };

@Component({
    selector: 'xm-printed-assessment',
    templateUrl: './printed-assessment.component.html',
    standalone: true,
    imports: [
        CourseCodeComponent,
        MathJaxDirective,
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
    questionSummary: QuestionAmounts = { accepted: 0, rejected: 0, hasEssays: false, totalSelectionEssays: 0 };
    exam!: Exam;
    user: User;
    participation!: ExamParticipation;
    previousParticipations: PreviousParticipation[] = [];
    student?: User;
    enrolment?: ExamEnrolment;
    reservation!: Reservation;
    id = 0;
    ref = '';

    constructor(
        private route: ActivatedRoute,
        private http: HttpClient,
        private Question: QuestionService,
        private Exam: ExamService,
        private CommonExam: CommonExamService,
        private Assessment: AssessmentService,
        private Session: SessionService,
        private DateTime: DateTimeService,
    ) {
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

            this.questionSummary = this.Question.getQuestionAmounts(exam);
            this.exam = exam;
            this.user = this.Session.getUser();
            this.participation = participation;
            const duration = roundToNearestMinutes(parseISO(this.participation.duration as string));
            this.participation.duration = this.DateTime.formatInTimeZone(duration, 'UTC') as string;

            this.student = this.participation.user;
            this.enrolment = this.exam.examEnrolments[0];
            this.reservation = this.enrolment.reservation as Reservation;
            if (!this.collaborative) {
                this.http
                    .get<ExamParticipation[]>(`/app/examparticipations/${this.exam.id}`)
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

    getGrade = () => (!this.exam.grade ? 'N/A' : this.CommonExam.getExamGradeDisplayName(this.exam.grade.name));

    getCreditType = () => (!this.exam ? 'N/A' : this.CommonExam.getExamTypeDisplayName(this.exam.examType.type));

    getLanguage = () => {
        if (!this.exam) return 'N/A';
        const lang = this.Assessment.pickExamLanguage(this.exam);
        return !lang ? 'N/A' : lang.name;
    };

    getExamMaxPossibleScore = () => this.Exam.getMaxScore(this.exam);

    getExamTotalScore = () => this.Exam.getTotalScore(this.exam);

    getTeacherCount = () => {
        // Do not add up if user exists in both groups
        const exam = this.collaborative ? this.exam : (this.exam.parent as Exam);
        const owners = exam.examOwners.filter(
            (owner) => this.exam.examInspections.map((i) => i.user.id).indexOf(owner.id) === -1,
        );
        return this.exam.examInspections.length + owners.length;
    };

    translateState = (participation: PreviousParticipation) => 'i18n_exam_status_' + participation.exam.state;

    private handleParticipations = (data: ExamParticipation[]) => {
        if (this.collaborative) {
            //TODO: Add collaborative support for noshows.
            this.previousParticipations = data;
            this.printPage();
            return;
        }
        // Filter out the participation we are looking into
        const previousParticipations: PreviousParticipation[] = data.filter((p) => p.id !== this.participation.id);
        this.http.get<Reservation[]>(`/app/usernoshows/${this.exam.id}`).subscribe((resp) => {
            const noShows: PreviousParticipation[] = resp.map((r) => ({
                noShow: true,
                started: r.startAt,
                exam: { state: 'no_show' },
            }));
            this.previousParticipations = previousParticipations.concat(noShows);
            this.printPage();
        });
    };

    private printPage = () => {
        // FIXME: check how to do this angular-style
        // $('#vmenu').hide();
        // const mainView = $('#mainView');
        // mainView.css('margin', '0 15px');
        // mainView.css('max-width', '1000px');
        MathJax.Hub.Queue(['Typeset', MathJax.Hub]);
        window.setTimeout(() => window.print(), 2000);
    };

    private getResource = (path: string) => (this.collaborative ? `/app/iop/reviews/${path}` : `/app/review/${path}`);
}
