// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
// SPDX-FileCopyrightText: 2024. The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.sections;

import jakarta.persistence.Entity;
import jakarta.persistence.ManyToMany;
import java.util.Set;
import models.base.OwnedModel;
import models.user.User;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;
import org.springframework.beans.BeanUtils;

@Entity
public final class ExamMaterial extends OwnedModel {

    private String name;
    private String isbn;
    private String author;

    @ManyToMany(mappedBy = "examMaterials")
    private Set<ExamSection> examSections;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getIsbn() {
        return isbn;
    }

    public void setIsbn(String isbn) {
        this.isbn = isbn;
    }

    public String getAuthor() {
        return author;
    }

    public void setAuthor(String author) {
        this.author = author;
    }

    public Set<ExamSection> getExamSections() {
        return examSections;
    }

    public void setExamSections(Set<ExamSection> examSections) {
        this.examSections = examSections;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;

        if (!(o instanceof ExamMaterial that)) return false;

        return new EqualsBuilder().append(id, that.id).isEquals();
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder(17, 37).append(id).toHashCode();
    }

    public ExamMaterial copy(User user) {
        ExamMaterial material = new ExamMaterial();
        BeanUtils.copyProperties(this, material, "id", "examSections", "creator", "modifier");
        material.setCreatorWithDate(user);
        material.setModifierWithDate(user);
        return material;
    }
}
