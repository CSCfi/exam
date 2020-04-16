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

package backend.models;

import backend.models.base.OwnedModel;
import backend.models.questions.Question;
import com.fasterxml.jackson.annotation.JsonBackReference;
import java.util.List;
import javax.persistence.*;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;

@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = { "name", "creator_id" }))
public class Tag extends OwnedModel {
    @Column(nullable = false, length = 32)
    private String name;

    @ManyToMany(mappedBy = "tags", cascade = CascadeType.ALL)
    @JsonBackReference
    private List<Question> questions;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public List<Question> getQuestions() {
        return questions;
    }

    public void setQuestions(List<Question> questions) {
        this.questions = questions;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) return true;
        if (!(other instanceof Tag)) {
            return false;
        }
        Tag otherTag = (Tag) other;
        return new EqualsBuilder().append(name, otherTag.name).build();
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder().append(name).build();
    }
}
