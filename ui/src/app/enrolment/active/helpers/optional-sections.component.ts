// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { LowerCasePipe, UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ExamSection } from 'src/app/exam/exam.model';

@Component({
    selector: 'xm-optional-sections',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgbCollapse, TranslateModule, LowerCasePipe, UpperCasePipe],
    template: `<div class="row mt-2 enrollment-card-dropdown">
        <div class="col col-md-12">
            <button
                class="btn btn-outline-secondary"
                (click)="showSections.set(!showSections())"
                [ariaExpanded]="showSections()"
            >
                {{ 'i18n_selected_sections' | translate }}
                <i [hidden]="showSections()" class="bi bi-chevron-right ms-1" aria-hidden="true"></i>
                <i [hidden]="!showSections()" class="bi bi-chevron-down ms-1" aria-hidden="true"></i>
            </button>

            <div class="pt-2" [ngbCollapse]="!showSections()">
                @for (section of sections(); track section.id) {
                    <div class="mb-3">
                        <div class="row">
                            <div class="col">
                                <strong
                                    >{{ 'i18n_exam_section' | translate }}
                                    @if (section.optional) {
                                        <small class="text text-success"
                                            >({{ 'i18n_optional' | translate | lowercase }})</small
                                        >
                                    } @else {
                                        <small class="text text-danger"
                                            >({{ 'i18n_required' | translate | lowercase }})</small
                                        >
                                    }
                                    :</strong
                                >
                                {{ section.name }}
                            </div>
                        </div>
                        <div class="row">
                            <div class="col">
                                {{ section.description }}
                            </div>
                        </div>
                        @if (section.optional && section.examMaterials.length > 0) {
                            <div class="row">
                                <div class="col">
                                    <strong>{{ 'i18n_exam_materials' | translate }}</strong>
                                </div>
                            </div>
                            @for (material of section.examMaterials; track material.id) {
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
                            }
                        }
                    </div>
                }
            </div>
        </div>
    </div>`,
})
export class OptionalSectionsComponent {
    readonly allSections = input.required<ExamSection[]>();
    readonly selectedSections = input.required<ExamSection[]>();
    readonly showSections = signal(false);

    // Required sections and the optional ones the student picked, in the order they appear in the exam
    readonly sections = computed(() =>
        [...this.allSections().filter((s) => !s.optional), ...this.selectedSections()].sort(
            (a, b) => a.sequenceNumber - b.sequenceNumber,
        ),
    );
}
