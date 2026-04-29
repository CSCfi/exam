// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, linkedSignal, signal } from '@angular/core';
import { NgbDropdownModule, NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ExamTabService } from 'src/app/exam/editor/exam-tabs.service';
import type { Exam } from 'src/app/exam/exam.model';

type Organisation = {
    _id: string;
    name: string;
    code: string;
    filtered: boolean;
    homeOrg: string;
};

@Component({
    selector: 'xm-exam-organisation-selector',
    template: `<div class="row mt-2">
            <div class="col-md-3 ">
                {{ 'i18n_exam_organisations' | translate }}
                <sup
                    ngbPopover="{{ 'i18n_exam_organisations_description' | translate }}"
                    popoverTitle="{{ 'i18n_instructions' | translate }}"
                    triggers="mouseenter:mouseleave"
                >
                    <img src="/assets/images/icon_tooltip.svg" alt="exam organisations" />
                </sup>
            </div>
            <div class="col-md-9" ngbDropdown>
                <button
                    ngbDropdownToggle
                    [disabled]="exam().state === 'PUBLISHED'"
                    class="btn btn-outline-dark"
                    type="button"
                    id="dd1"
                    aria-haspopup="true"
                    aria-expanded="true"
                >
                    {{ 'i18n_faculty_name' | translate }}&nbsp;
                </button>
                <ul ngbDropdownMenu role="menu" aria-labelledby="dd1">
                    @for (org of organisations(); track org) {
                        <li role="presentation">
                            <button
                                [disabled]="org.filtered"
                                ngbDropdownItem
                                (click)="addOrganisation(org)"
                                role="menuitem"
                            >
                                {{ org.code }} ({{ org.name }})
                            </button>
                        </li>
                    }
                </ul>
            </div>
        </div>
        @if (selectedOrganisations().length > 0) {
            <div class="row mt-2">
                <div class="col-md-9 offset-md-3">
                    @for (org of selectedOrganisations(); track org) {
                        {{ org.name }} ({{ org.code }})
                        <button
                            class="btn btn-sm btn-link px-0"
                            [disabled]="exam().state === 'PUBLISHED'"
                            (click)="removeOrganisation(org)"
                            [ariaLabel]="'i18n_remove' | translate"
                            title="{{ 'i18n_remove' | translate }}"
                        >
                            <i
                                class="bi bi-x-lg"
                                [class.text-danger]="exam().state === 'PUBLISHED'"
                                [class.text-success]="exam().state !== 'PUBLISHED'"
                                aria-hidden="true"
                            ></i>
                        </button>
                    }
                </div>
            </div>
        }`,
    imports: [NgbPopover, NgbDropdownModule, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganisationSelectorComponent {
    readonly exam = input.required<Exam>();

    readonly selectedOrganisations = linkedSignal<Organisation[]>(() => {
        const all = this.allOrganisations();
        const exam = this.exam();
        return all.filter((o) => exam.organisations?.split(';').includes(o._id));
    });
    readonly organisations = linkedSignal<Organisation[]>(() => {
        const all = this.allOrganisations();
        const selectedIds = new Set(this.exam().organisations?.split(';') ?? []);
        return all.map((o) => ({ ...o, filtered: selectedIds.has(o._id) }));
    });

    private readonly allOrganisations = signal<Organisation[]>([]);
    private readonly http = inject(HttpClient);
    private readonly examTabService = inject(ExamTabService);

    constructor() {
        this.http.get<Organisation[]>('/app/iop/organisations').subscribe((resp) => {
            this.allOrganisations.set(resp.filter((org) => !org.homeOrg));
        });
    }

    addOrganisation(organisation: Organisation) {
        const currentExam = this.exam();
        let newOrganisations: string;
        if (!currentExam.organisations) {
            newOrganisations = organisation._id;
        } else if (!currentExam.organisations.includes(organisation._id)) {
            newOrganisations = `${currentExam.organisations};${organisation._id}`;
        } else {
            return;
        }
        this.examTabService.saveExam$({ organisations: newOrganisations }, true).subscribe(() => {
            this.selectedOrganisations.update((selected) => [...selected, organisation]);
            this.organisations.update((orgs) =>
                orgs.map((o) => (o._id === organisation._id ? { ...o, filtered: true } : o)),
            );
        });
    }

    removeOrganisation(organisation: Organisation) {
        const currentExam = this.exam();
        if (!currentExam.organisations || !currentExam.organisations.includes(organisation._id)) {
            return;
        }
        let newOrganisations: string;
        if (currentExam.organisations.includes(';' + organisation._id)) {
            newOrganisations = currentExam.organisations.replace(';' + organisation._id, '');
        } else if (currentExam.organisations.includes(organisation._id)) {
            newOrganisations = currentExam.organisations.replace(organisation._id, '');
        } else {
            return;
        }
        this.examTabService.saveExam$({ organisations: newOrganisations }, true).subscribe(() => {
            this.selectedOrganisations.update((selected) => selected.filter((o) => o._id !== organisation._id));
            this.organisations.update((orgs) =>
                orgs.map((o) => (o._id === organisation._id ? { ...o, filtered: false } : o)),
            );
        });
    }
}
