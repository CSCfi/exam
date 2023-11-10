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
import { NgClass, NgFor, NgIf } from '@angular/common';
import type { OnInit } from '@angular/core';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbDropdown, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Course, Exam, ExamSection, Tag } from '../../../exam/exam.model';
import type { User } from '../../../session/session.service';
import { SessionService } from '../../../session/session.service';
import type { LibraryQuestion } from '../library.service';
import { LibraryService } from '../library.service';

interface Filterable<T> {
    id: number;
    filtered: boolean;
    object: T;
    name: string;
    usage?: number;
}

@Component({
    selector: 'xm-library-search',
    templateUrl: './library-search.component.html',
    standalone: true,
    imports: [
        NgIf,
        NgClass,
        NgbDropdown,
        NgbDropdownToggle,
        NgbDropdownMenu,
        NgbDropdownItem,
        FormsModule,
        NgFor,
        TranslateModule,
    ],
})
export class LibrarySearchComponent implements OnInit {
    @Output() updated: EventEmitter<LibraryQuestion[]> = new EventEmitter<LibraryQuestion[]>();

    filter = { owner: '', text: '' };
    limitations = { course: '', exam: '', section: '', tag: '' };
    user: User;
    courses: Filterable<Course>[] = [];
    filteredCourses = this.courses;
    exams: Filterable<Exam>[] = [];
    filteredExams = this.exams;
    sections: Filterable<ExamSection>[] = [];
    filteredSections = this.sections;
    tags: Filterable<Tag>[] = [];
    filteredTags = this.tags;
    questions: LibraryQuestion[] = [];

    constructor(private Library: LibraryService, private Session: SessionService) {
        this.user = this.Session.getUser();
    }

    ngOnInit() {
        const storedData = this.Library.loadFilters('search');
        if (storedData.filters) {
            this.courses = this.filteredCourses = storedData.filters.courses || [];
            this.exams = this.filteredExams = storedData.filters.exams || [];
            this.sections = this.filteredSections = storedData.filters.sections || [];
            this.tags = this.filteredTags = storedData.filters.tags || [];
            this.filter.text = storedData.filters.text;
            this.filter.owner = storedData.filters.owner;
            this.query().subscribe((questions) => {
                if (this.filter.text || this.filter.owner) {
                    this.applySearchFilter();
                } else {
                    this.updated.emit(questions);
                }
            });
        } else {
            this.query().subscribe((resp) => this.updated.emit(resp));
        }
    }

    applySearchFilter = () => {
        let results = this.Library.applyFreeSearchFilter(this.filter.text, this.questions);
        results = this.Library.applyOwnerSearchFilter(this.filter.owner, results);
        this.updated.emit(results);
        this.saveFilters();
    };

    listCourses = () => {
        const courses = this.courses.filter((c) => c.filtered);
        return this.Library.listCourses$(this.getExamIds(), this.getSectionIds(), this.getTagIds())
            .pipe(
                tap((resp) => {
                    this.courses = this.filteredCourses = this.union(
                        courses,
                        resp.map((r) => ({
                            id: r.id,
                            name: r.name,
                            object: r,
                            filtered: false,
                        })),
                    );
                }),
            )
            .subscribe();
    };

    listExams$ = (): Observable<Exam[]> => {
        const exams = this.exams.filter((e) => e.filtered);
        return this.Library.listExams$(this.getCourseIds(), this.getSectionIds(), this.getTagIds()).pipe(
            tap((resp) => {
                this.exams = this.filteredExams = this.union(
                    exams,
                    resp.map((r) => ({
                        id: r.id,
                        name: r.name || '',
                        object: r,
                        filtered: false,
                    })),
                );
            }),
        );
    };

    listSections$ = (): Observable<ExamSection[]> => {
        const sections = this.sections.filter((s) => s.filtered);
        return this.Library.listSections$(this.getCourseIds(), this.getExamIds(), this.getTagIds()).pipe(
            tap((resp) => {
                this.sections = this.filteredSections = this.union(
                    sections,
                    resp.map((r) => ({
                        id: r.id,
                        name: r.name || '',
                        object: r,
                        filtered: false,
                    })),
                );
            }),
        );
    };

    listTags$ = () => {
        const tags = this.tags.filter((t) => t.filtered);
        return this.Library.listTags$(this.getCourseIds(), this.getExamIds(), this.getSectionIds()).pipe(
            tap((resp) => {
                this.tags = this.filteredTags = this.union(
                    tags,
                    resp.map((r) => ({
                        id: r.id as number,
                        name: r.name || '',
                        object: r,
                        filtered: false,
                        usage: r.questions.length,
                    })),
                );
            }),
        );
    };

    getFilters = () => {
        const courses = this.courses.filter((c) => c.filtered);
        const exams = this.exams.filter((e) => e.filtered);
        const sections = this.sections.filter((s) => s.filtered);
        const tags = this.tags.filter((t) => t.filtered);
        const res: (Filterable<Course> | Filterable<Exam> | Filterable<ExamSection> | Filterable<Tag>)[] = [];
        return res.concat(courses).concat(exams).concat(sections).concat(tags);
    };

    applyFilter = (f: Filterable<unknown>) => {
        f.filtered = !f.filtered;
        this.query().subscribe(() => this.applySearchFilter());
    };

    filterCourses = () => {
        this.filteredCourses = this.courses.filter(
            (c) => c.name.toLowerCase().indexOf(this.limitations.course.toLowerCase()) > -1,
        );
    };

    filterExams = () => {
        this.filteredExams = this.exams.filter(
            (e) => e.name.toLowerCase().indexOf(this.limitations.exam.toLowerCase()) > -1,
        );
    };

    filterSections = () => {
        this.filteredSections = this.sections.filter(
            (s) => s.name.toLowerCase().indexOf(this.limitations.section.toLowerCase()) > -1,
        );
    };

    filterTags = () => {
        this.filteredTags = this.tags.filter(
            (t) => t.name.toLowerCase().indexOf(this.limitations.tag.toLowerCase()) > -1,
        );
    };

    private saveFilters = () => {
        const filters = {
            courses: this.courses,
            exams: this.exams,
            sections: this.sections,
            tags: this.tags,
            text: this.filter.text,
            owner: this.filter.owner,
        };
        this.Library.storeFilters(filters, 'search');
    };

    private getCourseIds = () => this.courses.filter((course) => course.filtered).map((course) => course.id);
    private getExamIds = () => this.exams.filter((exam) => exam.filtered).map((exam) => exam.id);
    private getTagIds = () => this.tags.filter((tag) => tag.filtered).map((tag) => tag.id);
    private getSectionIds = () => this.sections.filter((section) => section.filtered).map((section) => section.id);

    private union<T>(filtered: Filterable<T>[], tags: Filterable<T>[]): Filterable<T>[] {
        const filteredIds = filtered.map((f) => f.id);
        return filtered.concat(tags.filter((t) => filteredIds.indexOf(t.id) === -1));
    }

    private query = (): Observable<LibraryQuestion[]> =>
        this.Library.search(this.getCourseIds(), this.getExamIds(), this.getSectionIds(), this.getTagIds()).pipe(
            tap((questions) => {
                this.questions = questions;
                this.saveFilters();
            }),
        );
}
