// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.exam.copy;

import java.util.Collections;
import java.util.Set;
import javax.annotation.Nullable;
import models.user.User;

/**
 * Configuration for exam copying operations.
 */
public final class ExamCopyContext {

    public enum CopyType {
        /** Copy for teacher/admin (prototype copy) */
        TEACHER_COPY,
        /** Copy for student exam participation */
        STUDENT_EXAM,
        /** Copy for collaborative exam */
        COLLABORATIVE_EXAM,
        /** Copy with student answers (for assessment/review) */
        WITH_ANSWERS,
    }

    @Nullable
    private final User user;

    private final CopyType copyType;
    private final Set<Long> selectedSections;

    private ExamCopyContext(Builder builder) {
        this.user = builder.user;
        this.copyType = builder.copyType;
        this.selectedSections = builder.selectedSections;
    }

    @Nullable
    public User getUser() {
        return user;
    }

    public CopyType getCopyType() {
        return copyType;
    }

    public Set<Long> getSelectedSections() {
        return selectedSections;
    }

    public boolean isStudentExam() {
        return copyType == CopyType.STUDENT_EXAM || copyType == CopyType.COLLABORATIVE_EXAM;
    }

    public boolean isWithAnswers() {
        return copyType == CopyType.WITH_ANSWERS;
    }

    public boolean shouldSetParent() {
        // Teacher copies, non-collaborative student exams, and copies with answers should have parent set
        return (
            copyType == CopyType.TEACHER_COPY || copyType == CopyType.STUDENT_EXAM || copyType == CopyType.WITH_ANSWERS
        );
    }

    public boolean shouldShuffleOptions() {
        return isStudentExam();
    }

    public boolean shouldIncludeOnlySelectedSections() {
        return isStudentExam();
    }

    public boolean shouldExcludeExamOwners() {
        return isStudentExam();
    }

    public boolean shouldCopyAnswers() {
        return copyType == CopyType.WITH_ANSWERS;
    }

    public static Builder forTeacherCopy(User user) {
        return new Builder(user, CopyType.TEACHER_COPY);
    }

    public static Builder forStudentExam(User student) {
        return new Builder(student, CopyType.STUDENT_EXAM);
    }

    public static Builder forCollaborativeExam(User student) {
        return new Builder(student, CopyType.COLLABORATIVE_EXAM);
    }

    /**
     * Creates context for copying with answers.
     * User can be null since WITH_ANSWERS copies don't need user metadata.
     */
    public static Builder forCopyWithAnswers(@Nullable User user) {
        return new Builder(user, CopyType.WITH_ANSWERS);
    }

    public static final class Builder {

        private final User user;
        private final CopyType copyType;
        private Set<Long> selectedSections = Collections.emptySet();

        private Builder(User user, CopyType copyType) {
            this.user = user;
            this.copyType = copyType;
        }

        public Builder withSelectedSections(Set<Long> sections) {
            this.selectedSections = sections != null ? sections : Collections.emptySet();
            return this;
        }

        public ExamCopyContext build() {
            return new ExamCopyContext(this);
        }
    }
}
