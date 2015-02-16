package models;

import models.questions.AbstractQuestion;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
public class Tag extends SitnetModel {

    @Column(unique = true, nullable = false, length = 32)
	private String name;

    @ManyToMany(mappedBy = "tags", cascade = CascadeType.ALL)
    private List<AbstractQuestion> questions = new ArrayList<>();

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

    public List<AbstractQuestion> getQuestions() {
        return questions;
    }

    public void setQuestions(List<AbstractQuestion> questions) {
        this.questions = questions;
    }

}
