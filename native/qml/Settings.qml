pragma Singleton
import QtQuick
import Jellyflix

/// Every option on the Settings page, kept between runs.
QtObject {
    id: s
    property bool ready: false

    property bool autoplayNext: true
    property string skipIntro: "button"      // button, auto, off
    property string audioLang: ""
    property string subtitleMode: "foreign"  // off, foreign, always
    property string subtitleLang: "eng"
    property real speed: 1
    property string cardSize: "medium"
    property bool showHero: true
    property bool rotateHero: true
    property bool reduceMotion: false
    property real scale: 1
    property real controlsScale: 1
    property string hoverControls: "narrow"  // narrow, always, off
    property int controlsHide: 3
    property bool rememberVolume: true
    property string subSize: "medium"
    property string subColor: "white"
    property string subBackground: "shadow"
    property string externalPlayer: "auto"
    property string seasonalStyle: "classics"
    property bool rowContinue: true
    property bool rowNextUp: true
    property bool rowMyList: true
    property bool rowSeasonal: true
    property bool rowRecommended: true
    property bool rowRecent: true
    property bool rowTopRated: true
    property int genreRows: 6
    property string hwdec: "auto-safe"
    property string touchMode: "auto"       // auto, on, off
    property bool autoUpdate: true
    property bool touched: false           // the last thing used was a touch screen (not saved)

    readonly property var keys: ["autoplayNext", "skipIntro", "audioLang", "subtitleMode", "subtitleLang", "speed", "cardSize", "showHero", "rotateHero",
        "reduceMotion", "scale", "controlsScale", "hoverControls", "controlsHide", "rememberVolume", "subSize", "subColor", "subBackground", "externalPlayer",
        "seasonalStyle", "touchMode", "autoUpdate", "rowContinue", "rowNextUp", "rowMyList", "rowSeasonal", "rowRecommended", "rowRecent", "rowTopRated", "genreRows", "hwdec"]
    readonly property var defaults: ({})

    function load() {
        var saved = {}
        try { saved = JSON.parse(Backend.setting("settings", "{}")) } catch (e) { saved = {} }
        keys.forEach(function (k) { defaults[k] = s[k]; if (saved[k] !== undefined && typeof saved[k] === typeof s[k]) s[k] = saved[k] })
        Theme.cards = cardSize
        ready = true
    }
    function save() {
        if (!ready) return
        var out = {}
        keys.forEach(k => out[k] = s[k])
        Backend.setSetting("settings", JSON.stringify(out))
    }
    function reset() { keys.forEach(k => s[k] = defaults[k]); Theme.cards = cardSize; save() }

    onCardSizeChanged: { Theme.cards = cardSize; save() }
    onAutoplayNextChanged: save()
    onSkipIntroChanged: save()
    onAudioLangChanged: save()
    onSubtitleModeChanged: save()
    onSubtitleLangChanged: save()
    onSpeedChanged: save()
    onShowHeroChanged: save()
    onRotateHeroChanged: save()
    onReduceMotionChanged: save()
    onScaleChanged: save()
    onControlsScaleChanged: save()
    onHoverControlsChanged: save()
    onControlsHideChanged: save()
    onRememberVolumeChanged: save()
    onSubSizeChanged: save()
    onSubColorChanged: save()
    onSubBackgroundChanged: save()
    onExternalPlayerChanged: save()
    onSeasonalStyleChanged: save()
    onRowContinueChanged: save()
    onRowNextUpChanged: save()
    onRowMyListChanged: save()
    onRowSeasonalChanged: save()
    onRowRecommendedChanged: save()
    onRowRecentChanged: save()
    onRowTopRatedChanged: save()
    onGenreRowsChanged: save()
    onHwdecChanged: save()
    onTouchModeChanged: save()
    onAutoUpdateChanged: save()
}
