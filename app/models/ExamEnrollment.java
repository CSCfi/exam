package models;

import annotations.NonCloneable;

import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.OneToMany;
import java.util.List;

/**
 * Created by mpellikka on 02/04/14.
 */
@Entity
public class ExamEnrollment extends SitnetModel {

//    @OneToMany(cascade = CascadeType.PERSIST)
//    @NonCloneable
//    private List<User> enrolledStudents;
//
//    public List<User> getEnrolledStudents() {
//        return enrolledStudents;
//    }
//
//    public void setEnrolledStudents(List<User> enrolledStudents) {
//        this.enrolledStudents = enrolledStudents;
//    }
//
//    @Override
//    public String toString() {
//        return "ExamEnrollment{" +
//                "enrolledStudents=" + enrolledStudents +
//                '}';
//    }
}
