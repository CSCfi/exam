package models;

import javax.persistence.Entity;

@Entity
public class EvaluationPhrase extends SitnetModel {


    private String phrase;

    public EvaluationPhrase(User creator, String phrase) {
        super(creator);
        this.phrase = phrase;
    }

}
