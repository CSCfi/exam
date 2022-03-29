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
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { WindowRef } from '../../utility/window/window.service';
import type { Examination, ExaminationSection } from '../examination.model';
import { ExaminationService } from '../examination.service';

@Component({
    selector: 'examination-section',
    templateUrl: './examinationSection.component.html',
})
export class ExaminationSectionComponent implements OnInit, OnDestroy {
    @Input() exam!: Examination;
    @Input() section!: ExaminationSection;
    @Input() index?: number;
    @Input() isPreview = false;
    @Input() isCollaborative = false;

    autosaver?: number;

    constructor(private Examination: ExaminationService, private Window: WindowRef) {}

    ngOnInit() {
        this.resetAutosaver();
    }

    ngOnDestroy() {
        this.cancelAutosaver();
    }

    getSectionMaxScore = () => this.Examination.getSectionMaxScore(this.section);

    getAmountOfSelectionEvaluatedQuestions = () =>
        this.section.sectionQuestions.filter((esq) => esq.evaluationType === 'Selection').length;

    private resetAutosaver = () => {
        this.cancelAutosaver();
        if (this.section && !this.isPreview) {
            this.autosaver = this.Window.nativeWindow.setInterval(
                () =>
                    this.Examination.saveAllTextualAnswersOfSection$(
                        this.section,
                        this.exam.hash,
                        true,
                        false,
                        false,
                    ).subscribe(),
                1000 * 60,
            );
        }
    };

    private cancelAutosaver = () => {
        if (this.autosaver) {
            this.Window.nativeWindow.clearInterval(this.autosaver);
            delete this.autosaver;
        }
    };
}
