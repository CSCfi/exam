#!/bin/bash
sudo -u sitnet /opt/sitnet/env/activator/current/activator -Dconfig.file=conf/production.conf -DapplyEvolutions.default=true