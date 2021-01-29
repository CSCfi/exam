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
import { HttpClient } from '@angular/common/http';
import { Component, Input } from '@angular/core';
import { StateService } from '@uirouter/core';
import * as moment from 'moment';

import { ExamEnrolment } from '../../../enrolment/enrolment.model';
import { ClozeTestAnswer, Exam, ExamParticipation } from '../../../exam/exam.model';
import { ExamService } from '../../../exam/exam.service';
import { QuestionAmounts, QuestionService } from '../../../question/question.service';
import { Reservation } from '../../../reservation/reservation.model';
import { SessionService, User } from '../../../session/session.service';
import { LanguageService } from '../../../utility/language/language.service';
import { WindowRef } from '../../../utility/window/window.service';
import { AssessmentService } from '../assessment.service';

type PreviousParticipation = Omit<Partial<ExamParticipation>, 'exam'> & { exam: Partial<Exam> };

@Component({
    selector: 'printed-assessment',
    templateUrl: './printedAssessment.component.html',
})
export class PrintedAssessmentComponent {
    @Input() collaborative: boolean;
    questionSummary: QuestionAmounts;
    exam: Exam;
    user: User;
    participation: ExamParticipation;
    previousParticipations: PreviousParticipation[];
    student: User;
    enrolment: ExamEnrolment;
    reservation: Reservation;

    constructor(
        private state: StateService,
        private http: HttpClient,
        private Window: WindowRef,
        private Question: QuestionService,
        private Exam: ExamService,
        private Assessment: AssessmentService,
        private Session: SessionService,
        private Language: LanguageService,
    ) {}

    ngAfterViewInit() {
        const path = this.collaborative ? `${this.state.params.id}/${this.state.params.ref}` : this.state.params.id;
        const url = this.getResource(path);

        this.http.get<ExamParticipation>(url).subscribe(participation => {
            //TODO: Some duplicates here, refactor some more
            const exam = participation.exam;
            exam.examSections.forEach(es =>
                es.sectionQuestions
                    .filter(esq => esq.question.type === 'ClozeTestQuestion' && esq.clozeTestAnswer?.answer)
                    .forEach(
                        esq =>
                            ((esq.clozeTestAnswer as ClozeTestAnswer).answer = JSON.parse(
                                esq.clozeTestAnswer?.answer as string,
                            )),
                    ),
            );

            this.questionSummary = this.Question.getQuestionAmounts(exam);
            this.exam = exam;
            this.user = this.Session.getUser();
            this.participation = participation;
            const duration = moment.utc(new Date(this.participation.duration));
            if (duration.second() > 29) {
                duration.add(1, 'minutes');
            }
            this.participation.duration = duration.format();

            this.student = this.participation.user;
            this.enrolment = this.exam.examEnrolments[0];
            this.reservation = this.enrolment.reservation as Reservation;
            if (!this.collaborative) {
                this.http
                    .get<ExamParticipation[]>(`/app/examparticipations/${this.exam.id}`)
                    .subscribe(this.handleParticipations);
            } else {
                this.http
                    .get<ExamParticipation[]>(
                        `/integration/iop/reviews/${this.state.params.id}/participations/${this.state.params.ref}`,
                    )
                    .subscribe(this.handleParticipations);
            }
        });
    }

    private handleParticipations = (data: ExamParticipation[]) => {
        if (this.collaborative) {
            //TODO: Add collaborative support for noshows.
            this.previousParticipations = data;
            this.printPage();
            return;
        }
        // Filter out the participation we are looking into
        const previousParticipations: PreviousParticipation[] = data.filter(p => p.id !== this.participation.id);
        this.http.get<Reservation[]>(`/app/usernoshows/${this.exam.id}`).subscribe(resp => {
            const noShows: PreviousParticipation[] = resp.map(r => ({
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
        $('#vmenu').hide();
        const mainView = $('#mainView');
        mainView.css('margin', '0 15px');
        mainView.css('max-width', '1000px');
        MathJax.Hub.Queue(['Typeset', MathJax.Hub]);
        this.Window.nativeWindow.setTimeout(() => this.Window.nativeWindow.print(), 2000);
    };

    private getResource = (path: string) =>
        this.collaborative ? `/integration/iop/reviews/${path}` : `/app/review/${path}`;

    translateGrade = (participation: ExamParticipation) =>
        !participation.exam.grade ? 'N/A' : this.Exam.getExamGradeDisplayName(participation.exam.grade.name);

    getGrade = () => (!this.exam.grade ? 'N/A' : this.Exam.getExamGradeDisplayName(this.exam.grade.name));

    getCreditType = () => (!this.exam ? 'N/A' : this.Exam.getExamTypeDisplayName(this.exam.examType.type));

    getLanguage = () => {
        if (!this.exam) return 'N/A';
        const lang = this.Assessment.pickExamLanguage(this.exam);
        return !lang ? 'N/A' : this.Language.getLanguageNativeName(lang.code);
    };

    getExamMaxPossibleScore = () => this.Exam.getMaxScore(this.exam);

    getExamTotalScore = () => this.Exam.getTotalScore(this.exam);

    getTeacherCount = () => {
        // Do not add up if user exists in both groups
        const exam = this.collaborative ? this.exam : (this.exam.parent as Exam);
        const owners = exam.examOwners.filter(
            owner => this.exam.examInspections.map(i => i.user.id).indexOf(owner.id) === -1,
        );
        return this.exam.examInspections.length + owners.length;
    };

    translateState = (participation: ExamParticipation) => 'sitnet_exam_status_' + participation.exam.state;
}
