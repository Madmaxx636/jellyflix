#!/bin/sh
# Refresh what the desktop remembers about icons and menu entries, so the new icon shows at once.
gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor >/dev/null 2>&1 || true
update-desktop-database -q /usr/share/applications >/dev/null 2>&1 || true
exit 0
