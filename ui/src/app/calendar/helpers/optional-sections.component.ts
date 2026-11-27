// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { ExamInfo, SelectableSection } from 'src/app/calendar/calendar.model';

@Component({
    selector: 'xm-calendar-optional-sections',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div
            class="row m-2 xm details-view"
            [class.xm-study-item-container]="sectionSelectionOk()"
            [class.xm-study-item-container--inactive]="!sectionSelectionOk()"
        >
            <span class="col-md-12">
                <h2 class="calendar-phase-title">2. {{ 'i18n_exam_materials' | translate }}</h2>
                @if (sectionSelectionOk()) {
                    <span class="calendar-phase-icon float-end">
                        <img class="arrow_icon" src="/assets/images/icon-phase.png" alt="" />
                    </span>
                }
            </span>
            @for (section of examInfo().examSections; track section.id) {
                <div class="col-md-12 mb-3">
                    <div>
                        <strong>{{ 'i18n_exam_section' | translate }}:</strong> {{ section.name }}
                    </div>
                    @if (section.description) {
                        <div class="mt-1">{{ section.description }}</div>
                    }
                    @if (section.optional) {
                        <div class="d-flex flex-wrap align-items-center column-gap-3 row-gap-1 mt-1">
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
                        <div class="mt-1">
                            <strong>{{ 'i18n_exam_materials' | translate }}</strong>
                        </div>
                        @for (material of section.examMaterials; track material.id) {
                            <div>
                                {{ 'i18n_name' | translate | uppercase }}: {{ material.name }}
                                @if (material.author) {
                                    <span> {{ 'i18n_author' | translate | uppercase }}: {{ material.author }} </span>
                                }
                                @if (material.isbn) {
                                    <span> ISBN: {{ material.isbn }} </span>
                                }
                            </div>
                        }
                    }
                </div>
            }
        </div>
    `,
    styleUrls: ['../calendar.component.scss'],
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
