#include <QGuiApplication>
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

    QQmlApplicationEngine engine;
    QObject::connect(&engine, &QQmlApplicationEngine::objectCreationFailed, &app, [] { QCoreApplication::exit(1); }, Qt::QueuedConnection);
    engine.loadFromModule("Jellyflix", "Main");
    return app.exec();
}
