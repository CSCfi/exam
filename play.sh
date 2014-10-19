#!/bin/bash
export TZ="UTC"
sudo -u sitnet /opt/sitnet/env/play/current/play -Dconfig.resource=production.conf -DapplyEvolutions.default=true