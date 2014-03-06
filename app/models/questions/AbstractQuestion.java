package models.questions;

import play.db.ebean.Model;

import javax.persistence.*;

/**
 * Created by avainik on 3/6/14.
 */
@Entity
@MappedSuperclass
abstract public class AbstractQuestion extends Model implements QuestionInterface {

    @Id
    @GeneratedValue(strategy= GenerationType.AUTO)
    protected Long id;

    protected String name;


    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setName(String name) {
        this.name = name;
    }

    @Override
    public String toString() {
        return "{" +
                "id=" + id +
                ", name='" + name + '\'' +
                '}';
    }
}
