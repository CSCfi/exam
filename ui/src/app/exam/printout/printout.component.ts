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
import { Component } from '@angular/core';
import { StateService, UIRouterGlobals } from '@uirouter/core';
import { map } from 'rxjs/operators';

import { FileService } from '../../utility/file/file.service';
import { WindowRef } from '../../utility/window/window.service';

import type { Attachment, ClozeTestAnswer, Exam, ExamLanguage, ExamSectionQuestion } from '../exam.model';

type Printout = Omit<Exam, 'examLanguages'> & { examLanguages: (ExamLanguage & { ord: number })[] };

@Component({
    selector: 'printout',
    templateUrl: './printout.component.html',
})
export class PrintoutComponent {
    exam: Printout;
    constructor(
        private http: HttpClient,
        private state: StateService,
        private routing: UIRouterGlobals,
        private Window: WindowRef,
        private Files: FileService,
    ) {}

    ngOnInit() {
        this.http
            .get<Exam>(`/app/exams/${this.routing.params.id}/preview`)
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
        const tab = parseInt(this.routing.params.tab);
        if (tab == 1) {
            this.state.go('staff.examEditor.basic', { id: this.exam.id, collaborative: false });
        } else if (tab == 2) {
            this.state.go('staff.examEditor.sections', { id: this.exam.id, collaborative: false });
        } else if (tab == 3) {
            this.state.go('staff.examEditor.publication', { id: this.exam.id, collaborative: false });
        } else if (tab == 4) {
            this.state.go('staff.examEditor.assessments', { id: this.exam.id, collaborative: false });
        } else {
            this.state.go('staff.printouts');
        }
    };

    print = () => this.Window.nativeWindow.print();

    printAttachment = () =>
        this.Files.download(
            '/app/attachment/exam/' + this.routing.params.id,
            (this.exam.attachment as Attachment).fileName,
        );
}
