package models;

import com.avaje.ebean.Model;

import javax.persistence.MappedSuperclass;
import javax.persistence.Version;

@MappedSuperclass
public abstract class VersionedModel extends Model {

    @Version
    protected long objectVersion;

}
