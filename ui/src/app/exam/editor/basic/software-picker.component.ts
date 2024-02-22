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
import { NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import type { OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import {
    NgbDropdown,
    NgbDropdownItem,
    NgbDropdownMenu,
    NgbDropdownToggle,
    NgbPopover,
} from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Exam, Software } from '../../exam.model';

@Component({
    selector: 'xm-software-picker',
    template: `<div [hidden]="exam.executionType.type === 'MATURITY'" class="row">
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
                            @for (sw of software; track sw) {
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
    standalone: true,
    imports: [NgbPopover, NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownItem, NgClass, TranslateModule],
})
export class SoftwareSelectorComponent implements OnInit {
    @Input() exam!: Exam;

    software: Software[] = [];

    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private toast: ToastrService,
    ) {}

    ngOnInit() {
        this.exam.softwares ||= [];
        this.http.get<Software[]>('/app/softwares').subscribe((data) => (this.software = data));
    }

    selectedSoftware = () =>
        this.exam.softwares.length === 0
            ? this.translate.instant('i18n_select')
            : this.exam.softwares.map((s) => s.name).join(', ');

    isSelected = (sw: Software) => this.exam.softwares.some((es) => es.id === sw.id);

    updateExamSoftware = (sw: Software) => {
        this.http.put(`/app/exam/${this.exam.id}/software/${sw.id}`, {}).subscribe({
            next: () => {
                if (this.isSelected(sw)) {
                    const index = this.exam.softwares.map((es) => es.id).indexOf(sw.id);
                    this.exam.softwares.splice(index, 1);
                } else {
                    this.exam.softwares.push(sw);
                }
                this.toast.info(this.translate.instant('i18n_exam_software_updated'));
            },
            error: (err) => this.toast.error(err),
        });
    };
}
