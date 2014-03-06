package models.questions;

import javax.persistence.Entity;

/**
 * Created by avainik on 3/6/14.
 */
@Entity
public class Essay extends AbstractQuestion{


//    public Essay() {
//    }

    @Override
    public String getName() {
        return "Essee: "+name +" id: "+ id;
    }

    public String toString()
    {
        return "Essay "+ super.toString();
    }
}
