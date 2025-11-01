// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, inject, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { NgbAccordionDirective, NgbAccordionModule, NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ExamService } from 'src/app/exam/exam.service';

type ExamConfig = { type: string; name: string; examinationTypes: { type: string; name: string }[] };

@Component({
    imports: [TranslateModule, NgbAccordionModule, NgClass],
    template: `
        <div class="modal-header">
            <h4 class="modal-title"><i class="bi-person"></i>&nbsp;&nbsp;{{ 'i18n_choose' | translate }}</h4>
        </div>
        <div class="modal-body">
            <div ngbAccordion #acc="ngbAccordion">
                <!-- First Panel: Execution Types -->
                <div ngbAccordionItem="executionType">
                    <h2 ngbAccordionHeader>
                        <button ngbAccordionButton>{{ 'i18n_choose_execution_type' | translate }}</button>
                    </h2>
                    <div ngbAccordionCollapse>
                        <div ngbAccordionBody>
                            <ng-template>
                                @for (type of executionTypes; track type) {
                                    @if (type.examinationTypes.length > 0) {
                                        <a
                                            #link
                                            tabindex="0"
                                            class="pointer"
                                            [ngClass]="{ 'selected-type': selectedType === type }"
                                            [attr.aria-current]="selectedType === type ? 'true' : 'false'"
                                            (click)="selectType(type)"
                                            (keydown)="onKeyDown($event, 0)"
                                        >
                                            {{ type.name | translate }}
                                        </a>
                                    }
                                    @if (type.examinationTypes.length === 0) {
                                        <a
                                            #link
                                            tabindex="0"
                                            class="pointer"
                                            (click)="selectConfig(type.type)"
                                            (keydown)="onKeyDown($event, 0)"
                                        >
                                            {{ type.name | translate }}
                                        </a>
                                    }
                                }
                            </ng-template>
                        </div>
                    </div>
                </div>

                <!-- Second Panel: Examination Types -->
                <div
                    ngbAccordionItem="examinationType"
                    [disabled]="!selectedType || selectedType.examinationTypes.length === 0"
                >
                    <h2 ngbAccordionHeader>
                        <button ngbAccordionButton>{{ 'i18n_examination_type' | translate }}</button>
                    </h2>
                    <div ngbAccordionCollapse>
                        <div ngbAccordionBody>
                            <ng-template>
                                @for (et of selectedType?.examinationTypes; track et) {
                                    <a
                                        #link
                                        tabindex="0"
                                        class="pointer"
                                        (click)="selectConfig(selectedType.type, et.type)"
                                        (keydown)="onKeyDown($event, 1)"
                                    >
                                        {{ et.name | translate }}
                                    </a>
                                }
                            </ng-template>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal-footer">
            <button class="btn btn-sm btn-danger" (click)="cancel()">{{ 'i18n_button_cancel' | translate }}</button>
        </div>
    `,
    styles: [
        `
            .selected-type {
                color: black;
                font-weight: bold;
                text-decoration: none;
            }
            a.pointer:focus {
                outline: none;
                font-weight: bold;
                color: black;
            }
        `,
    ],
})
export class ExaminationTypeSelectorComponent implements OnInit {
    @ViewChild('acc', { static: false }) acc!: NgbAccordionDirective;
    @ViewChildren('link') links!: QueryList<ElementRef>;

    executionTypes: ExamConfig[] = [];
    selectedType!: ExamConfig;
    focusedIndex = 0;
    activePanel = 0; // 0 = first panel, 1 = second panel

    private http = inject(HttpClient);
    private modal = inject(NgbActiveModal);
    private Exam = inject(ExamService);

    ngOnInit() {
        this.http
            .get<{ homeExaminationSupported: boolean; sebExaminationSupported: boolean }>('/app/settings/byod')
            .subscribe((resp) => {
                this.Exam.listExecutionTypes$().subscribe((types) => {
                    this.executionTypes = types.map((t) => {
                        const implementations = [];
                        if (t.type !== 'PRINTOUT' && (resp.sebExaminationSupported || resp.homeExaminationSupported)) {
                            implementations.push({ type: 'AQUARIUM', name: 'i18n_examination_type_aquarium' });
                            if (resp.sebExaminationSupported) {
                                implementations.push({ type: 'CLIENT_AUTH', name: 'i18n_examination_type_seb' });
                            }
                            if (resp.homeExaminationSupported) {
                                implementations.push({ type: 'WHATEVER', name: 'i18n_examination_type_home_exam' });
                            }
                        }
                        return { ...t, examinationTypes: implementations };
                    });

                    // Expand first panel and focus first link
                    setTimeout(() => {
                        this.acc.expand('executionType');
                        const firstLinks = this.getCurrentPanelLinks(0);
                        if (firstLinks.length) firstLinks[0].nativeElement.focus();
                    }, 100);
                });
            });
    }

    onKeyDown(event: KeyboardEvent, panelIndex: number) {
        const firstPanelLinks = this.getCurrentPanelLinks(0);
        const secondPanelLinks = this.getCurrentPanelLinks(1);

        let currentLinks = panelIndex === 0 ? firstPanelLinks : secondPanelLinks;

        if (!currentLinks.length) return;

        if (event.key === 'ArrowDown') {
            this.focusedIndex++;

            if (this.focusedIndex >= currentLinks.length) {
                // Move to next panel if exists
                if (panelIndex === 0 && secondPanelLinks.length) {
                    this.focusedIndex = 0;
                    currentLinks = secondPanelLinks;
                    this.activePanel = 1;
                } else {
                    this.focusedIndex = 0; // wrap around in current panel
                }
            }

            currentLinks[this.focusedIndex].nativeElement.focus();
            event.preventDefault();
        } else if (event.key === 'ArrowUp') {
            this.focusedIndex--;

            if (this.focusedIndex < 0) {
                // Move to previous panel if exists
                if (panelIndex === 1 && firstPanelLinks.length) {
                    currentLinks = firstPanelLinks;
                    this.focusedIndex = currentLinks.length - 1;
                    this.activePanel = 0;
                } else {
                    this.focusedIndex = currentLinks.length - 1; // wrap around
                }
            }

            currentLinks[this.focusedIndex].nativeElement.focus();
            event.preventDefault();
        } else if (event.key === 'Enter') {
            currentLinks[this.focusedIndex].nativeElement.click();
            event.preventDefault();
        }
    }

    selectType(type: ExamConfig) {
        this.selectedType = type;
        this.activePanel = 1;

        // Expand second panel
        setTimeout(() => {
            this.acc.expand('examinationType');

            // Focus first link of second panel
            const nextPanelLinks = this.getCurrentPanelLinks(1);
            this.focusedIndex = 0;
            if (nextPanelLinks.length) nextPanelLinks[0].nativeElement.focus();
        }, 100);
    }

    selectConfig(type: string, examinationType = 'AQUARIUM') {
        this.modal.close({ type, examinationType });
    }

    cancel() {
        this.modal.dismiss();
    }

    private getCurrentPanelLinks(panelIndex: number): ElementRef[] {
        const allLinks = this.links.toArray();
        if (panelIndex === 0) {
            return allLinks.slice(0, this.executionTypes.length);
        } else {
            const startIndex = this.executionTypes.length;
            return allLinks.slice(startIndex, allLinks.length);
        }
    }
}
