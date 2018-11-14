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
import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { LibraryQuestion, LibraryService } from '../library.service';
import { SessionService, User } from '../../../session/session.service';
import { Exam, Course, Tag, ExamSection } from '../../../exam/exam.model';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';


interface Filterable<T> {
    id: number;
    filtered: boolean;
    object: T;
    name: string;
    isSectionTag?: boolean;
}

@Component({
    selector: 'library-search',
    template: require('./librarySearch.component.html')
})
export class LibrarySearchComponent implements OnInit {
    @Output() onUpdate = new EventEmitter<LibraryQuestion[]>();

    filter = { owner: '', text: '' };
    limitations = { exam: '', course: '', tag: '' };
    user: User;
    exams: Filterable<Exam>[] = [];
    filteredExams = this.exams;
    courses: Filterable<Course>[] = [];
    filteredCourses = this.courses;
    tags: Filterable<Tag | ExamSection>[] = [];
    filteredTags = this.tags;
    questions: LibraryQuestion[] = [];

    constructor(private Library: LibraryService, private Session: SessionService) { }

    private saveFilters = () => {
        const filters = {
            exams: this.exams,
            courses: this.courses,
            tags: this.tags,
            text: this.filter.text,
            owner: this.filter.owner
        };
        this.Library.storeFilters(filters, 'search');
    }

    private getCourseIds = () => this.courses.filter(course => course.filtered).map(course => course.id);
    private getExamIds = () => this.exams.filter(exam => exam.filtered).map(exam => exam.id);
    private getTagIds = () => this.tags.filter(tag => !tag.isSectionTag && tag.filtered).map(tag => tag.id);
    private getSectionIds = () => this.tags.filter(tag => tag.isSectionTag && tag.filtered).map(section => section.id);

    private union<T>(filtered: Filterable<T>[], tags: Filterable<T>[]): Filterable<T>[] {
        const filteredIds = filtered.map(f => f.id);
        return filtered.concat(tags.filter(t => filteredIds.indexOf(t.id) === -1));
    }

    private query = (): Observable<LibraryQuestion[]> =>
        this.Library.search(this.getExamIds(), this.getCourseIds(), this.getTagIds(), this.getSectionIds())
            .pipe(
                tap(questions => {
                    this.questions = questions;
                    this.saveFilters();
                })
            )

    applySearchFilter = () => {
        let results = this.Library.applyFreeSearchFilter(this.filter.text, this.questions);
        results = this.Library.applyOwnerSearchFilter(this.filter.owner, results);
        this.onUpdate.emit(results);
        this.saveFilters();
    }

    ngOnInit() {
        this.user = this.Session.getUser();
        const storedData = this.Library.loadFilters('search');
        if (storedData.filters) {
            this.exams = this.filteredExams = storedData.filters.exams || [];
            this.courses = this.filteredCourses = storedData.filters.courses || [];
            this.tags = this.filteredTags = storedData.filters.tags || [];
            this.filter.text = storedData.filters.text;
            this.filter.owner = storedData.filters.owner;
            this.query().subscribe(
                questions => {
                    if (this.filter.text || this.filter.owner) {
                        this.applySearchFilter();
                    } else {
                        this.onUpdate.emit(questions);
                    }
                });
        } else {
            this.query().subscribe(this.onUpdate.emit);
        }
    }

    listCourses = () => {
        const courses = this.courses.filter(c => c.filtered);
        return this.Library.listCourses(this.getCourseIds(), this.getSectionIds(), this.getTagIds()).pipe(
            tap(resp => {
                this.courses = this.filteredCourses = this.union(courses, resp.map(r => ({
                    id: r.id, name: r.name, object: r, filtered: false, isSectionTag: false
                })));
            })
        ).subscribe();
    }

    listExams = (): Observable<Exam[]> => {
        const exams = this.exams.filter(e => e.filtered);
        return this.Library.listExams(this.getCourseIds(), this.getSectionIds(), this.getTagIds()).pipe(
            tap(resp => {
                this.exams = this.filteredExams = this.union(exams, resp.map(r => ({
                    id: r.id, name: r.name || '', object: r, filtered: false, isSectionTag: false
                })));
            })
        );
    }

    listTags = () => {
        const tags = this.tags.filter(_ => _.filtered && !_.isSectionTag);
        const sections = tags.filter(_ => _.filtered && _.isSectionTag);
        if (this.getExamIds().length === 0) {
            this.listExams().subscribe(() => this.doListTags(tags, sections));
        } else {
            return this.doListTags(tags, sections);
        }
    }

    getTags = (): Filterable<any>[] => {
        const courses: Filterable<any>[] = this.courses.filter(_ => _.filtered);
        const exams: Filterable<any>[] = this.exams.filter(_ => _.filtered);
        const tags: Filterable<any>[] = this.tags.filter(_ => _.filtered);
        return courses.concat(exams).concat(tags);
    }

    applyFilter = (tag: Filterable<any>) => {
        tag.filtered = !tag.filtered;
        this.query().subscribe(() => this.applySearchFilter());
    }

    filterExams = () => {
        this.filteredExams = this.exams.filter(
            e => e.name.toLowerCase().indexOf(this.limitations.exam.toLowerCase()) > -1);
    }

    filterCourses = () => {
        this.filteredCourses = this.courses.filter(
            c => c.name.toLowerCase().indexOf(this.limitations.course.toLowerCase()) > -1);
    }

    filterTags = () => {
        this.filteredTags = this.tags.filter(
            t => t.name.toLowerCase().indexOf(this.limitations.tag.toLowerCase()) > -1);
    }

    private doListTags = (tags: Filterable<Tag>[], sections: Filterable<Tag | ExamSection>[]) => {
        const examIds = this.getExamIds();
        const courseIds = this.getCourseIds();
        const sectionIds = this.getSectionIds();
        this.Library.listTags(courseIds, sectionIds, tags.map(t => t.id)).subscribe(
            response => {
                tags = this.union(tags, response.map(
                    r => ({ id: r.id, name: r.name, object: r, filtered: false, isSectionTag: false })));
                let examSections: Filterable<ExamSection>[] = [];
                this.exams.filter(fe => {
                    const examMatch = examIds.length === 0 || examIds.indexOf(fe.id) > -1;
                    const courseMatch = courseIds.length === 0 ||
                        !fe.object.course || courseIds.indexOf(fe.object.course.id) > -1;
                    return examMatch && courseMatch;
                }).forEach(e => {
                    const filteredSections: Filterable<ExamSection>[] = e.object.examSections
                        .filter(es => es.name)
                        .map(es => ({ id: es.id, name: es.name, object: es, filtered: false, isSectionTag: true }));
                    examSections = examSections.concat(filteredSections);
                });
                this.tags = this.filteredTags = tags.concat(this.union(sections, examSections));
            });
    }
}
