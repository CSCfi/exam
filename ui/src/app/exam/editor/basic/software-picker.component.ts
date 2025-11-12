// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import {
    NgbDropdown,
    NgbDropdownItem,
    NgbDropdownMenu,
    NgbDropdownToggle,
    NgbPopover,
} from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Exam } from 'src/app/exam/exam.model';
import { Software } from 'src/app/facility/facility.model';

@Component({
    selector: 'xm-software-picker',
    template: `<div [hidden]="exam().executionType.type === 'MATURITY'" class="row">
        <div class="col-md-12 mt-3">
            <div class="row">
                <div class="col-md-3 ">
                    {{ 'i18n_machine_softwares' | translate }}
                    <sup
                        ngbPopover="{{ 'i18n_exam_software_description' | translate }}"
                        popoverTitle="{{ 'i18n_instructions' | translate }}"
                        triggers="mouseenter:mouseleave"
                    >
                        <img src="/assets/images/icon_tooltip.svg" alt="" />
                    </sup>
                </div>
                <div class="col-md-9">
                    <div ngbDropdown>
                        <button
                            ngbDropdownToggle
                            class="btn btn-outline-dark"
                            type="button"
                            id="dropDownMenu1"
                            aria-expanded="true"
                        >
                            {{ selectedSoftware() }}&nbsp;<span class="caret"></span>
                        </button>
                        <div ngbDropdownMenu role="menu" aria-labelledby="dropDownMenu1">
                            @for (sw of software(); track sw) {
                                <button
                                    ngbDropdownItem
                                    role="presentation"
                                    [ngClass]="isSelected(sw) ? 'active' : ''"
                                    (click)="updateExamSoftware(sw)"
                                    title="{{ sw.name }}"
                                >
                                    {{ sw.name }}
                                </button>
                            }
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>`,
    imports: [NgbPopover, NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownItem, NgClass, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SoftwareSelectorComponent {
    exam = input.required<Exam>();
    updated = output<Software[]>();

    software = signal<Software[]>([]);

    private http = inject(HttpClient);
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);

    constructor() {
        this.http.get<Software[]>('/app/softwares').subscribe((data) => this.software.set(data));
    }

    selectedSoftware() {
        const currentExam = this.exam();
        const softwares = currentExam.softwares || [];
        return softwares.length === 0 ? this.translate.instant('i18n_select') : softwares.map((s) => s.name).join(', ');
    }

    isSelected(sw: Software) {
        const currentExam = this.exam();
        const softwares = currentExam.softwares || [];
        return softwares.some((es) => es.id === sw.id);
    }

    updateExamSoftware(sw: Software) {
        const currentExam = this.exam();
        this.http.put(`/app/exam/${currentExam.id}/software/${sw.id}`, {}).subscribe({
            next: () => {
                const softwares = currentExam.softwares || [];
                let updatedSoftwares: Software[];
                if (this.isSelected(sw)) {
                    updatedSoftwares = softwares.filter((es) => es.id !== sw.id);
                } else {
                    updatedSoftwares = [...softwares, sw];
                }
                this.updated.emit(updatedSoftwares);
                this.toast.info(this.translate.instant('i18n_exam_software_updated'));
            },
            error: (err) => this.toast.error(err),
        });
    }
}
