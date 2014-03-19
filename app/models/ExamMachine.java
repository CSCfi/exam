package models;

/*
 * Tenttikone jolla opiskelija tekee tentin
 * Kone sijaitsee Tenttiakvaariossa
 * 
 */
public class ExamMachine {

	// TODO: varausaikataulu
	
	/* 
	 * jonkinlainen ID jolla kone tunnistetaan
	 * 
	 * Esim akvaario-koneenID  IT103-7
	 */
	private String name;
	
	private ExamRoom examRoom;
	
	private Reservation reservation;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public ExamRoom getExamRoom() {
        return examRoom;
    }

    public void setExamRoom(ExamRoom examRoom) {
        this.examRoom = examRoom;
    }

    public Reservation getReservation() {
        return reservation;
    }

    public void setReservation(Reservation reservation) {
        this.reservation = reservation;
    }
}
