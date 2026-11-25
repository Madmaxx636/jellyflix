import QtQuick
import QtQuick.Shapes

/// The same icons as the web-engine app, drawn from the same paths (24 x 24, 2 px lines).
Item {
    id: icon
    property string name: "play"
    property int size: 20
    property color color: "white"
    width: size; height: size

    function circle(cx, cy, r) { return "M" + (cx - r) + " " + cy + "a" + r + " " + r + " 0 1 0 " + (2 * r) + " 0a" + r + " " + r + " 0 1 0 " + (-2 * r) + " 0z" }
    readonly property var gear: {
        var pts = []
        for (var t = 0; t < 8; t++) for (var o of [[-0.2, 7], [-0.12, 9.6], [0.12, 9.6], [0.2, 7]]) {
            var a = ((t + o[0]) / 8) * 2 * Math.PI
            pts.push((12 + o[1] * Math.sin(a)).toFixed(2) + " " + (12 - o[1] * Math.cos(a)).toFixed(2))
        }
        return "M" + pts.join("L") + "Z"
    }
    // [path, solid]
    readonly property var shapes: ({
        "home": [["M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"]],
        "search": [[circle(11, 11, 7)], ["M21 21l-4.3-4.3"]],
        "plus": [["M12 5v14M5 12h14"]],
        "check": [["M5 12.5l4.5 4.5L19 7.5"]],
        "play": [["M7 4.5v15l13-7.5z", true]],
        "pause": [["M6.5 4h4v16h-4zM13.5 4h4v16h-4z", true]],
        "film": [["M4 4h16v16H4zM8 4v16M16 4v16M4 8.5h4M4 15.5h4M16 8.5h4M16 15.5h4"]],
        "tv": [["M3 6h18v11H3zM8 21h8M12 17v4"]],
        "grid": [["M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"]],
        "sliders": [["M4 6h9M19 6h1M4 12h3M13 12h7M4 18h11M21 18h-1"], [circle(16, 6, 2)], [circle(10, 12, 2)], [circle(18, 18, 2)]],
        "user": [[circle(12, 8, 4)], ["M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"]],
        "volume": [["M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z", true], ["M15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"]],
        "mute": [["M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z", true], ["M16 9.5l5 5M21 9.5l-5 5"]],
        "fullscreen": [["M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"]],
        "exit-fullscreen": [["M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"]],
        "back10": [["M12 5a8 8 0 1 1-8 8"], ["M12 1.5L8 5l4 3.5"]],
        "fwd10": [["M12 5a8 8 0 1 0 8 8"], ["M12 1.5L16 5l-4 3.5"]],
        "speed": [["M4 17a8 8 0 1 1 16 0"], ["M12 17l4-5"]],
        "next": [["M5 5v14l10-7z", true], ["M19 5v14"]],
        "episodes": [["M4 6h16M4 12h16M4 18h9"]],
        "chevron": [["M6 9l6 6 6-6"]],
        "x": [["M6 6l12 12M18 6L6 18"]],
        "info": [[circle(12, 12, 9)], ["M12 11v6M12 7.5v.01"]],
        "eye": [["M2 12s3.7-7 10-7 10 7 10 7-3.7 7-10 7S2 12 2 12z"], [circle(12, 12, 3)]],
        "left": [["M15 5l-7 7 7 7"]],
        "right": [["M9 5l7 7-7 7"]],
        "menu": [["M4 7h16M4 12h16M4 17h16"]],
        "external": [["M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"]],
        "settings": [[gear], [circle(12, 12, 3)]],
        "speech": [["M4 4.5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-8l-5 4v-4H4a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1z"], ["M7 9h10M7 12.5h6"]]
    })
    readonly property var parts: shapes[name] || []

    Item {
        width: 24; height: 24; scale: icon.size / 24; transformOrigin: Item.TopLeft
        Repeater {
            model: icon.parts
            delegate: Shape {
                width: 24; height: 24
                preferredRendererType: Shape.CurveRenderer
                ShapePath {
                    strokeColor: modelData[1] ? "transparent" : icon.color
                    fillColor: modelData[1] ? icon.color : "transparent"
                    strokeWidth: 2; capStyle: ShapePath.RoundCap; joinStyle: ShapePath.RoundJoin
                    PathSvg { path: modelData[0] }
                }
            }
        }
        Text { visible: icon.name === "back10" || icon.name === "fwd10"; x: 0; y: 9; width: 24; horizontalAlignment: Text.AlignHCenter; text: "10"; color: icon.color; font.pixelSize: 7; font.bold: true }
    }
}
