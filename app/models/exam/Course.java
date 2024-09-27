// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.exam;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import java.util.Date;
import java.util.List;
import models.base.GeneratedIdentityModel;
import models.facility.Organisation;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;

@Entity
public class Course extends GeneratedIdentityModel {

    private String code;

    private String name;

    private String level;

    private Double credits;

    private String courseUnitType;

    private String identifier;

    private Date startDate;

    private Date endDate;

    private String courseImplementation;

    private String creditsLanguage;

    @ManyToOne
    private GradeScale gradeScale;

    private String lecturer;

    private String lecturerResponsible;

    private String institutionName;

    private String department;

    private String degreeProgramme;

    private String campus;

    @Column(columnDefinition = "TEXT")
    private String courseMaterial;

    @OneToMany(mappedBy = "course")
    @JsonBackReference
    private List<Exam> exams;

    @ManyToOne
    private Organisation organisation;

    public String getIdentifier() {
        return identifier;
    }

    public void setIdentifier(String identifier) {
        this.identifier = identifier;
    }

    public Date getStartDate() {
        return startDate;
    }

    public void setStartDate(Date startDate) {
        this.startDate = startDate;
    }

    public Date getEndDate() {
        return endDate;
    }

    public void setEndDate(Date endDate) {
        this.endDate = endDate;
    }

    public String getCourseImplementation() {
        return courseImplementation;
    }

    public void setCourseImplementation(String courseImplementation) {
        this.courseImplementation = courseImplementation;
    }

    public String getCourseUnitType() {
        return courseUnitType;
    }

    public void setCourseUnitType(String courseUnitType) {
        this.courseUnitType = courseUnitType;
    }

    public String getCreditsLanguage() {
        return creditsLanguage;
    }

    public void setCreditsLanguage(String creditsLanguage) {
        this.creditsLanguage = creditsLanguage;
    }

    public GradeScale getGradeScale() {
        return gradeScale;
    }

    public void setGradeScale(GradeScale gradeScale) {
        this.gradeScale = gradeScale;
    }

    public String getLecturer() {
        return lecturer;
    }

    public void setLecturer(String lecturer) {
        this.lecturer = lecturer;
    }

    public String getLecturerResponsible() {
        return lecturerResponsible;
    }

    public void setLecturerResponsible(String lecturerResponsible) {
        this.lecturerResponsible = lecturerResponsible;
    }

    public String getInstitutionName() {
        return institutionName;
    }

    public void setInstitutionName(String institutionName) {
        this.institutionName = institutionName;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getDegreeProgramme() {
        return degreeProgramme;
    }

    public void setDegreeProgramme(String degreeProgramme) {
        this.degreeProgramme = degreeProgramme;
    }

    public String getCampus() {
        return campus;
    }

    public void setCampus(String campus) {
        this.campus = campus;
    }

    public String getCourseMaterial() {
        return courseMaterial;
    }

    public void setCourseMaterial(String courseMaterial) {
        this.courseMaterial = courseMaterial;
    }

    public String getLevel() {
        return level;
    }

    public void setLevel(String level) {
        this.level = level;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public Double getCredits() {
        return credits;
    }

    public void setCredits(Double credits) {
        this.credits = credits;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public List<Exam> getExams() {
        return exams;
    }

    public void setExams(List<Exam> exams) {
        this.exams = exams;
    }

    public Organisation getOrganisation() {
        return organisation;
    }

    public void setOrganisation(Organisation organisation) {
        this.organisation = organisation;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;

        if (!(o instanceof Course course)) return false;

        return new EqualsBuilder().append(code, course.code).isEquals();
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder().append(code).toHashCode();
    }

    @Override
    public String toString() {
        return (
            "Course{" +
            "id=" +
            getId() +
            ", code='" +
            code +
            '\'' +
            ", name='" +
            name +
            '\'' +
            ", credits=" +
            credits +
            '}'
        );
    }
}
