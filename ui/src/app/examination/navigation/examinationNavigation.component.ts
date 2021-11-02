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
import { Component, EventEmitter, Input, Output } from '@angular/core';

import type { SimpleChanges } from '@angular/core';
import type { Examination, ExaminationSection } from '../examination.service';

interface NavigationPage {
    id: number;
    text: string;
    type: string;
    valid: boolean;
}

@Component({
    selector: 'examination-navigation',
    templateUrl: './examinationNavigation.component.html',
})
export class ExaminationNavigationComponent {
    @Input() exam: Examination;
    @Input() activeSection: ExaminationSection;
    @Output() onSelect = new EventEmitter<{ page: Partial<NavigationPage> }>();

    pages: Partial<NavigationPage>[];
    next: Partial<NavigationPage>;
    prev: Partial<NavigationPage>;

    ngOnInit() {
        this.pages = this.exam.examSections.map((es) => ({ id: es.id, text: es.name, type: 'section', valid: true }));
        // Add guide page
        this.pages.unshift({ text: 'sitnet_exam_guide', type: 'guide', valid: true });
        this.setupNavigation();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.activeSection && this.pages) {
            this.setupNavigation();
        }
    }

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
        const page = this.pages.filter((p) => this.activeSection.id === p.id)[0];
        return this.pages.indexOf(page);
    };

    private nextPageIndex = () => {
        const activeIndex = this.activePageIndex();
        return activeIndex + 1 === this.pages.length ? -1 : activeIndex + 1;
    };

    private prevPageIndex = () => this.activePageIndex() - 1;

    nextPage = () => this.onSelect.emit({ page: this.next });
    previousPage = () => this.onSelect.emit({ page: this.prev });
}
