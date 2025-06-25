// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { SimpleChanges } from '@angular/core';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { Examination, ExaminationSection, NavigationPage } from 'src/app/examination/examination.model';

@Component({
    selector: 'xm-examination-navigation',
    template: `<!-- SECTION NAVIGATION ARROWS AND LABELS -->
        <div class="row pt-2 mb-3">
            <span class="col-md-12 ms-2">
                <!-- PREVIOUS SECTION BUTTON -->
                @if (prev.valid) {
                    <button class="btn btn-outline-secondary" (click)="previousPage()">
                        <img
                            class="arrow_icon sitnet-black"
                            style="filter: invert()"
                            alt=""
                            src="/assets/images/icon_left_white.png"
                        />
                        {{ prev?.index ? ('i18n_move_to_section' | translate) : ('i18n_open_it' | translate) }}
                        {{ prev?.index ? prev.index + '.' : '' }} {{ prev.text || '' | translate }}
                    </button>
                }
                <!-- NEXT SECTION BUTTON -->
                @if (next.valid) {
                    <button class="btn btn-outline-secondary float-end me-2" (click)="nextPage()">
                        {{ next?.index ? ('i18n_move_to_section' | translate) : ('i18n_open_it' | translate) }}
                        {{ next?.index ? next.index + '.' : '' }} {{ next.text || '' | translate }}
                        <img
                            class="arrow_icon"
                            style="filter: invert()"
                            alt=""
                            src="/assets/images/icon_right_white.png"
                        />
                    </button>
                }
            </span>
        </div>`,
    imports: [TranslateModule],
    styles: [
        `
            .arrow_icon {
                vertical-align: baseline;
                padding-left: 13px;
                padding-right: 13px;
            }
        `,
    ],
})
export class ExaminationNavigationComponent implements OnInit, OnChanges {
    @Input() exam!: Examination;
    @Input() activeSection?: ExaminationSection;
    @Output() selected = new EventEmitter<{ page: Partial<NavigationPage> }>();

    pages: Partial<NavigationPage>[] = [];
    next!: Partial<NavigationPage>;
    prev!: Partial<NavigationPage>;

    ngOnInit() {
        this.pages = this.exam.examSections.map((es, i) => ({
            index: i + 1,
            id: es.id,
            text: es.name,
            type: 'section',
            valid: true,
        }));
        // Add guide page
        this.pages.unshift({ text: 'i18n_exam_guide', type: 'guide', valid: true });
        this.setupNavigation();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.activeSection && this.pages) {
            this.setupNavigation();
        }
    }

    nextPage = () => this.selected.emit({ page: this.next });
    previousPage = () => this.selected.emit({ page: this.prev });

    private setupNavigation = () => {
        if (!this.activeSection) {
            this.next = this.pages[1];
            this.prev = { valid: false };
        } else {
            const nextIndex = this.nextPageIndex();
            this.next = nextIndex > -1 ? this.pages[nextIndex] : { valid: false };
            const prevIndex = this.prevPageIndex();
            this.prev = prevIndex > -1 ? this.pages[prevIndex] : { valid: false };
        }
    };

    private activePageIndex = () => {
        const page = this.pages.filter((p) => this.activeSection?.id === p.id)[0];
        return this.pages.indexOf(page);
    };

    private nextPageIndex = () => {
        const activeIndex = this.activePageIndex();
        return activeIndex + 1 === this.pages.length ? -1 : activeIndex + 1;
    };

    private prevPageIndex = () => this.activePageIndex() - 1;
}
