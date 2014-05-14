package models.dto;

import models.Organisation;

import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.OneToOne;
import java.util.Collection;


@Entity
public class CourseUnitInfo {

    @Id
    private Long id;
    @OneToOne
    Organisation organisation;
    private String identifier;
    private String courseUnitCode;
    private String courseUnitTitle;
    private String courseUnitLevel;
    private String courseUnitType;
    private Collection<String> courseImplementation;
    private String credits;
    private Collection<String> creditsLanguage;
    private Collection<String> cradeScale;
    private Collection<String> lecturer;
    private Collection<String> lecturerResponsible;
    private String institutionName;
    private Collection<String> department;
    private Collection<String> degreeProgramme;
    private Collection<String> campus;
    private String startDate;
    private Collection<String> courseMaterial;


    public Collection<String> getCampus() {
        return campus;
    }

    public void setCampus(Collection<String> campus) {
        this.campus = campus;
    }

    public Collection<String> getCourseImplementation() {
        return courseImplementation;
    }

    public void setCourseImplementation(Collection<String> courseImplementation) {
        this.courseImplementation = courseImplementation;
    }

    public Collection<String> getCourseMaterial() {
        return courseMaterial;
    }

    public void setCourseMaterial(Collection<String> courseMaterial) {
        this.courseMaterial = courseMaterial;
    }

    public String getCourseUnitCode() {
        return courseUnitCode;
    }

    public void setCourseUnitCode(String courseUnitCode) {
        this.courseUnitCode = courseUnitCode;
    }

    public String getCourseUnitLevel() {
        return courseUnitLevel;
    }

    public void setCourseUnitLevel(String courseUnitLevel) {
        this.courseUnitLevel = courseUnitLevel;
    }

    public String getCourseUnitTitle() {
        return courseUnitTitle;
    }

    public void setCourseUnitTitle(String courseUnitTitle) {
        this.courseUnitTitle = courseUnitTitle;
    }

    public String getCourseUnitType() {
        return courseUnitType;
    }

    public void setCourseUnitType(String courseUnitType) {
        this.courseUnitType = courseUnitType;
    }

    public Collection<String> getCradeScale() {
        return cradeScale;
    }

    public void setCradeScale(Collection<String> cradeScale) {
        this.cradeScale = cradeScale;
    }

    public String getCredits() {
        return credits;
    }

    public void setCredits(String credits) {
        this.credits = credits;
    }

    public Collection<String> getCreditsLanguage() {
        return creditsLanguage;
    }

    public void setCreditsLanguage(Collection<String> creditsLanguage) {
        this.creditsLanguage = creditsLanguage;
    }

    public Collection<String> getDegreeProgramme() {
        return degreeProgramme;
    }

    public void setDegreeProgramme(Collection<String> degreeProgramme) {
        this.degreeProgramme = degreeProgramme;
    }

    public Collection<String> getDepartment() {
        return department;
    }

    public void setDepartment(Collection<String> department) {
        this.department = department;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getIdentifier() {
        return identifier;
    }

    public void setIdentifier(String identifier) {
        this.identifier = identifier;
    }

    public String getInstitutionName() {
        return institutionName;
    }

    public void setInstitutionName(String institutionName) {
        this.institutionName = institutionName;
    }

    public Collection<String> getLecturer() {
        return lecturer;
    }

    public void setLecturer(Collection<String> lecturer) {
        this.lecturer = lecturer;
    }

    public Collection<String> getLecturerResponsible() {
        return lecturerResponsible;
    }

    public void setLecturerResponsible(Collection<String> lecturerResponsible) {
        this.lecturerResponsible = lecturerResponsible;
    }

    public Organisation getOrganisation() {
        return organisation;
    }

    public void setOrganisation(Organisation organisation) {
        this.organisation = organisation;
    }

    public String getStartDate() {
        return startDate;
    }

    public void setStartDate(String startDate) {
        this.startDate = startDate;
    }
}
