/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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

package backend.models.sections;

import java.util.Set;
import javax.persistence.Entity;
import javax.persistence.ManyToMany;

import org.springframework.beans.BeanUtils;

import backend.models.base.OwnedModel;

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

    public ExamMaterial copy() {
        ExamMaterial material = new ExamMaterial();
        BeanUtils.copyProperties(this, material, "id", "examSections");
        return material;
    }
}
