package models.questions;

import javax.persistence.Entity;

/**
 * Created by avainik on 3/6/14.
 */
@Entity
public class MathQuestion extends AbstractQuestion{


    @Override
    public String getName() {
        return "Essee: "+name +" id: "+ id;
    }

    public String toString()
    {
        return super.toString() + "alaluokka";
    }

}
