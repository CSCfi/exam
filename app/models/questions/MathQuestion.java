package models.questions;

import javax.persistence.Entity;

/**
 * Created by avainik on 3/6/14.
 */
@Entity
public class MathQuestion extends AbstractQuestion{

    public MathQuestion() {
        this.type = this.getClass().getSimpleName();
    }



    @Override
    public String getType() {
        return this.type;
    }

    @Override
    public String generateHash() {
        return "MathQuestion: implement my hash";
    }
}
