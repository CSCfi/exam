import { NgClass, UpperCasePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import type { ExamInfo } from '../calendar.service';

@Component({
    selector: 'xm-calendar-optional-sections',
    template: `
        <div
            class="row m-2 xm details-view"
            [ngClass]="sectionSelectionOk() ? 'xm-study-item-container' : 'xm-study-item-container--inactive'"
        >
            <span class="col-md-12">
                <h2 class="calendar-phase-title">2. {{ 'i18n_exam_materials' | translate }}</h2>
                @if (sectionSelectionOk()) {
                    <span class="calendar-phase-icon float-end">
                        <img class="arrow_icon" src="/assets/images/icon-phase.png" alt="" />
                    </span>
                }
            </span>
            @for (section of examInfo.examSections; track section.id) {
                <div>
                    <div class="row">
                        <div class="col-md-12">
                            <div class="row">
                                <div class="col-md-6">
                                    <strong>{{ 'i18n_exam_section' | translate }}:</strong> {{ section.name }}
                                </div>
                                <div class="col-md-6">
                                    @if (section.optional) {
                                        <div class="text text-success">
                                            {{ 'i18n_optional_section' | translate | uppercase }}
                                        </div>
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="row mb-3">
                        <div class="col-md-12">
                            <div class="row">
                                <div class="col-md-6">
                                    {{ section.description }}
                                </div>
                                <div class="col-md-6">
                                    @if (section.optional) {
                                        <div class="form-check">
                                            <input
                                                class="form-check-input"
                                                type="checkbox"
                                                value=""
                                                [(ngModel)]="section.selected"
                                                id="check1"
                                                (ngModelChange)="checkSectionSelections()"
                                            />
                                            <label class="form-check-label" for="check1">
                                                {{ 'i18n_select_optional_section' | translate }}
                                            </label>
                                        </div>
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                    @if (section.examMaterials.length > 0) {
                        <div class="row">
                            <div class="col-md-12">
                                <strong>{{ 'i18n_exam_materials' | translate }}</strong>
                            </div>
                        </div>
                    }
                    @for (material of section.examMaterials; track material.id) {
                        <div class="row">
                            <span class="col-md-12">
                                {{ 'i18n_name' | translate | uppercase }}: {{ material.name }}
                                @if (material.author) {
                                    <span> {{ 'i18n_author' | translate | uppercase }}: {{ material.author }} </span>
                                }
                                @if (material.isbn) {
                                    <span> ISBN: {{ material.isbn }} </span>
                                }
                            </span>
                        </div>
                    }
                </div>
            }
        </div>
    `,
    styleUrls: ['../calendar.component.scss'],
    standalone: true,
    imports: [NgClass, FormsModule, UpperCasePipe, TranslateModule],
})
export class OptionalSectionsComponent {
    @Input() examInfo!: ExamInfo;
    @Output() selected = new EventEmitter<{ valid: boolean }>();

    checkSectionSelections = () => this.selected.emit({ valid: this.sectionSelectionOk() });

    sectionSelectionOk = () => this.examInfo.examSections.some((es) => !es.optional || es.selected);
}
