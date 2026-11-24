// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { UpperCasePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { ExamInfo, SelectableSection } from 'src/app/calendar/calendar.model';

@Component({
    selector: 'xm-calendar-optional-sections',
    template: `
        <section
            class="xm-stack"
            [class.xm-study-item-container]="sectionSelectionOk()"
            [class.xm-study-item-container--inactive]="!sectionSelectionOk()"
        >
            <header class="xm-split">
                <h2 class="calendar-phase-title">2. {{ 'i18n_exam_materials' | translate }}</h2>
                @if (sectionSelectionOk()) {
                    <img class="arrow_icon" src="/assets/images/icon-phase.png" alt="" />
                }
            </header>
            @for (section of examInfo().examSections; track section.id) {
                <div class="xm-stack xm-gap-1">
                    <p>
                        <strong>{{ 'i18n_exam_section' | translate }}:</strong> {{ section.name }}
                    </p>
                    @if (section.description) {
                        <p>{{ section.description }}</p>
                    }
                    @if (section.optional) {
                        <div class="xm-cluster section-choice">
                            <div class="text text-success">
                                {{ 'i18n_optional_section' | translate | uppercase }}
                            </div>
                            <div class="form-check mb-0">
                                <input
                                    class="form-check-input"
                                    type="checkbox"
                                    [checked]="section.selected"
                                    [id]="'optional-section-' + section.id"
                                    (change)="onSectionSelectedChange(section, $event)"
                                />
                                <label class="form-check-label" [for]="'optional-section-' + section.id">
                                    {{ 'i18n_select_optional_section' | translate }}
                                </label>
                            </div>
                        </div>
                    }
                    @if (section.examMaterials.length > 0) {
                        <p>
                            <strong>{{ 'i18n_exam_materials' | translate }}</strong>
                        </p>
                        @for (material of section.examMaterials; track material.id) {
                            <p>
                                {{ 'i18n_name' | translate | uppercase }}: {{ material.name }}
                                @if (material.author) {
                                    <span> {{ 'i18n_author' | translate | uppercase }}: {{ material.author }} </span>
                                }
                                @if (material.isbn) {
                                    <span> ISBN: {{ material.isbn }} </span>
                                }
                            </p>
                        }
                    }
                </div>
            }
        </section>
    `,
    styleUrls: ['../calendar.component.scss'],
    styles: `
        .section-choice {
            gap: var(--xm-space-1) var(--xm-space-3);
        }
    `,
    imports: [UpperCasePipe, TranslateModule],
})
export class OptionalSectionsComponent {
    readonly examInfo = input.required<ExamInfo>();
    readonly selected = output<{ valid: boolean }>();

    onSectionSelectedChange = (section: SelectableSection, event: Event) => {
        section.selected = (event.target as HTMLInputElement).checked;
        this.checkSectionSelections();
    };

    checkSectionSelections() {
        this.selected.emit({ valid: this.sectionSelectionOk() });
    }

    sectionSelectionOk(): boolean {
        return this.examInfo().examSections.some((es) => !es.optional || es.selected);
    }
}
