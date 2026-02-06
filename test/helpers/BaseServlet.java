// Copyright (c) 2018 Exam Consortium
// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package helpers;

import jakarta.servlet.http.HttpServlet;
import net.jodah.concurrentunit.Waiter;

public class BaseServlet extends HttpServlet {

    protected static String calledMethod;
    protected Waiter waiter;

    public String getLastCallMethod() {
        String call = calledMethod;
        calledMethod = null;
        return call;
    }

    public void setWaiter(Waiter waiter) {
        this.waiter = waiter;
    }

    public Waiter getWaiter() {
        return waiter;
    }
}
