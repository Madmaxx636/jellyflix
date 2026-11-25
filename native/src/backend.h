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
    Q_PROPERTY(bool testMode READ testMode CONSTANT)
    Q_PROPERTY(QString testServer READ testServer CONSTANT)
    Q_PROPERTY(QString shotsDir READ shotsDir CONSTANT)
public:
    explicit Backend(QObject *parent = nullptr);

    QString deviceId() const { return m_deviceId; }
    QString deviceName() const;
    QString version() const;
    /// Set by the test rig (JELLYFLIX_TEST_SERVER): the app signs in to a made-up server and checks itself. Never set in normal use.
    bool testMode() const { return !qEnvironmentVariableIsEmpty("JELLYFLIX_TEST_SERVER"); }
    QString testServer() const { return qEnvironmentVariable("JELLYFLIX_TEST_SERVER"); }
    /// With JELLYFLIX_SHOTS=<folder> the self-test saves a picture of each page in each look there.
    QString shotsDir() const { return qEnvironmentVariable("JELLYFLIX_SHOTS"); }

    /// Sends a request. The callback gets one object: {ok, status, data, error, cert}.
    /// `cert` is set when the server's certificate isn't trusted: {fingerprint, subject, issuer, validFrom, validTo}.
    Q_INVOKABLE void request(const QString &method, const QString &url, const QString &body, const QString &token, const QJSValue &callback);
    Q_INVOKABLE void trustCertificate(const QString &fingerprint);
    Q_INVOKABLE void forgetCertificates();
    Q_INVOKABLE int trustedCertificates() const;

    Q_INVOKABLE QVariant setting(const QString &key, const QVariant &fallback = QVariant()) const;
    Q_INVOKABLE void setSetting(const QString &key, const QVariant &value);
    Q_INVOKABLE void removeSetting(const QString &key);

    Q_INVOKABLE QObject *testFind(QObject *root, const QString &objectName) const { return root ? root->findChild<QObject *>(objectName) : nullptr; }
    Q_INVOKABLE QStringList externalPlayers() const;
    Q_INVOKABLE bool openExternal(const QString &player, const QString &url, const QString &title);

private:
    QString authorization(const QString &token) const;
    QStringList trusted() const;

    QNetworkAccessManager m_net;
    mutable QSettings m_settings;
    QString m_deviceId;
};
