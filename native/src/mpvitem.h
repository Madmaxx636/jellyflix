#pragma once
#include <QQuickFramebufferObject>
#include <QVariant>
#include <QtQml/qqmlregistration.h>
#include <mpv/client.h>
#include <mpv/render_gl.h>

/**
 * A video picture drawn by libmpv. mpv decodes whatever the file holds (every codec, every audio and subtitle format) on
 * this computer, so nothing is ever converted by the server.
 */
class MpvItem : public QQuickFramebufferObject {
    Q_OBJECT
    QML_ELEMENT
    Q_PROPERTY(double position READ position NOTIFY positionChanged)
    Q_PROPERTY(double duration READ duration NOTIFY durationChanged)
    Q_PROPERTY(bool paused READ paused WRITE setPaused NOTIFY pausedChanged)
    Q_PROPERTY(bool buffering READ buffering NOTIFY bufferingChanged)
    Q_PROPERTY(double volume READ volume WRITE setVolume NOTIFY volumeChanged)
    Q_PROPERTY(bool muted READ muted WRITE setMuted NOTIFY mutedChanged)
    Q_PROPERTY(double bufferedTo READ bufferedTo NOTIFY bufferedToChanged)
    Q_PROPERTY(QVariantList tracks READ tracks NOTIFY tracksChanged)
    Q_PROPERTY(QString hwdec READ hwdec NOTIFY hwdecChanged)
    Q_PROPERTY(QString error READ error NOTIFY errorChanged)
public:
    explicit MpvItem(QQuickItem *parent = nullptr);
    ~MpvItem() override;
    Renderer *createRenderer() const override;

    double position() const { return m_position; }
    double duration() const { return m_duration; }
    bool paused() const { return m_paused; }
    bool buffering() const { return m_buffering; }
    double volume() const { return m_volume; }
    bool muted() const { return m_muted; }
    double bufferedTo() const { return m_bufferedTo; }
    QVariantList tracks() const { return m_tracks; }
    QString hwdec() const { return m_hwdec; }
    QString error() const { return m_error; }
    void setPaused(bool value);
    void setVolume(double value);
    void setMuted(bool value);

    /// Starts playing [url], from [start] seconds in. [headless] plays without sound and without a window of its own (tests).
    Q_INVOKABLE void load(const QString &url, double start);
    Q_INVOKABLE void stop();
    Q_INVOKABLE void seek(double seconds, bool relative = false);
    Q_INVOKABLE void setAudioTrack(int id);
    Q_INVOKABLE void setSubtitleTrack(int id); // 0 turns subtitles off
    Q_INVOKABLE void setSpeed(double speed);
    Q_INVOKABLE void setOption(const QString &name, const QString &value);

signals:
    void positionChanged();
    void durationChanged();
    void pausedChanged();
    void bufferingChanged();
    void volumeChanged();
    void mutedChanged();
    void bufferedToChanged();
    void tracksChanged();
    void hwdecChanged();
    void errorChanged();
    void started();
    void ended();

private slots:
    void processEvents();

private:
    friend class MpvRenderer;
    static void wakeup(void *self);
    void refreshTracks();
    void command(const QVariantList &args);

    mpv_handle *m_mpv = nullptr;
    double m_position = 0, m_duration = 0, m_volume = 100, m_bufferedTo = 0;
    bool m_paused = false, m_buffering = false, m_muted = false;
    QVariantList m_tracks;
    QString m_hwdec, m_error;
};
