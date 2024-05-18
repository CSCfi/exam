// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import type { OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import { NgbDropdown, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Exam, ExamLanguage } from 'src/app/exam/exam.model';
import { LanguageService } from 'src/app/shared/language/language.service';

@Component({
    selector: 'xm-language-picker',
    template: `<div ngbDropdown>
        <button [disabled]="disabled" ngbDropdownToggle class="btn btn-outline-dark" type="button" id="ddMenu">
            {{ selectedLanguages() }}&nbsp;
            <span class="caret"></span>
        </button>
        <div ngbDropdownMenu aria-labelledby="ddMenu">
            @for (language of examLanguages; track language) {
                <button
                    ngbDropdownItem
                    [ngClass]="isSelected(language) ? 'active' : ''"
                    (click)="updateExamLanguage(language)"
                    title="{{ language.name }}"
                >
                    {{ language.name }}
                </button>
            }
        </div>
    </div>`,
    standalone: true,
    imports: [NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownItem, NgClass],
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
