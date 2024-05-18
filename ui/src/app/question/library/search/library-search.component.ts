// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass, NgForOf } from '@angular/common';
import type { OnInit } from '@angular/core';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbDropdown, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Course, Exam, ExamSection, Tag } from 'src/app/exam/exam.model';
import type { LibraryQuestion } from 'src/app/question/library/library.service';
import { LibraryService } from 'src/app/question/library/library.service';
import type { User } from 'src/app/session/session.service';
import { SessionService } from 'src/app/session/session.service';
import { CourseCodeService } from 'src/app/shared/miscellaneous/course-code.service';
import { UserService } from 'src/app/shared/user/user.service';

interface Filterable<T> {
    id: number;
    filtered: boolean;
    object: T;
    name: string;
    code?: string;
    usage?: number;
    period?: string;
}

@Component({
    selector: 'xm-library-search',
    templateUrl: './library-search.component.html',
    standalone: true,
    imports: [
        NgClass,
        NgbDropdown,
        NgbDropdownToggle,
        NgbDropdownMenu,
        NgbDropdownItem,
        FormsModule,
        TranslateModule,
        NgForOf,
    ],
})
export class LibrarySearchComponent implements OnInit {
    @Output() updated: EventEmitter<LibraryQuestion[]> = new EventEmitter<LibraryQuestion[]>();

    filter = { owner: '', text: '' };
    limitations = { course: '', exam: '', section: '', tag: '', owner: '' };
    user: User;
    courses: Filterable<Course>[] = [];
    filteredCourses = this.courses;
    exams: Filterable<Exam>[] = [];
    filteredExams = this.exams;
    sections: Filterable<ExamSection>[] = [];
    filteredSections = this.sections;
    tags: Filterable<Tag>[] = [];
    filteredTags = this.tags;
    owners: Filterable<User>[] = [];
    filteredOwners = this.owners;
    questions: LibraryQuestion[] = [];

    constructor(
        private Library: LibraryService,
        private Session: SessionService,
        private CourseCode: CourseCodeService,
        private User: UserService,
    ) {
        this.user = this.Session.getUser();
    }

    ngOnInit() {
        const storedData = this.Library.loadFilters('search');
        if (storedData.filters) {
            this.courses = this.filteredCourses = storedData.filters.courses || [];
            this.exams = this.filteredExams = storedData.filters.exams || [];
            this.sections = this.filteredSections = storedData.filters.sections || [];
            this.tags = this.filteredTags = storedData.filters.tags || [];
            this.owners = this.filteredOwners = storedData.filters.owners || [];
            this.filter.text = storedData.filters.text;
            this.filter.owner = storedData.filters.owner;
            this.query$().subscribe((questions) => {
                if (this.filter.text || this.filter.owner) {
                    this.applySearchFilter();
                } else {
                    this.updated.emit(questions);
                }
            });
        } else {
            this.query$().subscribe((resp) => this.updated.emit(resp));
        }
    }

    applySearchFilter = () => {
        let results = this.Library.applyFreeSearchFilter(this.filter.text, this.questions);
        results = this.Library.applyOwnerSearchFilter(this.filter.owner, results);
        this.updated.emit(results);
        this.saveFilters();
    };
    applyOwnerSearchFilter = (user: Filterable<User>) => {
        user.filtered = !user.filtered;
        if (user.name) {
            this.filter.owner = user.name;
        } else {
            console.error('i18n_user_no_name');
        }
        this.applySearchFilter();
    };

    listCourses = () => {
        const courses = this.courses.filter((c) => c.filtered);
        return this.Library.listCourses$(this.getExamIds(), this.getSectionIds(), this.getTagIds(), this.getOwnerIds())
            .pipe(
                tap((resp) => {
                    this.courses = this.filteredCourses = this.union(
                        courses,
                        resp.map((r) => ({
                            id: r.id,
                            name: r.name,
                            code: r.code,
                            object: r,
                            filtered: false,
                        })),
                    ).sort((a, b) => a.name.localeCompare(b.name));
                }),
            )
            .subscribe();
    };

    listExams$ = (): Observable<Exam[]> => {
        const exams = this.exams.filter((e) => e.filtered);
        return this.Library.listExams$(
            this.getCourseIds(),
            this.getSectionIds(),
            this.getTagIds(),
            this.getOwnerIds(),
        ).pipe(
            tap((resp) => {
                this.exams = this.filteredExams = this.union(
                    exams,
                    resp.map((r) => ({
                        id: r.id,
                        name: r.name || '',
                        object: r,
                        filtered: false,
                        code: r.course?.code,
                        period: this.formatPeriod(r.periodStart, r.periodEnd),
                    })),
                ).sort((a, b) => a.name.localeCompare(b.name));
            }),
        );
    };

    listSections$ = (): Observable<ExamSection[]> => {
        const sections = this.sections.filter((s) => s.filtered);
        return this.Library.listSections$(
            this.getCourseIds(),
            this.getExamIds(),
            this.getTagIds(),
            this.getOwnerIds(),
        ).pipe(
            tap((resp) => {
                this.sections = this.filteredSections = this.union(
                    sections,
                    resp.map((r) => ({
                        id: r.id,
                        name: r.name || '',
                        object: r,
                        filtered: false,
                    })),
                ).sort((a, b) => a.name.localeCompare(b.name));
            }),
        );
    };

    listTags$ = () => {
        const tags = this.tags.filter((t) => t.filtered);
        return this.Library.listTags$(
            this.getCourseIds(),
            this.getExamIds(),
            this.getSectionIds(),
            this.getOwnerIds(),
        ).pipe(
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
                ).sort((a, b) => a.name.localeCompare(b.name));
            }),
        );
    };

    listAllOwners$ = () => {
        if (this.user.isAdmin) {
            const owners = this.owners.filter((o) => o.filtered);
            return this.User.listUsersByRoles$(['TEACHER', 'ADMIN'])
                .pipe(
                    tap((resp) => {
                        this.owners = this.filteredOwners = this.union(
                            owners,
                            resp.map((r) => ({
                                id: r.id,
                                name: r.firstName + ' ' + r.lastName || '',
                                object: r,
                                filtered: false,
                            })),
                        ).sort((a, b) => a.name.localeCompare(b.name));
                    }),
                )
                .subscribe();
        } else {
            const questionOwners = this.questions.flatMap((q) => q.questionOwners);
            const uniqueMap: Record<number, User> = {};
            // Filter out duplicates based on the 'id' property
            const uniqueArray = questionOwners.filter((obj) => {
                if (!uniqueMap[obj.id]) {
                    uniqueMap[obj.id] = obj;
                    return true;
                }
                return false;
            });
            const commonOwners = uniqueArray.map((o) => {
                return {
                    id: o.id,
                    name: o.firstName + ' ' + o.lastName || '',
                    object: o,
                    filtered: false,
                } as Filterable<User>;
            });
            return (this.owners = this.filteredOwners =
                this.filteredOwners.length == 0 ? commonOwners : this.filteredOwners);
        }
    };

    getFilters = () => {
        const courses = this.courses.filter((c) => c.filtered);
        const exams = this.exams.filter((e) => e.filtered);
        const sections = this.sections.filter((s) => s.filtered);
        const tags = this.tags.filter((t) => t.filtered);
        const owners = this.owners.filter((o) => o.filtered);
        const res: (
            | Filterable<Course>
            | Filterable<Exam>
            | Filterable<ExamSection>
            | Filterable<Tag>
            | Filterable<User>
        )[] = [];
        return res.concat(courses).concat(exams).concat(sections).concat(tags).concat(owners);
    };

    applyFilter = (f: Filterable<unknown>) => {
        f.filtered = !f.filtered;
        this.query$().subscribe(() => this.applySearchFilter());
    };

    filterCourses = () => {
        this.filteredCourses = this.courses.filter(
            (c) =>
                c.name.toLowerCase().includes(this.limitations.course.toLowerCase()) ||
                (c.code && c.code.toLowerCase().includes(this.limitations.course.toLowerCase())),
        );
    };

    filterExams = () => {
        this.filteredExams = this.exams.filter(
            (e) =>
                e.name.toLowerCase().includes(this.limitations.exam.toLowerCase()) ||
                (e.code && e.code.toLowerCase().includes(this.limitations.exam.toLowerCase())),
        );
    };

    filterSections = () => {
        this.filteredSections = this.sections.filter((s) =>
            s.name.toLowerCase().includes(this.limitations.section.toLowerCase()),
        );
    };

    filterTags = () => {
        this.filteredTags = this.tags.filter((t) => t.name.toLowerCase().includes(this.limitations.tag.toLowerCase()));
    };

    formatCourse = (f: Filterable<Course | Exam>) => (f.code ? this.CourseCode.formatCode(f.code) : '');

    formatPeriod = (s: string | null, e: string | null) =>
        s && e ? `${DateTime.fromISO(s).toFormat('dd.LL.yyyy')}-${DateTime.fromISO(e).toFormat('dd.LL.yyyy')}` : '';

    filterOwners = () => {
        this.filteredOwners = this.owners.filter(
            (t) => t.name.toLowerCase().indexOf(this.limitations.owner.toLowerCase()) > -1,
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
    private getOwnerIds = () => this.owners.filter((owner) => owner.filtered).map((owner) => owner.id);

    private union<T>(filtered: Filterable<T>[], tags: Filterable<T>[]): Filterable<T>[] {
        const filteredIds = filtered.map((f) => f.id);
        return filtered.concat(tags.filter((t) => filteredIds.indexOf(t.id) === -1));
    }

    private query$ = (): Observable<LibraryQuestion[]> =>
        this.Library.search(
            this.getCourseIds(),
            this.getExamIds(),
            this.getSectionIds(),
            this.getTagIds(),
            this.getOwnerIds(),
        ).pipe(
            tap((questions) => {
                this.questions = questions;
                this.saveFilters();
            }),
        );
}
