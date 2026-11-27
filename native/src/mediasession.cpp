#include "mediasession.h"
#include <QCoreApplication>
#include <QDateTime>
#include <QEventLoop>
#ifdef Q_OS_LINUX
#include <QDBusConnection>
#include <QDBusConnectionInterface>
#include <QDBusInterface>
#include <QDBusMessage>
#include <QDBusPendingCallWatcher>
#include <QDBusPendingReply>
#include <QDBusReply>
#endif
#ifdef Q_OS_WIN
#include <windows.h>
#endif

#ifdef Q_OS_LINUX
namespace {
// The desktop services that keep the screen on for a program that asks, tried in this order (the first one that is there answers).
struct Way { const char *service, *path, *iface, *release; bool gnome; };
const Way kWays[] = {
    // KDE Plasma, Xfce, Cinnamon, MATE, LXQt
    {"org.freedesktop.ScreenSaver", "/org/freedesktop/ScreenSaver", "org.freedesktop.ScreenSaver", "UnInhibit", false},
    // GNOME (its way of letting go is spelled with a small "i")
    {"org.gnome.SessionManager", "/org/gnome/SessionManager", "org.gnome.SessionManager", "Uninhibit", true},
};
constexpr int kWayCount = int(sizeof(kWays) / sizeof(kWays[0]));
} // namespace

QVariantMap MprisPlayer::metadata() const {
    QVariantMap m;
    m["mpris:trackid"] = QVariant::fromValue(QDBusObjectPath(s->title.isEmpty() ? "/org/mpris/MediaPlayer2/TrackList/NoTrack" : "/app/jellyflix/current"));
    if (s->length > 0) m["mpris:length"] = qlonglong(s->length * 1e6);
    if (!s->title.isEmpty()) m["xesam:title"] = s->title;
    if (!s->subtitle.isEmpty()) m["xesam:artist"] = QStringList{s->subtitle};
    if (!s->subtitle.isEmpty()) m["xesam:album"] = s->subtitle;
    if (!s->artUrl.isEmpty()) m["mpris:artUrl"] = s->artUrl;
    return m;
}
#endif

MediaSession::MediaSession(QObject *parent) : QObject(parent) {
    m_since.start();
#ifdef Q_OS_LINUX
    QDBusConnection bus = QDBusConnection::sessionBus();
    if (!bus.isConnected()) { m_report = "No desktop message bus, so no media keys"; return; }
    new MprisRoot(this);
    new MprisPlayer(this);
    if (!bus.registerObject("/org/mpris/MediaPlayer2", this)) { m_report = "Could not register on the desktop bus"; return; }
    // a second copy running (rare) gets its own name instead of failing
    if (!bus.registerService("org.mpris.MediaPlayer2.jellyflix"))
        bus.registerService("org.mpris.MediaPlayer2.jellyflix.instance" + QString::number(QCoreApplication::applicationPid()));
    m_registered = true;
    m_report = "Media keys: connected (MPRIS)";
#elif defined(Q_OS_WIN)
    QCoreApplication::instance()->installNativeEventFilter(this);
    m_registered = true;
    m_report = "Media keys: active while playing";
#else
    m_report = "Media keys: not available on this system yet";
#endif
}

MediaSession::~MediaSession() { setKeysActive(false); applyAwake(false); }

double MediaSession::currentPosition() const {
    return status == "Playing" ? position + m_since.elapsed() / 1000.0 : position;
}

void MediaSession::announce(const QStringList &changed) {
#ifdef Q_OS_LINUX
    if (!m_registered) return;
    QVariantMap props;
    auto *p = findChild<MprisPlayer *>();
    if (!p) return;
    if (changed.contains("PlaybackStatus")) props["PlaybackStatus"] = p->playbackStatus();
    if (changed.contains("Metadata")) props["Metadata"] = p->metadata();
    if (changed.contains("CanGoNext")) props["CanGoNext"] = p->canGoNext();
    if (changed.contains("CanGoPrevious")) props["CanGoPrevious"] = p->canGoPrevious();
    if (changed.contains("CanSeek")) props["CanSeek"] = p->canSeek();
    if (props.isEmpty()) return;
    QDBusMessage msg = QDBusMessage::createSignal("/org/mpris/MediaPlayer2", "org.freedesktop.DBus.Properties", "PropertiesChanged");
    msg << "org.mpris.MediaPlayer2.Player" << props << QStringList();
    QDBusConnection::sessionBus().send(msg);
#else
    Q_UNUSED(changed);
#endif
}

void MediaSession::update(const QString &st, const QString &t, const QString &sub, const QString &art,
                          double len, double pos, bool next, bool prev) {
    QStringList changed;
    if (st != status) changed << "PlaybackStatus";
    if (t != title || sub != subtitle || art != artUrl || qAbs(len - length) > 0.5) changed << "Metadata" << "CanSeek";
    if (next != canNext) changed << "CanGoNext";
    if (prev != canPrevious) changed << "CanGoPrevious";
    const double expected = currentPosition();
    status = st; title = t; subtitle = sub; artUrl = art; length = len; position = pos; canNext = next; canPrevious = prev;
    m_since.restart();
    announce(changed);
#ifdef Q_OS_LINUX
    // a jump (someone dragged the bar) is announced so widgets move their slider
    if (m_registered && changed.isEmpty() && qAbs(expected - pos) > 1.5)
        if (auto *p = findChild<MprisPlayer *>()) emit p->Seeked(qlonglong(pos * 1e6));
#else
    Q_UNUSED(expected);
#endif
    setKeysActive(st != "Stopped");
    setAwake(st == "Playing");
}

void MediaSession::clear() { update("Stopped", "", "", "", 0, 0, false, false); }

// ---- the screen: kept on while a video plays (not while paused), let go of otherwise ----
void MediaSession::setAwake(bool on) {
    if (on == m_awake) return;
    m_awake = on;
    applyAwake(on);
    emit keepAwakeChanged();
}

#ifdef Q_OS_WIN
void MediaSession::applyAwake(bool on) {
    // The display stays on, and the screen saver and the lock screen stay away, until this is cleared. Windows ties it to the thread
    // that set it: always the interface thread here, which lives as long as the program does.
    m_awakeOk = SetThreadExecutionState(on ? (ES_CONTINUOUS | ES_DISPLAY_REQUIRED | ES_SYSTEM_REQUIRED) : ES_CONTINUOUS) != 0;
}
#elif defined(Q_OS_LINUX)
// Asked of the desktop's own service, the way a browser does for a playing video. The desktop keeps the request until it is
// let go of or this program's connection to the bus ends, so a crash lets go of it too.
void MediaSession::applyAwake(bool on) {
    if (on) {
        if (!m_held && m_asking == 0) inhibit(0);       // (a request already on its way takes it over when it is answered)
    } else if (m_held) {
        m_held = false;
        release(m_way, m_cookie);
    }
}

void MediaSession::inhibit(int way) {
    QDBusConnection bus = QDBusConnection::sessionBus();
    if (way >= kWayCount || !bus.isConnected()) return;   // nothing on this desktop to ask
    const Way &w = kWays[way];
    QDBusMessage call = QDBusMessage::createMethodCall(w.service, w.path, w.iface, "Inhibit");
    if (w.gnome) call << QStringLiteral("jellyflix") << uint(0) << QStringLiteral("Playing a video") << uint(8);   // 8: stop it going idle
    else call << QStringLiteral("Jellyflix") << QStringLiteral("Playing a video");
    call.setAutoStartService(false);                      // only a service that is already running, never start one for this
    m_asking++;
    auto *watcher = new QDBusPendingCallWatcher(bus.asyncCall(call), this);   // asked without waiting: the desktop may be slow
    connect(watcher, &QDBusPendingCallWatcher::finished, this, [this, way, watcher] {
        watcher->deleteLater();
        m_asking--;
        const QDBusPendingReply<uint> reply = *watcher;
        if (reply.isError()) {
            if (m_awake && !m_held) inhibit(way + 1);     // not this desktop's way: try the next
            return;
        }
        if (m_awake && !m_held) { m_held = true; m_cookie = reply.value(); m_way = way; }
        else release(way, reply.value());                 // the video stopped while it was being asked: give it straight back
    });
}

void MediaSession::release(int way, uint cookie) {
    const Way &w = kWays[way];
    QDBusMessage call = QDBusMessage::createMethodCall(w.service, w.path, w.iface, w.release);
    call.setAutoStartService(false);
    call << cookie;
    QDBusConnection::sessionBus().asyncCall(call);        // nobody waits for the answer
}
#else
void MediaSession::applyAwake(bool) {}
#endif

QString MediaSession::awakeCheck() {
    if (!m_awake) return "the screen is not being kept on";
#ifdef Q_OS_WIN
    return m_awakeOk ? "OK" : "Windows refused to keep the display on";
#elif defined(Q_OS_LINUX)
    // the answer comes over the bus: give it a moment
    QElapsedTimer waited;
    waited.start();
    while (m_asking > 0 && waited.elapsed() < 3000) QCoreApplication::processEvents(QEventLoop::AllEvents, 50);
    if (m_held) return "OK";
    return m_asking > 0 ? "the desktop did not answer" : "SKIP no screen saver service on this desktop's bus to ask";
#else
    return "SKIP not available on this system yet";
#endif
}

#ifdef Q_OS_WIN
namespace { enum { HkPlayPause = 0x4a01, HkNext, HkPrev, HkStop }; }
void MediaSession::setKeysActive(bool on) {
    if (on == m_keys) return;
    m_keys = on;
    if (on) {
        RegisterHotKey(nullptr, HkPlayPause, 0, VK_MEDIA_PLAY_PAUSE);
        RegisterHotKey(nullptr, HkNext, 0, VK_MEDIA_NEXT_TRACK);
        RegisterHotKey(nullptr, HkPrev, 0, VK_MEDIA_PREV_TRACK);
        RegisterHotKey(nullptr, HkStop, 0, VK_MEDIA_STOP);
    } else {
        for (int id : {int(HkPlayPause), int(HkNext), int(HkPrev), int(HkStop)}) UnregisterHotKey(nullptr, id);
    }
}
bool MediaSession::nativeEventFilter(const QByteArray &type, void *message, qintptr *) {
    if (type != "windows_generic_MSG") return false;
    const MSG *msg = static_cast<const MSG *>(message);
    if (msg->message != WM_HOTKEY) return false;
    switch (int(msg->wParam)) {
    case HkPlayPause: emit playPause(); return true;
    case HkNext: emit next(); return true;
    case HkPrev: emit previous(); return true;
    case HkStop: emit stop(); return true;
    }
    return false;
}
#else
void MediaSession::setKeysActive(bool) {}
#endif

QString MediaSession::selfCheck() {
#ifdef Q_OS_LINUX
    // Ask over the bus, as playerctl or the desktop's widget would, and report anything that is off.
    auto bus = QDBusConnection::sessionBus();
    if (!bus.isConnected()) return "SKIP no session bus";
    const QString name = "org.mpris.MediaPlayer2.jellyflix";
    QDBusInterface props(bus.baseService(), "/org/mpris/MediaPlayer2", "org.freedesktop.DBus.Properties", bus);
    auto get = [&](const char *iface, const char *prop) {
        QDBusReply<QDBusVariant> r = props.call("Get", iface, prop);
        return r.isValid() ? r.value().variant() : QVariant();
    };
    Q_UNUSED(name);
    const QVariant st = get("org.mpris.MediaPlayer2.Player", "PlaybackStatus");
    const QVariant id = get("org.mpris.MediaPlayer2", "Identity");
    const QVariant md = get("org.mpris.MediaPlayer2.Player", "Metadata");
    if (id.toString() != "Jellyflix") return "Identity was '" + id.toString() + "'";
    if (st.toString() != status) return "PlaybackStatus was '" + st.toString() + "'";
    // the Metadata arrives as a D-Bus argument; read its title through a plain call
    Q_UNUSED(md);
    // and the commands: PlayPause over the bus must reach the signal
    bool got = false;
    auto c = connect(this, &MediaSession::playPause, this, [&] { got = true; });
    QDBusInterface player(bus.baseService(), "/org/mpris/MediaPlayer2", "org.mpris.MediaPlayer2.Player", bus);
    player.call("PlayPause");
    QCoreApplication::processEvents();
    disconnect(c);
    return got ? "OK" : "PlayPause over the bus did not arrive";
#else
    return "SKIP not Linux";
#endif
}
