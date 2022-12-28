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
import type { OnInit } from '@angular/core';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import type { Exam, ExamFeedbackConfig } from '../../exam.model';

type ReleaseType = { name: string; translation: string; filtered?: boolean };

type ExamFeedbackConfigTemplate = {
    enabled: boolean;
    releaseTypes: ReleaseType[];
};

@Component({
    selector: 'xm-exam-feedback-config',
    templateUrl: './exam-feedback-config.component.html',
})
export class ExamFeedbackConfigComponent implements OnInit {
    @Input() exam!: Exam;
    @Input() modifiable: 'everything' | 'nothing' | 'date' = 'nothing';
    @Output() enabled = new EventEmitter<void>();
    @Output() disabled = new EventEmitter<void>();
    @Output() updated = new EventEmitter<{ config: ExamFeedbackConfig }>();

    examFeedbackConfig: ExamFeedbackConfigTemplate;
    config?: ExamFeedbackConfig;
    examFeedbackConfigDisplay: { visible: boolean };

    constructor() {
        this.examFeedbackConfig = {
            enabled: false,
            releaseTypes: [
                {
                    name: 'ONCE_LOCKED',
                    translation: 'sitnet_release_type_once_locked',
                    filtered: true,
                },
                { name: 'GIVEN_DATE', translation: 'sitnet_feedback_config_release_type_date' },
            ],
        };
        this.examFeedbackConfigDisplay = { visible: false };
    }

    ngOnInit() {
        this.prepareExamFeedbackConfig();
    }

    disable = () => {
        if (this.modifiable === 'everything') {
            this.examFeedbackConfig.enabled = false;
            this.disabled.emit();
        }
    };

    enable = () => {
        if (this.modifiable === 'everything') {
            this.examFeedbackConfig.enabled = true;
            this.enabled.emit();
            if (this.config) {
                this.updated.emit({ config: this.config });
            }
        }
    };

    applyFilter = (type?: ReleaseType) => {
        if (!this.config) return;
        this.examFeedbackConfig.releaseTypes.forEach((rt) => (rt.filtered = false));
        if (type) {
            type.filtered = !type.filtered;
        }
        const rt = this.selectedReleaseType();
        this.config.releaseType = rt ? rt.name : undefined;
        this.updated.emit({ config: this.config });
    };

    selectedReleaseType = () =>
        this.availableReleaseTypes().find((rt) => rt.filtered) || this.examFeedbackConfig.releaseTypes[0];

    releaseDateChanged = (event: { date: Date | null }) => {
        if (!this.config) return;
        this.config.releaseDate = event.date;
        this.updated.emit({ config: this.config });
    };
    availableReleaseTypes = () => {
        if (this.modifiable === 'date') return [this.examFeedbackConfig.releaseTypes[1]];
        else return this.examFeedbackConfig.releaseTypes;
    };

    private prepareExamFeedbackConfig = () => {
        this.examFeedbackConfig.enabled = !!this.exam.examFeedbackConfig;
        if (!this.exam.examFeedbackConfig) {
            const releaseType = this.selectedReleaseType();
            this.config = {
                releaseType: releaseType ? releaseType.name : this.examFeedbackConfig.releaseTypes[0].name,
                releaseDate: null,
            };
        }
        if (this.exam.examFeedbackConfig) {
            this.config = this.exam.examFeedbackConfig;
            const rt = this.getReleaseTypeByName(this.config.releaseType);
            this.applyFilter(rt);
        }
    };

    private getReleaseTypeByName = (name?: string) =>
        this.examFeedbackConfig.releaseTypes.find((rt) => rt.name === name);
}
