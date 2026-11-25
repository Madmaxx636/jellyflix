#include "mpvitem.h"

#include <QOpenGLContext>
#include <QOpenGLFramebufferObject>
#include <QQuickWindow>
#include <clocale>

namespace {
void *getProcAddress(void *, const char *name) {
    QOpenGLContext *ctx = QOpenGLContext::currentContext();
    return ctx ? reinterpret_cast<void *>(ctx->getProcAddress(QByteArray(name))) : nullptr;
}

QVariant toVariant(const mpv_node &node);
QVariantList listOf(const mpv_node_list *list) {
    QVariantList out;
    for (int i = 0; i < list->num; ++i) out << toVariant(list->values[i]);
    return out;
}
QVariantMap mapOf(const mpv_node_list *list) {
    QVariantMap out;
    for (int i = 0; i < list->num; ++i) out[QString::fromUtf8(list->keys[i])] = toVariant(list->values[i]);
    return out;
}
QVariant toVariant(const mpv_node &node) {
    switch (node.format) {
    case MPV_FORMAT_STRING: return QString::fromUtf8(node.u.string);
    case MPV_FORMAT_FLAG: return bool(node.u.flag);
    case MPV_FORMAT_INT64: return qlonglong(node.u.int64);
    case MPV_FORMAT_DOUBLE: return node.u.double_;
    case MPV_FORMAT_NODE_ARRAY: return listOf(node.u.list);
    case MPV_FORMAT_NODE_MAP: return mapOf(node.u.list);
    default: return {};
    }
}
} // namespace

/// Draws mpv's picture into the item's framebuffer. It runs on Qt Quick's render thread.
class MpvRenderer : public QQuickFramebufferObject::Renderer {
public:
    explicit MpvRenderer(MpvItem *item) : m_item(item) {}
    ~MpvRenderer() override {
        if (m_ctx) mpv_render_context_free(m_ctx);
    }

    QOpenGLFramebufferObject *createFramebufferObject(const QSize &size) override {
        if (!m_ctx) {
            mpv_opengl_init_params gl{getProcAddress, nullptr};
            int advanced = 1;
            mpv_render_param params[]{
                {MPV_RENDER_PARAM_API_TYPE, const_cast<char *>(MPV_RENDER_API_TYPE_OPENGL)},
                {MPV_RENDER_PARAM_OPENGL_INIT_PARAMS, &gl},
                {MPV_RENDER_PARAM_ADVANCED_CONTROL, &advanced},
                {MPV_RENDER_PARAM_INVALID, nullptr},
            };
            if (mpv_render_context_create(&m_ctx, m_item->m_mpv, params) < 0) return QQuickFramebufferObject::Renderer::createFramebufferObject(size);
            mpv_render_context_set_update_callback(m_ctx, [](void *self) {
                auto *item = static_cast<MpvItem *>(self);
                QMetaObject::invokeMethod(item, [item] { item->update(); }, Qt::QueuedConnection);
            }, m_item);
        }
        return QQuickFramebufferObject::Renderer::createFramebufferObject(size);
    }

    void render() override {
        if (!m_ctx) return;
        QOpenGLFramebufferObject *fbo = framebufferObject();
        mpv_opengl_fbo target{static_cast<int>(fbo->handle()), fbo->width(), fbo->height(), 0};
        int flip = 0;
        mpv_render_param params[]{
            {MPV_RENDER_PARAM_OPENGL_FBO, &target},
            {MPV_RENDER_PARAM_FLIP_Y, &flip},
            {MPV_RENDER_PARAM_INVALID, nullptr},
        };
        mpv_render_context_render(m_ctx, params);
    }

private:
    MpvItem *m_item;
    mpv_render_context *m_ctx = nullptr;
};

MpvItem::MpvItem(QQuickItem *parent) : QQuickFramebufferObject(parent) {
    std::setlocale(LC_NUMERIC, "C"); // mpv insists on it
    m_mpv = mpv_create();
    mpv_set_option_string(m_mpv, "vo", "libmpv");
    mpv_set_option_string(m_mpv, "hwdec", "auto-safe");
    mpv_set_option_string(m_mpv, "keep-open", "no");
    mpv_set_option_string(m_mpv, "idle", "yes");
    mpv_set_option_string(m_mpv, "input-default-bindings", "no");
    mpv_set_option_string(m_mpv, "osc", "no");
    mpv_set_option_string(m_mpv, "cache", "yes");
    mpv_set_option_string(m_mpv, "demuxer-max-bytes", "150MiB");
    mpv_set_option_string(m_mpv, "demuxer-readahead-secs", "60");
    mpv_set_option_string(m_mpv, "sub-auto", "fuzzy");
    mpv_set_option_string(m_mpv, "slang", "eng,en");
    mpv_set_option_string(m_mpv, "network-timeout", "30");
    if (qEnvironmentVariableIntValue("JELLYFLIX_HEADLESS") == 1) { // the test rig: no picture, no sound
        mpv_set_option_string(m_mpv, "vo", "null");
        mpv_set_option_string(m_mpv, "ao", "null");
        mpv_set_option_string(m_mpv, "hwdec", "no");
    }
    mpv_initialize(m_mpv);
    mpv_observe_property(m_mpv, 0, "time-pos", MPV_FORMAT_DOUBLE);
    mpv_observe_property(m_mpv, 0, "duration", MPV_FORMAT_DOUBLE);
    mpv_observe_property(m_mpv, 0, "pause", MPV_FORMAT_FLAG);
    mpv_observe_property(m_mpv, 0, "paused-for-cache", MPV_FORMAT_FLAG);
    mpv_observe_property(m_mpv, 0, "core-idle", MPV_FORMAT_FLAG);
    mpv_observe_property(m_mpv, 0, "volume", MPV_FORMAT_DOUBLE);
    mpv_observe_property(m_mpv, 0, "mute", MPV_FORMAT_FLAG);
    mpv_observe_property(m_mpv, 0, "track-list", MPV_FORMAT_NODE);
    mpv_observe_property(m_mpv, 0, "demuxer-cache-time", MPV_FORMAT_DOUBLE);
    mpv_observe_property(m_mpv, 0, "hwdec-current", MPV_FORMAT_STRING);
    mpv_set_wakeup_callback(m_mpv, &MpvItem::wakeup, this);
}

MpvItem::~MpvItem() {
    // The one picture lives as long as the window. The render context (freed by the scene graph, possibly after this) must go
    // before the player, so the player is left for the process to clean up when the app exits.
    if (m_mpv) mpv_set_wakeup_callback(m_mpv, nullptr, nullptr);
}

QQuickFramebufferObject::Renderer *MpvItem::createRenderer() const {
    window()->setPersistentGraphics(true);
    window()->setPersistentSceneGraph(true);
    return new MpvRenderer(const_cast<MpvItem *>(this));
}

void MpvItem::wakeup(void *self) {
    QMetaObject::invokeMethod(static_cast<MpvItem *>(self), "processEvents", Qt::QueuedConnection);
}

void MpvItem::command(const QVariantList &args) {
    QList<QByteArray> storage;
    for (const QVariant &a : args) storage << a.toString().toUtf8();
    QVector<const char *> argv;
    for (const QByteArray &s : storage) argv << s.constData();
    argv << nullptr;
    mpv_command_async(m_mpv, 0, argv.data());
}

void MpvItem::load(const QString &url, double start) {
    m_error.clear();
    emit errorChanged();
    m_position = start;
    m_duration = 0;
    emit positionChanged();
    if (start > 1) mpv_set_option_string(m_mpv, "start", QByteArray::number(start, 'f', 1).constData());
    else mpv_set_option_string(m_mpv, "start", "0");
    command({"loadfile", url});
}

void MpvItem::stop() { command({"stop"}); }

void MpvItem::seek(double seconds, bool relative) {
    command({"seek", QString::number(seconds, 'f', 2), relative ? "relative" : "absolute", "exact"});
}

void MpvItem::setPaused(bool value) {
    int flag = value;
    mpv_set_property_async(m_mpv, 0, "pause", MPV_FORMAT_FLAG, &flag);
}

void MpvItem::setVolume(double value) {
    mpv_set_property_async(m_mpv, 0, "volume", MPV_FORMAT_DOUBLE, &value);
}

void MpvItem::setMuted(bool value) {
    int flag = value;
    mpv_set_property_async(m_mpv, 0, "mute", MPV_FORMAT_FLAG, &flag);
}

void MpvItem::setAudioTrack(int id) { command({"set", "aid", QString::number(id)}); }
void MpvItem::setSubtitleTrack(int id) { command({"set", "sid", id > 0 ? QString::number(id) : QString("no")}); }
void MpvItem::setSpeed(double speed) { command({"set", "speed", QString::number(speed)}); }
void MpvItem::setOption(const QString &name, const QString &value) { mpv_set_property_string(m_mpv, name.toUtf8().constData(), value.toUtf8().constData()); }

void MpvItem::refreshTracks() {
    mpv_node node;
    if (mpv_get_property(m_mpv, "track-list", MPV_FORMAT_NODE, &node) < 0) return;
    m_tracks = toVariant(node).toList();
    mpv_free_node_contents(&node);
    emit tracksChanged();
}

void MpvItem::processEvents() {
    while (m_mpv) {
        mpv_event *e = mpv_wait_event(m_mpv, 0);
        if (e->event_id == MPV_EVENT_NONE) break;
        switch (e->event_id) {
        case MPV_EVENT_PROPERTY_CHANGE: {
            auto *p = static_cast<mpv_event_property *>(e->data);
            const QByteArray name = p->name;
            if (p->format == MPV_FORMAT_NONE) break;
            if (name == "time-pos" && p->format == MPV_FORMAT_DOUBLE) { m_position = *static_cast<double *>(p->data); emit positionChanged(); }
            else if (name == "duration" && p->format == MPV_FORMAT_DOUBLE) { m_duration = *static_cast<double *>(p->data); emit durationChanged(); }
            else if (name == "pause" && p->format == MPV_FORMAT_FLAG) { m_paused = *static_cast<int *>(p->data); emit pausedChanged(); }
            else if ((name == "paused-for-cache" || name == "core-idle") && p->format == MPV_FORMAT_FLAG) {
                int cache = 0, idle = 0;
                mpv_get_property(m_mpv, "paused-for-cache", MPV_FORMAT_FLAG, &cache);
                mpv_get_property(m_mpv, "core-idle", MPV_FORMAT_FLAG, &idle);
                const bool now = cache || (idle && !m_paused);
                if (now != m_buffering) { m_buffering = now; emit bufferingChanged(); }
            }
            else if (name == "volume" && p->format == MPV_FORMAT_DOUBLE) { m_volume = *static_cast<double *>(p->data); emit volumeChanged(); }
            else if (name == "mute" && p->format == MPV_FORMAT_FLAG) { m_muted = *static_cast<int *>(p->data); emit mutedChanged(); }
            else if (name == "track-list") refreshTracks();
            else if (name == "demuxer-cache-time" && p->format == MPV_FORMAT_DOUBLE) { m_bufferedTo = *static_cast<double *>(p->data); emit bufferedToChanged(); }
            else if (name == "hwdec-current" && p->format == MPV_FORMAT_STRING) { m_hwdec = QString::fromUtf8(*static_cast<char **>(p->data)); emit hwdecChanged(); }
            break;
        }
        case MPV_EVENT_FILE_LOADED: emit started(); break;
        case MPV_EVENT_END_FILE: {
            auto *end = static_cast<mpv_event_end_file *>(e->data);
            if (end->reason == MPV_END_FILE_REASON_EOF) emit ended();
            else if (end->reason == MPV_END_FILE_REASON_ERROR) {
                m_error = QString("This video could not be played: %1").arg(QString::fromUtf8(mpv_error_string(end->error)));
                emit errorChanged();
            }
            break;
        }
        default: break;
        }
    }
}
