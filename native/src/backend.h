#pragma once
#include <QJSValue>
#include <QNetworkAccessManager>
#include <QObject>
#include <QSettings>
#include <QVariant>
#include <QtQml/qqmlregistration.h>

/**
 * What the QML pages can't do themselves: talk to the server over HTTPS (with trust-on-first-use for certificates the
 * server made itself), and keep settings between runs. The Jellyfin calls themselves are in qml/Api.qml.
 */
class Backend : public QObject {
    Q_OBJECT
    QML_ELEMENT
    QML_SINGLETON
    Q_PROPERTY(QString deviceId READ deviceId CONSTANT)
    Q_PROPERTY(QString deviceName READ deviceName CONSTANT)
    Q_PROPERTY(QString version READ version CONSTANT)
    Q_PROPERTY(QString iconReport READ iconReport CONSTANT)
    Q_PROPERTY(bool windowIconOk READ windowIconOk CONSTANT)
    Q_PROPERTY(bool testMode READ testMode CONSTANT)
    Q_PROPERTY(QString testServer READ testServer CONSTANT)
    Q_PROPERTY(QString shotsDir READ shotsDir CONSTANT)
    Q_PROPERTY(QString updateKind READ updateKind CONSTANT)
    Q_PROPERTY(QString updateUrl READ updateUrl CONSTANT)
public:
    explicit Backend(QObject *parent = nullptr);

    QString deviceId() const { return m_deviceId; }
    QString deviceName() const;
    QString version() const;
    QString iconReport() const;
    bool windowIconOk() const;
    /// Set by the test rig (JELLYFLIX_TEST_SERVER): the app signs in to a made-up server and checks itself. Never set in normal use.
    bool testMode() const { return !qEnvironmentVariableIsEmpty("JELLYFLIX_TEST_SERVER"); }
    QString testServer() const { return qEnvironmentVariable("JELLYFLIX_TEST_SERVER"); }
    /// With JELLYFLIX_SHOTS=<folder> the self-test saves a picture of each page in each look there.
    QString shotsDir() const { return qEnvironmentVariable("JELLYFLIX_SHOTS"); }

    /// Sends a request. The callback gets one object: {ok, status, data, error, cert}.
    /// `cert` is set when the server's certificate isn't trusted: {fingerprint, subject, issuer, validFrom, validTo}.
    Q_INVOKABLE void request(const QString &method, const QString &url, const QString &body, const QString &token, const QJSValue &callback);
    /// What kind of package updates this installation: "windows" (the installer), "deb", "rpm" or "pacman" (this system's package manager),
    /// or "" when the app was not installed from one of ours (then it can only point at the release page).
    QString updateKind() const;
    /// Where the newest release is announced (GitHub's API, or the test server's stand-in).
    QString updateUrl() const;
    /// Downloads [url] (GitHub only) into a private folder, checking its SHA-256 against [sha256] as it arrives.
    /// [progress] gets 0..1 as it goes; [done] gets {ok, path, error}.
    Q_INVOKABLE void downloadUpdate(const QString &url, const QString &fileName, const QString &sha256, const QJSValue &progress, const QJSValue &done);
    /// Installs a downloaded package and starts the new version. Returns what it will run (so the page can say so), or "" if it can't.
    Q_INVOKABLE QString installUpdate(const QString &path);
    Q_INVOKABLE void fetchText(const QString &url, const QJSValue &callback);
    /// A plain GET of a public address (no sign-in header: nothing about the server or the device is sent). Used for update checks.
    Q_INVOKABLE void fetchPublic(const QString &url, const QJSValue &callback);
    Q_INVOKABLE void openUrl(const QString &url);
    Q_INVOKABLE void trustCertificate(const QString &fingerprint);
    Q_INVOKABLE void forgetCertificates();
    Q_INVOKABLE int trustedCertificates() const;

    Q_INVOKABLE QVariant setting(const QString &key, const QVariant &fallback = QVariant()) const;
    Q_INVOKABLE void setSetting(const QString &key, const QVariant &value);
    Q_INVOKABLE void removeSetting(const QString &key);

    Q_INVOKABLE QObject *testFind(QObject *root, const QString &objectName) const { return root ? root->findChild<QObject *>(objectName) : nullptr; }
    Q_INVOKABLE QStringList externalPlayers() const;
    Q_INVOKABLE bool openExternal(const QString &player, const QString &url, const QString &title);

signals:
    /// The installation of an update ended; when it failed, [message] says why.
    void updateInstallFinished(bool ok, const QString &message);

private:
    QString authorization(const QString &token) const;
    QStringList trusted() const;

    QNetworkAccessManager m_net;
    mutable QSettings m_settings;
    QString m_deviceId;
};
