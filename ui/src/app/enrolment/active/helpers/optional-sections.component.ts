// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { LowerCasePipe, UpperCasePipe } from '@angular/common';
import { Component, input, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ExamSection } from 'src/app/exam/exam.model';

@Component({
    selector: 'xm-optional-sections',
    imports: [TranslateModule, LowerCasePipe, UpperCasePipe],
    template: `<div class="row mt-2 enrollment-card-dropdown">
        <div class="col col-md-12">
            <button
                class="btn btn-outline-secondary"
                (click)="showSections.set(!showSections())"
                (keydown.enter)="showSections.set(!showSections())"
                [attr.aria-expanded]="showSections()"
            >
                {{ 'i18n_selected_sections' | translate }}
                <img class="arrow_icon" [hidden]="showSections()" alt="" src="/assets/images/arrow_right.png" />
                <img class="arrow_icon" [hidden]="!showSections()" alt="" src="/assets/images/arrow_down.png" />
            </button>

            <div class="pt-2" [hidden]="!showSections()">
                @for (section of allSections(); track section.id) {
                    <div class="mb-3">
                        @if (section.optional === false) {
                            <div class="row">
                                <div class="col">
                                    <strong
                                        >{{ 'i18n_exam_section' | translate }}
                                        <small class="text text-danger"
                                            >({{ 'i18n_required' | translate | lowercase }})</small
                                        >:</strong
                                    >
                                    {{ section.name }}
                                </div>
                            </div>
                            <div class="row">
                                <div class="col">
                                    {{ section.description }}
                                </div>
                            </div>
                        }
                    </div>
                }
                @for (section of selectedSections(); track section.id) {
                    <div class="mb-3">
                        <div class="row">
                            <div class="col">
                                <strong
                                    >{{ 'i18n_exam_section' | translate }}
                                    <small class="text text-success"
                                        >({{ 'i18n_optional' | translate | lowercase }})</small
                                    >:</strong
                                >
                                {{ section.name }}
                            </div>
                        </div>
                        <div class="row">
                            <div class="col">
                                {{ section.description }}
                            </div>
                        </div>
                        @if (section.examMaterials.length > 0) {
                            <div>
                                <div class="row">
                                    <div class="col">
                                        <strong>{{ 'i18n_exam_materials' | translate }}</strong>
                                    </div>
                                </div>
                                @for (material of section.examMaterials; track material.id) {
                                    <div>
                                        <div class="row">
                                            <span class="col">
                                                {{ 'i18n_name' | translate | uppercase }}: {{ material.name }}
                                                @if (material.author) {
                                                    <span>
                                                        {{ 'i18n_author' | translate | uppercase }}:
                                                        {{ material.author }}
                                                    </span>
                                                }
                                                @if (material.isbn) {
                                                    <span> ISBN: {{ material.isbn }} </span>
                                                }
                                            </span>
                                        </div>
                                    </div>
                                }
                            </div>
                        }
                    </div>
                }
            </div>
        </div>
    </div>`,
})
export class OptionalSectionsComponent {
    allSections = input.required<ExamSection[]>();
    selectedSections = input.required<ExamSection[]>();
    showSections = signal(false);
}
