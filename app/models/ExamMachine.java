package models;

import com.fasterxml.jackson.annotation.JsonBackReference;

import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.ManyToOne;

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

    @Id
    @GeneratedValue(strategy= GenerationType.IDENTITY)
    private Long id;

	private String name;

    @ManyToOne
    @JsonBackReference
	private ExamRoom examRoom;
	
	private Reservation reservation;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

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
