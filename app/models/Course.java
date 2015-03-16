package models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import play.db.ebean.Model;

import javax.persistence.*;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;


/*
 * Opintojakso
 * http://tietomalli.csc.fi/Opintojakso-kaavio.html
 * 
 * 
 */
@Entity
public class Course extends Model {

    @Version
    @Temporal(TemporalType.TIMESTAMP)
    protected Timestamp ebeanTimestamp;

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    private String code;

    private String name;

    private String level;

    private Double credits;

    /**** NEW ONES ****/
    private String courseUnitType;

    private String identifier;

    private String startDate;

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
    private List<Exam> exams = new ArrayList<>();

    @ManyToOne
    private Organisation organisation;

    public Course() {

    }

    public Date getEbeanTimestamp() {
        return ebeanTimestamp;
    }

    public void setEbeanTimestamp(Timestamp ebeanTimestamp) {
        this.ebeanTimestamp = ebeanTimestamp;
    }

    public String getIdentifier() {
        return identifier;
    }

    public void setIdentifier(String identifier) {
        this.identifier = identifier;
    }

    public String getStartDate() {
        return startDate;
    }

    public void setStartDate(String startDate) {
        this.startDate = startDate;
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

    public Course(String name) {
        this.name = name;
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

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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
    public String toString() {
        return "Course{" +
                "id=" + id +
                ", code='" + code + '\'' +
                ", name='" + name + '\'' +
                ", credits=" + credits +
                '}';
    }
}
