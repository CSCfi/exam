// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { LowerCasePipe, UpperCasePipe } from '@angular/common';
import { Component, computed, input, signal } from '@angular/core';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ExamSection } from 'src/app/exam/exam.model';

@Component({
    selector: 'xm-optional-sections',
    imports: [NgbCollapse, TranslateModule, LowerCasePipe, UpperCasePipe],
    template: `
        <div class="xm-stack xm-gap-2">
            <button
                class="btn btn-outline-secondary toggle"
                (click)="showSections.set(!showSections())"
                [ariaExpanded]="showSections()"
            >
                {{ 'i18n_selected_sections' | translate }}
                <i [hidden]="showSections()" class="bi bi-chevron-right ms-1" aria-hidden="true"></i>
                <i [hidden]="!showSections()" class="bi bi-chevron-down ms-1" aria-hidden="true"></i>
            </button>
            <div [ngbCollapse]="!showSections()">
                <div class="xm-stack">
                    @for (section of sections(); track section.id) {
                        <div class="xm-stack xm-gap-1">
                            <p>
                                <strong
                                    >{{ 'i18n_exam_section' | translate }}
                                    @if (section.optional) {
                                        <small class="text xm-text-success"
                                            >({{ 'i18n_optional' | translate | lowercase }})</small
                                        >
                                    } @else {
                                        <small class="text xm-text-danger"
                                            >({{ 'i18n_required' | translate | lowercase }})</small
                                        >
                                    }
                                    :</strong
                                >
                                {{ section.name }}
                            </p>
                            <p>{{ section.description }}</p>
                            @if (section.optional && section.examMaterials.length > 0) {
                                <p>
                                    <strong>{{ 'i18n_exam_materials' | translate }}</strong>
                                </p>
                                @for (material of section.examMaterials; track material.id) {
                                    <p>
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
                                    </p>
                                }
                            }
                        </div>
                    }
                </div>
            </div>
        </div>
    `,
    styles: `
        /* A stack stretches its children; keep the button as wide as its text */
        .toggle {
            align-self: start;
        }
    `,
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
