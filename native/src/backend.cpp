#include "backend.h"

#include <QCoreApplication>
#include <QDesktopServices>
#include <QCryptographicHash>
#include <QDateTime>
#include <QJSEngine>
#include <QJsonDocument>
#include <QRegularExpression>
#include <QNetworkReply>
#include <QNetworkRequest>
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
