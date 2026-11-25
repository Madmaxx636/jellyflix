#include <QGuiApplication>
#include <QCryptographicHash>
#include <QNetworkAccessManager>
#include <QNetworkDiskCache>
#include <QNetworkReply>
#include <QQmlNetworkAccessManagerFactory>
#include <QSettings>
#include <QSslCertificate>
#include <QSslError>
#include <QStandardPaths>
#include <QLocalServer>
#include <QLocalSocket>
#include <QIcon>
#include <QQmlApplicationEngine>
#include <QQuickStyle>
#include <QQuickWindow>
#include <QSGRendererInterface>

namespace {
/// The network the pictures load through: a disk cache (posters come back at once on the next start) and the same rule for a server's
/// own certificate as everything else: accepted only if its fingerprint was trusted.
class PictureNetwork : public QQmlNetworkAccessManagerFactory {
public:
    QNetworkAccessManager *create(QObject *parent) override {
        auto *net = new QNetworkAccessManager(parent);
        auto *cache = new QNetworkDiskCache(net);
        cache->setCacheDirectory(QStandardPaths::writableLocation(QStandardPaths::CacheLocation) + "/pictures");
        cache->setMaximumCacheSize(300LL * 1024 * 1024);
        net->setCache(cache);
        QObject::connect(net, &QNetworkAccessManager::sslErrors, net, [](QNetworkReply *reply, const QList<QSslError> &errors) {
            QSettings settings("jellyflix", "jellyflix");
            const QStringList trusted = settings.value("trustedCertificates").toStringList();
            QSslCertificate cert = errors.isEmpty() ? QSslCertificate() : errors.first().certificate();
            if (cert.isNull()) cert = reply->sslConfiguration().peerCertificate();
            if (cert.isNull()) return;
            const QString print = QString::fromLatin1(cert.digest(QCryptographicHash::Sha256).toHex(':')).toUpper();
            if (trusted.contains(print)) reply->ignoreSslErrors();
        });
        return net;
    }
};
} // namespace

int main(int argc, char *argv[]) {
    // libmpv draws with OpenGL, so the scene graph has to as well.
    // (The test rig has no graphics card: with JELLYFLIX_HEADLESS=1 the software renderer is used and mpv decodes without a picture.)
    QQuickWindow::setGraphicsApi(qEnvironmentVariableIntValue("JELLYFLIX_HEADLESS") == 1 ? QSGRendererInterface::Software : QSGRendererInterface::OpenGL);
    QGuiApplication app(argc, argv);
    QGuiApplication::setApplicationName("Jellyflix");
    QGuiApplication::setOrganizationName("jellyflix");
    QGuiApplication::setApplicationVersion(QStringLiteral(JELLYFLIX_VERSION));
    QQuickStyle::setStyle("Basic");

    // One window: starting the app again brings the open one forward. (The test rig starts many and never meets this.)
    QLocalServer wake;
    if (qEnvironmentVariableIsEmpty("JELLYFLIX_TEST_SERVER")) {
        QLocalSocket probe;
        probe.connectToServer("jellyflix-window");
        if (probe.waitForConnected(300)) { probe.write("show"); probe.waitForBytesWritten(300); return 0; }
        QLocalServer::removeServer("jellyflix-window");
        wake.listen("jellyflix-window");
    }

    QQmlApplicationEngine engine;
    engine.setNetworkAccessManagerFactory(new PictureNetwork);
    QObject::connect(&wake, &QLocalServer::newConnection, &app, [&engine, &wake] {
        while (QLocalSocket *c = wake.nextPendingConnection()) c->deleteLater();
        for (QObject *root : engine.rootObjects()) if (auto *w = qobject_cast<QQuickWindow *>(root)) { w->show(); w->raise(); w->requestActivate(); }
    });
    QObject::connect(&engine, &QQmlApplicationEngine::objectCreationFailed, &app, [] { QCoreApplication::exit(1); }, Qt::QueuedConnection);
    engine.loadFromModule("Jellyflix", "Main");
    return app.exec();
}
