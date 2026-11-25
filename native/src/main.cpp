#include <QGuiApplication>
#include <QLocalServer>
#include <QLocalSocket>
#include <QIcon>
#include <QQmlApplicationEngine>
#include <QQuickStyle>
#include <QQuickWindow>
#include <QSGRendererInterface>

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
    QObject::connect(&wake, &QLocalServer::newConnection, &app, [&engine, &wake] {
        while (QLocalSocket *c = wake.nextPendingConnection()) c->deleteLater();
        for (QObject *root : engine.rootObjects()) if (auto *w = qobject_cast<QQuickWindow *>(root)) { w->show(); w->raise(); w->requestActivate(); }
    });
    QObject::connect(&engine, &QQmlApplicationEngine::objectCreationFailed, &app, [] { QCoreApplication::exit(1); }, Qt::QueuedConnection);
    engine.loadFromModule("Jellyflix", "Main");
    return app.exec();
}
