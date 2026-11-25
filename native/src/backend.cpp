#include "backend.h"
#include <QGuiApplication>
#include <QIcon>

#include <QCoreApplication>
#include <QDir>
#include <QFile>
#include <QTimer>
#include <QUrl>
#include <QDesktopServices>
#include <QCryptographicHash>
#include <QDateTime>
#include <QJSEngine>
#include <QJsonDocument>
#include <QRegularExpression>
#include <QNetworkReply>
#include <QFileInfo>
#include <QNetworkRequest>
#include <QProcess>
#include <QProcess>
#include <QSslCertificate>
#include <QSslConfiguration>
#include <QSslError>
#include <QStandardPaths>
#include <QSysInfo>
#include <QUrl>
#include <QUuid>

namespace {
QString fingerprintOf(const QSslCertificate &cert) {
    return QString::fromLatin1(cert.digest(QCryptographicHash::Sha256).toHex(':')).toUpper();
}

QString quoted(const QString &value) {
    return "\"" + QString::fromLatin1(QUrl::toPercentEncoding(value)) + "\"";
}

QString findProgram(const QString &name) {
    return QStandardPaths::findExecutable(name);
}
} // namespace

Backend::Backend(QObject *parent) : QObject(parent), m_settings("jellyflix", "jellyflix") {
    m_deviceId = m_settings.value("deviceId").toString();
    if (m_deviceId.isEmpty()) {
        m_deviceId = QUuid::createUuid().toString(QUuid::WithoutBraces);
        m_settings.setValue("deviceId", m_deviceId);
    }
}

QString Backend::deviceName() const { return QSysInfo::machineHostName(); }
bool Backend::windowIconOk() const { return !QGuiApplication::windowIcon().isNull() && !QGuiApplication::windowIcon().availableSizes().isEmpty(); }
QString Backend::iconReport() const {
    // What the desktop is being told, so a missing taskbar icon can be traced without guessing.
    return QStringLiteral("name %1, desktop file %2, icon %3, installed icon %4, session %5/%6")
        .arg(QCoreApplication::applicationName(), QGuiApplication::desktopFileName(), windowIconOk() ? "loaded" : "MISSING",
             QIcon::hasThemeIcon("jellyflix") ? "found" : "not found",
             qEnvironmentVariable("XDG_SESSION_TYPE", "?"), qEnvironmentVariable("XDG_CURRENT_DESKTOP", "?"));
}
QString Backend::version() const { return QCoreApplication::applicationVersion(); }

QString Backend::authorization(const QString &token) const {
    QString header = "MediaBrowser Client=" + quoted("Jellyflix") + ", Device=" + quoted(deviceName()) + ", DeviceId=" + quoted(m_deviceId) +
                     ", Version=" + quoted(version());
    if (!token.isEmpty()) header += ", Token=" + quoted(token);
    return header;
}

QStringList Backend::trusted() const { return m_settings.value("trustedCertificates").toStringList(); }
int Backend::trustedCertificates() const { return trusted().size(); }

void Backend::fetchPublic(const QString &url, const QJSValue &callback) {
    QNetworkRequest req{QUrl(url)};
    req.setRawHeader("Accept", "application/vnd.github+json");
    req.setRawHeader("User-Agent", "Jellyflix");
    req.setAttribute(QNetworkRequest::RedirectPolicyAttribute, QNetworkRequest::NoLessSafeRedirectPolicy);
    req.setTransferTimeout(15000);
    QNetworkReply *reply = m_net.get(req);
    connect(reply, &QNetworkReply::finished, this, [this, reply, callback]() mutable {
        const QByteArray bytes = reply->readAll();
        QVariantMap result;
        result["status"] = reply->attribute(QNetworkRequest::HttpStatusCodeAttribute).toInt();
        result["ok"] = reply->error() == QNetworkReply::NoError;
        if (!result["ok"].toBool()) result["error"] = reply->errorString();
        const QJsonDocument doc = QJsonDocument::fromJson(bytes);
        if (!doc.isNull()) result["data"] = doc.toVariant();
        reply->deleteLater();
        QJSValue cb = callback;
        if (cb.isCallable()) if (QJSEngine *engine = qjsEngine(this)) cb.call({engine->toScriptValue(result)});
    });
}

void Backend::openUrl(const QString &url) {
    const QUrl parsed(url);
    if (parsed.scheme() == "https" || parsed.scheme() == "http") QDesktopServices::openUrl(parsed);
}

void Backend::trustCertificate(const QString &fingerprint) {
    QStringList list = trusted();
    if (!list.contains(fingerprint)) list << fingerprint;
    m_settings.setValue("trustedCertificates", list);
}

void Backend::forgetCertificates() { m_settings.remove("trustedCertificates"); }

void Backend::request(const QString &method, const QString &url, const QString &body, const QString &token, const QJSValue &callback) {
    QNetworkRequest req{QUrl(url)};
    req.setRawHeader("Authorization", authorization(token).toUtf8());
    req.setRawHeader("Accept", "application/json");
    req.setAttribute(QNetworkRequest::RedirectPolicyAttribute, QNetworkRequest::NoLessSafeRedirectPolicy);
    req.setTransferTimeout(30000);
    if (!body.isEmpty()) req.setHeader(QNetworkRequest::ContentTypeHeader, "application/json");

    QNetworkReply *reply = nullptr;
    const QByteArray payload = body.toUtf8();
    if (method == "GET") reply = m_net.get(req);
    else if (method == "POST") reply = m_net.post(req, payload);
    else if (method == "DELETE") reply = m_net.deleteResource(req);
    else reply = m_net.sendCustomRequest(req, method.toUtf8(), payload);

    // The one certificate this exact server presented is accepted only if the person has trusted its fingerprint.
    const QStringList accepted = trusted();
    auto untrusted = std::make_shared<QVariantMap>();
    connect(reply, &QNetworkReply::sslErrors, reply, [reply, accepted, untrusted](const QList<QSslError> &errors) {
        const QSslCertificate leaf = errors.isEmpty() ? QSslCertificate() : errors.first().certificate();
        const QSslCertificate cert = leaf.isNull() && !reply->sslConfiguration().peerCertificate().isNull() ? reply->sslConfiguration().peerCertificate() : leaf;
        if (cert.isNull()) return;
        const QString print = fingerprintOf(cert);
        if (accepted.contains(print)) { reply->ignoreSslErrors(); return; }
        *untrusted = QVariantMap{
            {"fingerprint", print},
            {"subject", cert.subjectDisplayName().isEmpty() ? cert.subjectInfo(QSslCertificate::CommonName).value(0) : cert.subjectDisplayName()},
            {"issuer", cert.issuerDisplayName()},
            {"validFrom", cert.effectiveDate().toString(Qt::ISODate)},
            {"validTo", cert.expiryDate().toString(Qt::ISODate)},
        };
    });

    connect(reply, &QNetworkReply::finished, this, [this, reply, callback, untrusted]() mutable {
        const QByteArray bytes = reply->readAll();
        const int status = reply->attribute(QNetworkRequest::HttpStatusCodeAttribute).toInt();
        QVariantMap result;
        result["status"] = status;
        result["ok"] = reply->error() == QNetworkReply::NoError && status >= 200 && status < 300;
        if (!untrusted->isEmpty()) result["cert"] = *untrusted;
        if (!result["ok"].toBool()) result["error"] = reply->errorString();
        if (!bytes.isEmpty()) {
            QJsonParseError parse;
            const QJsonDocument doc = QJsonDocument::fromJson(bytes, &parse);
            if (parse.error == QJsonParseError::NoError) result["data"] = doc.toVariant();
            else result["text"] = QString::fromUtf8(bytes.left(2000));
        }
        reply->deleteLater();
        QJSValue cb = callback;
        if (cb.isCallable()) {
            QJSEngine *engine = qjsEngine(this);
            if (engine) cb.call({engine->toScriptValue(result)});
        }
    });
}

QVariant Backend::setting(const QString &key, const QVariant &fallback) const { return m_settings.value(key, fallback); }
void Backend::setSetting(const QString &key, const QVariant &value) { m_settings.setValue(key, value); }
void Backend::removeSetting(const QString &key) { m_settings.remove(key); }

QStringList Backend::externalPlayers() const {
    QStringList found;
    if (!findProgram("mpv").isEmpty()) found << "mpv";
    if (!findProgram("vlc").isEmpty()) found << "vlc";
    return found;
}

bool Backend::openExternal(const QString &player, const QString &url, const QString &title) {
    const QUrl parsed(url);
    if (parsed.scheme() != "http" && parsed.scheme() != "https") return false;
    const QString program = findProgram(player);
    if (program.isEmpty()) return false;
    const QString shown = QString(title).replace(QRegularExpression("[\\r\\n]+"), " ").left(200);
    const QStringList args = player == "mpv" ? QStringList{"--force-media-title=" + shown, "--", url} : QStringList{"--meta-title=" + shown, "--", url};
    return QProcess::startDetached(program, args);
}

// ---------------------------------------------------------------- updates

QString Backend::updateUrl() const {
    const QString test = qEnvironmentVariable("JELLYFLIX_UPDATE_URL");
    return test.isEmpty() ? QStringLiteral("https://api.github.com/repos/Madmaxx636/jellyflix/releases/latest") : test;
}

QString Backend::updateKind() const {
#if defined(Q_OS_WIN)
    return "windows";
#elif defined(Q_OS_MACOS)
    return "";
#else
    // Only a copy installed from our own package can be updated by installing the next one.
    const bool installed = QCoreApplication::applicationFilePath().startsWith("/opt/jellyflix/") || !qEnvironmentVariableIsEmpty("JELLYFLIX_TEST_SERVER");
    if (!installed) return "";
    QString like;
    QFile release("/etc/os-release");
    if (release.open(QIODevice::ReadOnly)) {
        for (const QByteArray &line : release.readAll().split('\n'))
            if (line.startsWith("ID=") || line.startsWith("ID_LIKE=")) like += " " + QString::fromUtf8(line.mid(line.indexOf('=') + 1)).remove('"').toLower();
    }
    auto has = [](const char *p) { return !QStandardPaths::findExecutable(p).isEmpty(); };
    if (like.contains("debian") || like.contains("ubuntu")) return "deb";
    if (like.contains("arch")) return "pacman";
    if (like.contains("fedora") || like.contains("rhel") || like.contains("suse") || like.contains("centos")) return "rpm";
    if (has("dpkg")) return "deb";
    if (has("pacman")) return "pacman";
    if (has("dnf") || has("zypper") || has("rpm")) return "rpm";
    return "";
#endif
}

namespace {
bool allowedUpdateHost(const QUrl &url) {
    if (!qEnvironmentVariableIsEmpty("JELLYFLIX_TEST_SERVER") && (url.host() == "127.0.0.1" || url.host() == "localhost")) return true;
    if (url.scheme() != "https") return false;
    const QString host = url.host().toLower();
    return host == "github.com" || host.endsWith(".github.com") || host.endsWith(".githubusercontent.com");
}
} // namespace

void Backend::fetchText(const QString &url, const QJSValue &callback) {
    const QUrl parsed(url);
    QVariantMap result;
    if (!allowedUpdateHost(parsed)) { result["ok"] = false; result["error"] = "That address is not allowed."; QJSValue cb = callback; if (cb.isCallable()) if (QJSEngine *e = qjsEngine(this)) cb.call({e->toScriptValue(result)}); return; }
    QNetworkRequest req{parsed};
    req.setRawHeader("User-Agent", "Jellyflix");
    req.setAttribute(QNetworkRequest::RedirectPolicyAttribute, QNetworkRequest::NoLessSafeRedirectPolicy);
    req.setTransferTimeout(20000);
    QNetworkReply *reply = m_net.get(req);
    connect(reply, &QNetworkReply::finished, this, [this, reply, callback]() mutable {
        QVariantMap r;
        r["ok"] = reply->error() == QNetworkReply::NoError;
        r["text"] = QString::fromUtf8(reply->readAll());
        if (!r["ok"].toBool()) r["error"] = reply->errorString();
        reply->deleteLater();
        QJSValue cb = callback;
        if (cb.isCallable()) if (QJSEngine *e = qjsEngine(this)) cb.call({e->toScriptValue(r)});
    });
}

void Backend::downloadUpdate(const QString &url, const QString &fileName, const QString &sha256, const QJSValue &progress, const QJSValue &done) {
    auto finish = [this, done](const QVariantMap &r) { QJSValue cb = done; if (cb.isCallable()) if (QJSEngine *e = qjsEngine(this)) cb.call({e->toScriptValue(r)}); };
    const QUrl parsed(url);
    const QString safeName = QFileInfo(fileName).fileName();   // no folders in the name
    if (!allowedUpdateHost(parsed) || safeName.isEmpty() || sha256.size() != 64) { finish({{"ok", false}, {"error", "This update can't be downloaded safely."}}); return; }
    QDir dir(QStandardPaths::writableLocation(QStandardPaths::TempLocation) + "/jellyflix-update");
    dir.removeRecursively();
    dir.mkpath(".");
    auto *file = new QFile(dir.filePath(safeName));
    if (!file->open(QIODevice::WriteOnly)) { delete file; finish({{"ok", false}, {"error", "Couldn't write the download to disk."}}); return; }
    QNetworkRequest req{parsed};
    req.setRawHeader("User-Agent", "Jellyflix");
    req.setAttribute(QNetworkRequest::RedirectPolicyAttribute, QNetworkRequest::NoLessSafeRedirectPolicy);
    req.setTransferTimeout(60000);
    QNetworkReply *reply = m_net.get(req);
    auto hash = std::make_shared<QCryptographicHash>(QCryptographicHash::Sha256);
    connect(reply, &QNetworkReply::readyRead, this, [reply, file, hash]() { const QByteArray chunk = reply->readAll(); hash->addData(chunk); file->write(chunk); });
    connect(reply, &QNetworkReply::downloadProgress, this, [this, progress](qint64 got, qint64 total) {
        QJSValue cb = progress;
        if (total > 0 && cb.isCallable()) if (QJSEngine *e = qjsEngine(this)) cb.call({double(got) / double(total)});
    });
    connect(reply, &QNetworkReply::finished, this, [reply, file, hash, sha256, finish]() mutable {
        file->write(reply->readAll());
        file->close();
        const QString path = file->fileName();
        const bool ok = reply->error() == QNetworkReply::NoError;
        const QString error = reply->errorString();
        reply->deleteLater();
        file->deleteLater();
        if (!ok) { QFile::remove(path); finish({{"ok", false}, {"error", "The download failed: " + error}}); return; }
        const QString actual = QString::fromLatin1(hash->result().toHex());
        if (actual.compare(sha256, Qt::CaseInsensitive) != 0) { QFile::remove(path); finish({{"ok", false}, {"error", "The download doesn't match its checksum, so it was thrown away."}}); return; }
        finish({{"ok", true}, {"path", path}});
    });
}

QString Backend::installUpdate(const QString &path) {
    const QString kind = updateKind();
    if (kind.isEmpty() || !QFile::exists(path)) return {};
    const bool dry = qEnvironmentVariableIntValue("JELLYFLIX_UPDATE_DRYRUN") == 1;
    QString program;
    QStringList args;
    if (kind == "windows") {
        // The installer closes this program, replaces it, and starts the new one (see jellyflix.iss).
        program = path;
        args = {"/SILENT", "/SUPPRESSMSGBOXES", "/NORESTART", "/CLOSEAPPLICATIONS", "/RELAUNCH=1"};
    } else if (kind == "deb") { program = "pkexec"; args = {"env", "DEBIAN_FRONTEND=noninteractive", "apt-get", "install", "-y", path}; }
    else if (kind == "pacman") { program = "pkexec"; args = {"pacman", "-U", "--noconfirm", path}; }
    else if (!QStandardPaths::findExecutable("dnf").isEmpty()) { program = "pkexec"; args = {"dnf", "install", "-y", path}; }
    else { program = "pkexec"; args = {"zypper", "--non-interactive", "install", "--allow-unsigned-rpm", path}; }
    const QString shown = program + " " + args.join(" ");
    if (dry) { QTimer::singleShot(50, this, [this, shown] { emit updateInstallFinished(true, "would run: " + shown); }); return shown; }

    if (kind == "windows") {
        if (!QProcess::startDetached(program, args)) return {};
        QTimer::singleShot(400, qApp, &QCoreApplication::quit);   // the installer needs this program closed
        return shown;
    }
    if (QStandardPaths::findExecutable(program).isEmpty()) return {};
    auto *p = new QProcess(this);
    connect(p, &QProcess::finished, this, [this, p](int code, QProcess::ExitStatus) {
        const QString err = QString::fromUtf8(p->readAllStandardError()).trimmed();
        p->deleteLater();
        if (code == 0) {
            // start the new version a moment after this one has gone, so it isn't mistaken for a second window
            QProcess::startDetached("/bin/sh", {"-c", "sleep 1; exec /usr/bin/jellyflix"});
            emit updateInstallFinished(true, QString());
            QTimer::singleShot(200, qApp, &QCoreApplication::quit);
        } else {
            emit updateInstallFinished(false, code == 126 || code == 127 ? "The update was not allowed (the password prompt was cancelled)." : "The package manager stopped: " + err.left(300));
        }
    });
    p->start(program, args);
    return shown;
}
