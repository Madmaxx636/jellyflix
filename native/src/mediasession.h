#pragma once
// What the rest of the desktop sees of the player: "now playing", the media keys, and whether the screen may go to sleep.
//   Linux:   MPRIS over D-Bus (org.mpris.MediaPlayer2.jellyflix). Keyboard media keys, headphone buttons,
//            the desktop's media widget, KDE Connect and playerctl all talk to this.
//            While a video plays it also asks the desktop's screen saver service to keep the screen on.
//   Windows: the media keys, registered as global hotkeys while something is playing, and the display kept on.
// (mpv does not do the screen part itself: it only does it for a window it opens, and here the app draws the picture.)
// The player page tells it what is playing (update) and listens for what the desktop asks for (the signals).
#include <QElapsedTimer>
#include <QObject>
#include <QString>
#include <QVariantMap>
#include <QtQml/qqmlregistration.h>
#ifdef Q_OS_LINUX
#include <QDBusAbstractAdaptor>
#include <QDBusObjectPath>
#endif
#ifdef Q_OS_WIN
#include <QAbstractNativeEventFilter>
#endif

class MediaSession : public QObject
#ifdef Q_OS_WIN
    , public QAbstractNativeEventFilter
#endif
{
    Q_OBJECT
    QML_ELEMENT
    QML_SINGLETON
    Q_PROPERTY(bool registered READ registered CONSTANT)
    Q_PROPERTY(QString report READ report CONSTANT)
    // True while the system is being asked to keep the screen on (a video is playing, not paused, no error or end card showing).
    Q_PROPERTY(bool keepAwake READ keepAwake NOTIFY keepAwakeChanged)
public:
    explicit MediaSession(QObject *parent = nullptr);
    ~MediaSession() override;

    bool registered() const { return m_registered; }
    QString report() const { return m_report; }
    bool keepAwake() const { return m_awake; }

    // status: "Playing", "Paused" or "Stopped". Lengths and positions are in seconds.
    Q_INVOKABLE void update(const QString &status, const QString &title, const QString &subtitle, const QString &artUrl,
                            double length, double position, bool canNext, bool canPrevious);
    Q_INVOKABLE void clear();
    // Used by the self-test: asks for the same things the desktop would, through the real bus.
    Q_INVOKABLE QString selfCheck();
    // Used by the self-test: waits for the system's answer to the request to keep the screen on. "OK", "SKIP ..." when this
    // system has nothing to ask (a test machine with no desktop), or what went wrong.
    Q_INVOKABLE QString awakeCheck();

signals:
    void keepAwakeChanged();
    void play();
    void pause();
    void playPause();
    void stop();
    void next();
    void previous();
    void seekBy(double seconds);
    void seekTo(double seconds);
    void raise();

public:
    // state the D-Bus side reads
    QString status = "Stopped", title, subtitle, artUrl;
    double length = 0, position = 0;
    bool canNext = false, canPrevious = false;
    double currentPosition() const;
    void announce(const QStringList &changed);
    bool m_registered = false;
    QString m_report;

#ifdef Q_OS_WIN
    bool nativeEventFilter(const QByteArray &type, void *message, qintptr *result) override;
#endif

private:
    QElapsedTimer m_since;
    void setKeysActive(bool on);
    bool m_keys = false;

    // The screen: asked to stay on while a video plays, let go otherwise.
    void setAwake(bool on);
    void applyAwake(bool on);
    bool m_awake = false;
#ifdef Q_OS_WIN
    bool m_awakeOk = true;   // Windows accepted the last request
#endif
#ifdef Q_OS_LINUX
    void inhibit(int way);
    void release(int way, uint cookie);
    bool m_held = false;     // the desktop has agreed, and gave back m_cookie to let go of it with
    uint m_cookie = 0;
    int m_way = 0;           // which of the desktop's services agreed
    int m_asking = 0;        // requests sent that have not been answered yet
#endif
};

#ifdef Q_OS_LINUX
class MprisRoot : public QDBusAbstractAdaptor {
    Q_OBJECT
    Q_CLASSINFO("D-Bus Interface", "org.mpris.MediaPlayer2")
    Q_PROPERTY(bool CanQuit READ canQuit)
    Q_PROPERTY(bool CanRaise READ canRaise)
    Q_PROPERTY(bool HasTrackList READ hasTrackList)
    Q_PROPERTY(QString Identity READ identity)
    Q_PROPERTY(QString DesktopEntry READ desktopEntry)
    Q_PROPERTY(QStringList SupportedUriSchemes READ schemes)
    Q_PROPERTY(QStringList SupportedMimeTypes READ mimes)
public:
    explicit MprisRoot(MediaSession *s) : QDBusAbstractAdaptor(s), s(s) {}
    bool canQuit() const { return false; }
    bool canRaise() const { return true; }
    bool hasTrackList() const { return false; }
    QString identity() const { return "Jellyflix"; }
    QString desktopEntry() const { return "jellyflix"; }
    QStringList schemes() const { return {}; }
    QStringList mimes() const { return {}; }
public slots:
    void Raise() { emit s->raise(); }
    void Quit() {}
private:
    MediaSession *s;
};

class MprisPlayer : public QDBusAbstractAdaptor {
    Q_OBJECT
    Q_CLASSINFO("D-Bus Interface", "org.mpris.MediaPlayer2.Player")
    Q_PROPERTY(QString PlaybackStatus READ playbackStatus)
    Q_PROPERTY(QString LoopStatus READ loopStatus WRITE setLoopStatus)
    Q_PROPERTY(double Rate READ rate WRITE setRate)
    Q_PROPERTY(bool Shuffle READ shuffle WRITE setShuffle)
    Q_PROPERTY(QVariantMap Metadata READ metadata)
    Q_PROPERTY(double Volume READ volume WRITE setVolume)
    Q_PROPERTY(qlonglong Position READ position)
    Q_PROPERTY(double MinimumRate READ rate)
    Q_PROPERTY(double MaximumRate READ rate)
    Q_PROPERTY(bool CanGoNext READ canGoNext)
    Q_PROPERTY(bool CanGoPrevious READ canGoPrevious)
    Q_PROPERTY(bool CanPlay READ always)
    Q_PROPERTY(bool CanPause READ always)
    Q_PROPERTY(bool CanSeek READ canSeek)
    Q_PROPERTY(bool CanControl READ always)
public:
    explicit MprisPlayer(MediaSession *s) : QDBusAbstractAdaptor(s), s(s) {}
    QString playbackStatus() const { return s->status; }
    QString loopStatus() const { return "None"; }
    void setLoopStatus(const QString &) {}
    double rate() const { return 1.0; }
    void setRate(double) {}
    bool shuffle() const { return false; }
    void setShuffle(bool) {}
    double volume() const { return 1.0; }
    void setVolume(double) {}
    QVariantMap metadata() const;
    qlonglong position() const { return qlonglong(s->currentPosition() * 1e6); }
    bool canGoNext() const { return s->canNext; }
    bool canGoPrevious() const { return s->canPrevious; }
    bool canSeek() const { return s->length > 0; }
    bool always() const { return true; }
public slots:
    void Next() { emit s->next(); }
    void Previous() { emit s->previous(); }
    void Pause() { emit s->pause(); }
    void PlayPause() { emit s->playPause(); }
    void Stop() { emit s->stop(); }
    void Play() { emit s->play(); }
    void Seek(qlonglong offset) { emit s->seekBy(offset / 1e6); }
    void SetPosition(const QDBusObjectPath &, qlonglong pos) { emit s->seekTo(pos / 1e6); }
    void OpenUri(const QString &) {}
signals:
    void Seeked(qlonglong position);
private:
    MediaSession *s;
};
#endif
