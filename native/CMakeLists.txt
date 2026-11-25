cmake_minimum_required(VERSION 3.21)
project(Jellyflix VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)

find_package(Qt6 6.5 REQUIRED COMPONENTS Core Gui Network Qml Quick QuickControls2 OpenGL)
# libmpv: found by its header and library rather than through pkg-config, which is not on every system (and not reliable on
# Windows, where its paths come out in the wrong form).
find_path(MPV_INCLUDE_DIR mpv/client.h HINTS /opt/homebrew/include /usr/local/include)
find_library(MPV_LIBRARY NAMES mpv libmpv libmpv.dll HINTS /opt/homebrew/lib /usr/local/lib)
if(NOT MPV_INCLUDE_DIR OR NOT MPV_LIBRARY)
    message(FATAL_ERROR "libmpv (the library and its headers) was not found")
endif()
add_library(mpv_lib INTERFACE)
target_include_directories(mpv_lib INTERFACE ${MPV_INCLUDE_DIR})
target_link_libraries(mpv_lib INTERFACE ${MPV_LIBRARY})

qt_standard_project_setup(REQUIRES 6.5)

qt_add_executable(jellyflix
    src/main.cpp
    src/backend.cpp
    src/backend.h
    src/mpvitem.cpp
    src/mpvitem.h
)

set_source_files_properties(qml/Api.qml qml/Theme.qml PROPERTIES QT_QML_SINGLETON_TYPE TRUE)

qt_add_qml_module(jellyflix
    URI Jellyflix
    VERSION 1.0
    QML_FILES
        qml/Main.qml
        qml/Login.qml
        qml/NavBar.qml
        qml/Home.qml
        qml/MediaRow.qml
        qml/Poster.qml
        qml/Details.qml
        qml/PlayerPage.qml
        qml/SettingsPage.qml
        qml/SearchPage.qml
        qml/LibraryPage.qml
        qml/CertDialog.qml
        qml/AutoTest.qml
        qml/FlatButton.qml
        qml/Api.qml
        qml/Theme.qml
        qml/Util.js
    SOURCES
        src/mpvitem.h
        src/backend.h
)

target_include_directories(jellyflix PRIVATE src)
target_compile_definitions(jellyflix PRIVATE JELLYFLIX_VERSION="${PROJECT_VERSION}")
target_link_libraries(jellyflix PRIVATE
    Qt6::Core Qt6::Gui Qt6::Network Qt6::Qml Qt6::Quick Qt6::QuickControls2 Qt6::OpenGL mpv_lib)

set_target_properties(jellyflix PROPERTIES
    MACOSX_BUNDLE ON
    MACOSX_BUNDLE_BUNDLE_NAME "Jellyflix"
    MACOSX_BUNDLE_GUI_IDENTIFIER "app.jellyflix.native"
    MACOSX_BUNDLE_BUNDLE_VERSION "${PROJECT_VERSION}"
    MACOSX_BUNDLE_SHORT_VERSION_STRING "${PROJECT_VERSION}"
    WIN32_EXECUTABLE ON # no console window
)

install(TARGETS jellyflix BUNDLE DESTINATION . RUNTIME DESTINATION bin)
