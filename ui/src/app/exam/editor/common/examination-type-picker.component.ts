// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { NgbAccordionDirective, NgbAccordionModule, NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ExamService } from 'src/app/exam/exam.service';

type ExamConfig = { type: string; name: string; examinationTypes: { type: string; name: string }[] };

@Component({
    imports: [TranslateModule, NgbAccordionModule, NgClass],
    template: `
        <div class="modal-header">
            <h4 class="modal-title">
                <i class="bi-person me-2" aria-hidden="true"></i>{{ 'i18n_choose' | translate }}
            </h4>
        </div>
        <div class="modal-body">
            <div ngbAccordion #acc="ngbAccordion">
                <div ngbAccordionItem="executionType">
                    <h2 ngbAccordionHeader>
                        <button ngbAccordionButton>
                            {{ 'i18n_choose_execution_type' | translate }}
                        </button>
                    </h2>
                    <div ngbAccordionCollapse>
                        <div ngbAccordionBody>
                            <ng-template>
                                @for (type of executionTypes; track type) {
                                    <div>
                                        @if (type.examinationTypes.length > 0) {
                                            <button
                                                type="button"
                                                class="btn btn-link"
                                                [ngClass]="{ 'selected-type': selectedType === type }"
                                                [attr.aria-pressed]="selectedType === type"
                                                (click)="selectType(type)"
                                                autofocus
                                            >
                                                {{ type.name | translate }}
                                            </button>
                                        }
                                        @if (type.examinationTypes.length === 0) {
                                            <button
                                                type="button"
                                                class="btn btn-link"
                                                (click)="selectConfig(type.type)"
                                            >
                                                {{ type.name | translate }}
                                            </button>
                                        }
                                    </div>
                                }
                            </ng-template>
                        </div>
                    </div>
                </div>
                <div
                    ngbAccordionItem="examinationType"
                    #examTypePanel
                    [disabled]="!selectedType || selectedType.examinationTypes.length === 0"
                >
                    <h2 ngbAccordionHeader>
                        <button ngbAccordionButton>
                            {{ 'i18n_examination_type' | translate }}
                        </button>
                    </h2>
                    <div ngbAccordionCollapse>
                        <div ngbAccordionBody>
                            <ng-template>
                                @for (et of selectedType.examinationTypes; track et) {
                                    <div>
                                        <button
                                            type="button"
                                            class="btn btn-link"
                                            (click)="selectConfig(selectedType.type, et.type)"
                                        >
                                            {{ et.name | translate }}
                                        </button>
                                    </div>
                                }
                            </ng-template>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-sm btn-danger" (click)="cancel()">
                {{ 'i18n_button_cancel' | translate }}
            </button>
        </div>
    `,
    styles: [
        `
            .selected-type {
                color: black;
                font-weight: bold;
                text-decoration: none;
            }
        `,
    ],
})
export class ExaminationTypeSelectorComponent implements OnInit {
    @ViewChild('acc', { static: false }) acc!: NgbAccordionDirective;
    @ViewChild('examTypePanel', { read: ElementRef }) examTypePanel!: ElementRef;
    executionTypes: ExamConfig[] = [];
    selectedType!: ExamConfig;

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
                });
                this.acc.expand('executionType');
            });
    }

    selectType = (type: ExamConfig) => {
        this.selectedType = type;
        setTimeout(() => {
            this.acc.expand('examinationType');
            const body = this.examTypePanel?.nativeElement?.querySelector('.accordion-body');
            const firstButton = body?.querySelector('button');
            if (firstButton instanceof HTMLElement) firstButton.focus();
        }, 100);
    };

    selectConfig = (type: string, examinationType = 'AQUARIUM') =>
        this.modal.close({ type: type, examinationType: examinationType });

    cancel = () => this.modal.dismiss();
}
