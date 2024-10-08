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
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { map } from 'rxjs/operators';
import type { Attachment, ClozeTestAnswer, Exam, ExamLanguage, ExamSectionQuestion } from 'src/app/exam/exam.model';
import { FileService } from 'src/app/shared/file/file.service';
import { MathJaxDirective } from 'src/app/shared/math/math-jax.directive';
import { CourseCodeComponent } from 'src/app/shared/miscellaneous/course-code.component';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { TeacherListComponent } from 'src/app/shared/user/teacher-list.component';

type Printout = Omit<Exam, 'examLanguages'> & { examLanguages: (ExamLanguage & { ord: number })[] };

@Component({
    selector: 'xm-printout',
    templateUrl: './printout.component.html',
    standalone: true,
    imports: [CourseCodeComponent, TeacherListComponent, MathJaxDirective, DatePipe, TranslateModule, OrderByPipe],
    styleUrl: './printout.component.scss',
})
export class PrintoutComponent implements OnInit {
    exam!: Printout;
    tab?: number;

    constructor(
        private http: HttpClient,
        private router: Router,
        private route: ActivatedRoute,
        private Files: FileService,
    ) {}

    ngOnInit() {
        this.tab = this.route.snapshot.queryParams.get('tab');
        this.http
            .get<Exam>(`/app/exams/${this.route.snapshot.params.id}/preview`)
            .pipe(
                map((exam) => {
                    exam.examSections.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
                    exam.examSections.forEach((es) => {
                        es.sectionQuestions
                            .filter((esq) => esq.question.type === 'ClozeTestQuestion' && esq.clozeTestAnswer?.answer)
                            .forEach(
                                (esq) =>
                                    ((esq.clozeTestAnswer as ClozeTestAnswer).answer = JSON.parse(
                                        (esq.clozeTestAnswer as ClozeTestAnswer).answer,
                                    )),
                            );
                    });
                    return {
                        ...exam,
                        examLanguages: exam.examLanguages.map((l) => ({
                            ...l,
                            ord: ['fi', 'sv', 'en', 'de'].indexOf(l.code),
                        })),
                    };
                }),
            )
            .subscribe((exam) => (this.exam = exam));
    }

    getLanguageName = (lang: ExamLanguage) => {
        // TODO: fixed languages?
        let name;
        switch (lang.code) {
            case 'fi':
                name = 'suomeksi';
                break;
            case 'sv':
                name = 'på svenska';
                break;
            case 'en':
                name = 'in English';
                break;
            case 'de':
                name = 'auf Deutsch';
                break;
        }
        return name;
    };

    getQuestionTypeName = (esq: ExamSectionQuestion) => {
        let name;
        switch (esq.question.type) {
            case 'WeightedMultipleChoiceQuestion':
                name =
                    'Monivalintakysymys (voit valita monta) / Flervalsfråga (du kan välja många) / Multiple choice question (you can pick multiple)';
                break;
            case 'MultipleChoiceQuestion':
                name =
                    'Monivalintakysymys (valitse yksi) / Flervalsfråga (välj en) / Multiple choice question (pick one)';
                break;
            case 'EssayQuestion':
                name = 'Esseekysymys / Essefråga / Essay question';
                break;
            case 'ClozeTestQuestion':
                name = 'Aukkotehtävä / Fyll i det som saknas / Cloze test question';
                break;
            case 'ClaimChoiceQuestion':
                name = 'Väittämä-kysymys / Claim choice question SV / Claim choice question';
        }
        return name;
    };

    exitPreview = () => {
        if (this.tab) {
            this.router.navigate(['/staff/exams', this.exam.id, this.tab]);
        } else {
            this.router.navigate(['/staff/printouts']);
        }
    };

    print = () => window.print();

    printAttachment = () =>
        this.Files.download('/app/attachment/exam/' + this.exam.id, (this.exam.attachment as Attachment).fileName);
}
