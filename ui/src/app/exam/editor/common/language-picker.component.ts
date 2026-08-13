// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Exam, ExamLanguage } from 'src/app/exam/exam.model';
import { LanguageService } from 'src/app/shared/language/language.service';

@Component({
    selector: 'xm-language-picker',
    template: `<div ngbDropdown>
        <button [disabled]="disabled()" ngbDropdownToggle class="btn btn-outline-dark" type="button" id="ddMenu">
            {{ selectedLanguages() }}&nbsp;
            <span class="caret"></span>
        </button>
        <div ngbDropdownMenu aria-labelledby="ddMenu">
            @for (language of examLanguages(); track language) {
                <button
                    ngbDropdownItem
                    [class.active]="isSelected(language)"
                    (click)="updateExamLanguage(language)"
                    title="{{ language.name }}"
                >
                    {{ language.name }}
                </button>
            }
        </div>
    </div>`,
    imports: [NgbDropdownModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageSelectorComponent {
    readonly exam = input.required<Exam>();
    readonly collaborative = input(false);
    readonly disabled = input(false);
    readonly updated = output<ExamLanguage[]>();

    readonly examLanguages = signal<ExamLanguage[]>([]);

    private readonly http = inject(HttpClient);
    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastrService);
    private readonly Language = inject(LanguageService);

    constructor() {
        this.Language.getExamLanguages$().subscribe((languages: ExamLanguage[]) => {
            this.examLanguages.set(languages);
        });
    }

    selectedLanguages() {
        const currentExam = this.exam();
        const examLanguages = currentExam.examLanguages || [];
        return examLanguages.length === 0
            ? this.translate.instant('i18n_select')
            : examLanguages.map((language) => language.name).join(', ');
    }

    isSelected(lang: ExamLanguage) {
        const currentExam = this.exam();
        const examLanguages = currentExam.examLanguages || [];
        return examLanguages.map((el) => el.code).indexOf(lang.code) > -1;
    }

    updateExamLanguage(lang: ExamLanguage) {
        const currentExam = this.exam();
        const resource = this.collaborative() ? '/app/iop/exams' : '/app/exams';
        this.http.put(`${resource}/${currentExam.id}/language/${lang.code}`, {}).subscribe({
            next: () => {
                const examLanguages = currentExam.examLanguages || [];
                const isCurrentlySelected = examLanguages.some((el) => el.code === lang.code);
                const updatedLanguages = isCurrentlySelected
                    ? examLanguages.filter((el) => el.code !== lang.code)
                    : [...examLanguages, lang];
                this.updated.emit(updatedLanguages);
                this.toast.info(this.translate.instant('i18n_exam_language_updated'));
            },
            error: (err) => this.toast.error(err),
        });
    }
}
