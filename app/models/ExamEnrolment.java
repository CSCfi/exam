// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Temporal;
import jakarta.persistence.TemporalType;
import java.util.Random;
import java.util.Set;
import javax.annotation.Nonnull;
import models.base.GeneratedIdentityModel;
import models.json.CollaborativeExam;
import models.json.ExternalExam;
import models.sections.ExamSection;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;
import org.joda.time.DateTime;
import util.datetime.DateTimeAdapter;

@Entity
public class ExamEnrolment extends GeneratedIdentityModel implements Comparable<ExamEnrolment> {

    private static final int DELAY_MAX = 30;

    @ManyToOne
    @JsonManagedReference
    private User user;

    @ManyToOne
    @JsonBackReference
    private Exam exam;

    @ManyToOne
    @JsonBackReference
    private CollaborativeExam collaborativeExam;

    @OneToOne(cascade = CascadeType.ALL)
    @JsonBackReference
    private ExternalExam externalExam;

    @OneToOne(cascade = CascadeType.REMOVE)
    private Reservation reservation;

    @ManyToOne
    private ExaminationEventConfiguration examinationEventConfiguration;

    @ManyToMany(cascade = CascadeType.ALL)
    @JoinTable(
        name = "exam_enrolment_optional_exam_section",
        joinColumns = @JoinColumn(name = "exam_enrolment_id"),
        inverseJoinColumns = @JoinColumn(name = "exam_section_id")
    )
    private Set<ExamSection> optionalSections;

    @Temporal(TemporalType.TIMESTAMP)
    @JsonSerialize(using = DateTimeAdapter.class)
    private DateTime enrolledOn;

    private String information;

    private boolean reservationCanceled;

    private String preEnrolledUserEmail;

    private boolean noShow;

    private boolean retrialPermitted;

    private int delay;

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public DateTime getEnrolledOn() {
        return enrolledOn;
    }

    public void setEnrolledOn(DateTime enrolledOn) {
        this.enrolledOn = enrolledOn;
    }

    public Exam getExam() {
        return exam;
    }

    public void setExam(Exam exam) {
        this.exam = exam;
    }

    public CollaborativeExam getCollaborativeExam() {
        return collaborativeExam;
    }

    public void setCollaborativeExam(CollaborativeExam collaborativeExam) {
        this.collaborativeExam = collaborativeExam;
    }

    public ExternalExam getExternalExam() {
        return externalExam;
    }

    public void setExternalExam(ExternalExam externalExam) {
        this.externalExam = externalExam;
    }

    public Reservation getReservation() {
        return reservation;
    }

    public void setReservation(Reservation reservation) {
        this.reservation = reservation;
    }

    public ExaminationEventConfiguration getExaminationEventConfiguration() {
        return examinationEventConfiguration;
    }

    public void setExaminationEventConfiguration(ExaminationEventConfiguration examinationEventConfiguration) {
        this.examinationEventConfiguration = examinationEventConfiguration;
    }

    public Set<ExamSection> getOptionalSections() {
        return optionalSections;
    }

    public void setOptionalSections(Set<ExamSection> optionalSections) {
        this.optionalSections = optionalSections;
    }

    public String getInformation() {
        return information;
    }

    public void setInformation(String information) {
        this.information = information;
    }

    public boolean isReservationCanceled() {
        return reservationCanceled;
    }

    public void setReservationCanceled(boolean reservationCanceled) {
        this.reservationCanceled = reservationCanceled;
    }

    public String getPreEnrolledUserEmail() {
        return preEnrolledUserEmail;
    }

    public void setPreEnrolledUserEmail(String preEnrolledUserEmail) {
        this.preEnrolledUserEmail = preEnrolledUserEmail;
    }

    public boolean isNoShow() {
        return noShow;
    }

    public void setNoShow(boolean noShow) {
        this.noShow = noShow;
    }

    public boolean isRetrialPermitted() {
        return retrialPermitted;
    }

    public void setRetrialPermitted(boolean retrialPermitted) {
        this.retrialPermitted = retrialPermitted;
    }

    public int getDelay() {
        return delay;
    }

    public void setDelay(int delay) {
        this.delay = delay;
    }

    public boolean isProcessed() {
        return (exam != null && exam.hasState(Exam.State.GRADED_LOGGED, Exam.State.ARCHIVED, Exam.State.DELETED));
    }

    public void setRandomDelay() {
        this.setDelay(new Random().nextInt(DELAY_MAX));
    }

    @Override
    public int compareTo(@Nonnull ExamEnrolment other) {
        if (reservation == null && other.reservation == null) {
            return 0;
        }
        if (reservation == null) {
            return -1;
        }
        if (other.reservation == null) {
            return 1;
        }
        return reservation.compareTo(other.reservation);
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) return true;
        if (!(other instanceof ExamEnrolment otherEnrolment)) {
            return false;
        }
        return new EqualsBuilder().append(id, otherEnrolment.id).build();
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder().append(id).build();
    }
}
