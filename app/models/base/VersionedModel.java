package models.base;

import io.ebean.Model;

import javax.persistence.MappedSuperclass;
import javax.persistence.Version;

@MappedSuperclass
public abstract class VersionedModel extends Model {

    @Version
    private long objectVersion;

    public long getObjectVersion() {
        return objectVersion;
    }

    public void setObjectVersion(long objectVersion) {
        this.objectVersion = objectVersion;
    }
}
