package models.dto;

/**
 * Created by avainik on 10.6.2014.
 */
public class InfoMessage {

    private String status;              // ERROR | Not found | OK
    private String description;         // Opintojaksoa XXXXX ei löydy
    private CourseUnitInfo courseUnitInfo;

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public CourseUnitInfo getCourseUnitInfo() {
        return courseUnitInfo;
    }

    public void setCourseUnitInfo(CourseUnitInfo courseUnitInfo) {
        this.courseUnitInfo = courseUnitInfo;
    }
}
