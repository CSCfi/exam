package models;

import javax.persistence.Entity;

@Entity
public class EvaluationPhrase extends SitnetModel {


    private String phrase;

    public EvaluationPhrase(User creator, String mimeType, String phrase) {
        super(creator, mimeType);
        this.phrase = phrase;
    }

}
