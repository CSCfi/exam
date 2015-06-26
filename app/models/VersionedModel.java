package models;

import play.db.ebean.Model;

import javax.persistence.*;

@MappedSuperclass
public abstract class VersionedModel extends Model {

    @Version
    protected long objectVersion;

}
