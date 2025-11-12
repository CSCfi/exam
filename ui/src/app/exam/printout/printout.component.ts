// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { map } from 'rxjs/operators';
import type { Exam, ExamLanguage } from 'src/app/exam/exam.model';
import { ClozeTestAnswer, ExamSectionQuestion } from 'src/app/question/question.model';
import { Attachment } from 'src/app/shared/attachment/attachment.model';
import { FileService } from 'src/app/shared/file/file.service';
import { MathJaxDirective } from 'src/app/shared/math/mathjax.directive';
import { CourseCodeComponent } from 'src/app/shared/miscellaneous/course-code.component';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { TeacherListComponent } from 'src/app/shared/user/teacher-list.component';

type Printout = Omit<Exam, 'examLanguages'> & { examLanguages: (ExamLanguage & { ord: number })[] };

@Component({
    selector: 'xm-printout',
    templateUrl: './printout.component.html',
    imports: [CourseCodeComponent, TeacherListComponent, MathJaxDirective, DatePipe, TranslateModule, OrderByPipe],
    styleUrl: './printout.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintoutComponent {
    exam = signal<Printout | undefined>(undefined);
    tab = signal<number | undefined>(undefined);

    private http = inject(HttpClient);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private Files = inject(FileService);

    constructor() {
        const tabParam = this.route.snapshot.queryParams.get('tab');
        if (tabParam) {
            this.tab.set(Number(tabParam));
        }
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
            .subscribe((exam) => this.exam.set(exam));
    }

    getLanguageName(lang: ExamLanguage) {
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
    }

    getQuestionTypeName(esq: ExamSectionQuestion) {
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
    }

    exitPreview() {
        const currentExam = this.exam();
        const currentTab = this.tab();
        if (currentTab && currentExam) {
            this.router.navigate(['/staff/exams', currentExam.id, currentTab]);
        } else {
            this.router.navigate(['/staff/printouts']);
        }
    }

    print() {
        window.print();
    }

    printAttachment() {
        const currentExam = this.exam();
        if (currentExam?.attachment) {
            this.Files.download(
                '/app/attachment/exam/' + currentExam.id,
                (currentExam.attachment as Attachment).fileName,
            );
        }
    }
}
