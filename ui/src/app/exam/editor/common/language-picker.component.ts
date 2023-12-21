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
import type { OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { LanguageService } from '../../../shared/language/language.service';
import type { Exam, ExamLanguage } from '../../exam.model';

@Component({
    selector: 'xm-language-picker',
    template: `<div ngbDropdown>
        <button [disabled]="disabled" ngbDropdownToggle class="btn btn-outline-dark" type="button" id="ddMenu">
            {{ selectedLanguages() }}&nbsp;
            <span class="caret"></span>
        </button>
        <div ngbDropdownMenu aria-labelledby="ddMenu">
            <button
                ngbDropdownItem
                *ngFor="let language of examLanguages"
                [ngClass]="isSelected(language) ? 'active' : ''"
                (click)="updateExamLanguage(language)"
                title="{{ language.name }}"
            >
                {{ language.name }}
            </button>
        </div>
    </div> `,
})
export class LanguageSelectorComponent implements OnInit {
    @Input() exam!: Exam;
    @Input() collaborative = false;
    @Input() disabled = false;

    examLanguages: ExamLanguage[] = [];

    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private toast: ToastrService,
        private Language: LanguageService,
    ) {}

    ngOnInit() {
        this.Language.getExamLanguages$().subscribe((languages: ExamLanguage[]) => {
            this.examLanguages = languages;
        });
    }

    selectedLanguages = () =>
        this.exam.examLanguages.length === 0
            ? this.translate.instant('i18n_select')
            : this.exam.examLanguages.map((language) => language.name).join(', ');

    isSelected = (lang: ExamLanguage) => this.exam.examLanguages.map((el) => el.code).indexOf(lang.code) > -1;

    updateExamLanguage = (lang: ExamLanguage) => {
        const resource = this.collaborative ? '/app/iop/exams' : '/app/exams';
        this.http.put(`${resource}/${this.exam.id}/language/${lang.code}`, {}).subscribe({
            next: () => {
                if (this.isSelected(lang)) {
                    const index = this.exam.examLanguages.map((el) => el.code).indexOf(lang.code);
                    this.exam.examLanguages.splice(index, 1);
                } else {
                    this.exam.examLanguages.push(lang);
                }
                this.toast.info(this.translate.instant('i18n_exam_language_updated'));
            },
            error: (err) => this.toast.error(err),
        });
    };
}
