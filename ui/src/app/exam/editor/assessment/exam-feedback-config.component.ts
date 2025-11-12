// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import {
    NgbCollapse,
    NgbDropdown,
    NgbDropdownItem,
    NgbDropdownMenu,
    NgbDropdownToggle,
    NgbPopover,
} from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import type { Exam, ExamFeedbackConfig } from 'src/app/exam/exam.model';
import { DatePickerComponent } from 'src/app/shared/date/date-picker.component';

type ReleaseType = { name: string; translation: string; filtered?: boolean };

type ExamFeedbackConfigTemplate = {
    enabled: boolean;
    releaseTypes: ReleaseType[];
};

@Component({
    selector: 'xm-exam-feedback-config',
    templateUrl: './exam-feedback-config.component.html',
    styleUrls: ['./exam-feedback-config.component.scss'],
    imports: [
        NgbPopover,
        NgbCollapse,
        NgClass,
        NgbDropdown,
        NgbDropdownToggle,
        NgbDropdownMenu,
        NgbDropdownItem,
        DatePickerComponent,
        TranslateModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExamFeedbackConfigComponent {
    exam = input.required<Exam>();
    modifiable = input<'everything' | 'nothing' | 'date'>('nothing');
    enabled = output<void>();
    disabled = output<void>();
    updated = output<{ config: ExamFeedbackConfig }>();

    examFeedbackConfig: ExamFeedbackConfigTemplate;
    config = signal<ExamFeedbackConfig | undefined>(undefined);
    examFeedbackConfigDisplayVisible = signal(false);

    constructor() {
        this.examFeedbackConfig = {
            enabled: false,
            releaseTypes: [
                {
                    name: 'ONCE_LOCKED',
                    translation: 'i18n_release_type_once_locked',
                    filtered: true,
                },
                // CSCEXAM-1127
                //{ name: 'GIVEN_DATE', translation: 'i18n_feedback_config_release_type_date' },
            ],
        };

        effect(() => {
            const currentExam = this.exam();
            if (currentExam) {
                this.prepareExamFeedbackConfig();
            }
        });
    }

    toggleDisplay() {
        this.examFeedbackConfigDisplayVisible.update((v) => !v);
    }

    disable() {
        if (this.modifiable() === 'everything') {
            this.examFeedbackConfig.enabled = false;
            this.disabled.emit();
        }
    }

    enable() {
        if (this.modifiable() === 'everything') {
            this.examFeedbackConfig.enabled = true;
            this.enabled.emit();
            const currentConfig = this.config();
            if (currentConfig) {
                this.updated.emit({ config: currentConfig });
            }
        }
    }

    applyFilter(type?: ReleaseType) {
        const currentConfig = this.config();
        if (!currentConfig) return;
        this.examFeedbackConfig.releaseTypes.forEach((rt) => (rt.filtered = false));
        if (type) {
            type.filtered = !type.filtered;
        }
        const rt = this.selectedReleaseType();
        currentConfig.releaseType = rt ? rt.name : undefined;
        this.config.set({ ...currentConfig });
        this.updated.emit({ config: currentConfig });
    }

    selectedReleaseType() {
        return this.availableReleaseTypes().find((rt) => rt.filtered) || this.examFeedbackConfig.releaseTypes[0];
    }

    releaseDateChanged(event: { date: Date | null }) {
        const currentConfig = this.config();
        if (!currentConfig) return;
        currentConfig.releaseDate = event.date;
        this.config.set({ ...currentConfig });
        this.updated.emit({ config: currentConfig });
    }

    availableReleaseTypes() {
        if (this.modifiable() === 'date') return [this.examFeedbackConfig.releaseTypes[1]];
        else return this.examFeedbackConfig.releaseTypes;
    }

    private prepareExamFeedbackConfig() {
        const currentExam = this.exam();
        this.examFeedbackConfig.enabled = !!currentExam.examFeedbackConfig;
        if (!currentExam.examFeedbackConfig) {
            const releaseType = this.selectedReleaseType();
            this.config.set({
                releaseType: releaseType ? releaseType.name : this.examFeedbackConfig.releaseTypes[0].name,
                releaseDate: null,
            });
        }
        if (currentExam.examFeedbackConfig) {
            this.config.set(currentExam.examFeedbackConfig);
            const currentConfig = this.config();
            if (currentConfig) {
                const rt = this.getReleaseTypeByName(currentConfig.releaseType);
                this.applyFilter(rt);
            }
        }
    }

    private getReleaseTypeByName(name?: string) {
        return this.examFeedbackConfig.releaseTypes.find((rt) => rt.name === name);
    }
}
