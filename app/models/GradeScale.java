// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models;

import io.ebean.Model;
import jakarta.persistence.*;
import java.util.Optional;
import java.util.Set;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;

@Entity
public class GradeScale extends Model {

    public enum Type {
        ZERO_TO_FIVE(1),
        LATIN(2),
        APPROVED_REJECTED(3),
        OTHER(4);

        private final int value;

        Type(int value) {
            this.value = value;
        }

        public int getValue() {
            return value;
        }

        public static Optional<Type> get(String value) {
            for (Type t : values()) {
                if (t.toString().equals(value)) {
                    return Optional.of(t);
                }
            }
            return Optional.empty();
        }
    }

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    @Column
    private int id;

    @Column
    private String description;

    @Column
    private String externalRef;

    @Column
    private String displayName;

    @OneToMany(mappedBy = "gradeScale", cascade = CascadeType.ALL)
    private Set<Grade> grades;

    public int getId() {
        return id;
    }

    public Type getType() {
        return Type.get(description).orElse(null);
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getExternalRef() {
        return externalRef;
    }

    public void setExternalRef(String externalRef) {
        this.externalRef = externalRef;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public Set<Grade> getGrades() {
        return grades;
    }

    public void setGrades(Set<Grade> grades) {
        this.grades = grades;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) return true;
        if (!(other instanceof GradeScale otherScale)) {
            return false;
        }
        return new EqualsBuilder().append(id, otherScale.id).build();
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder().append(id).build();
    }
}
