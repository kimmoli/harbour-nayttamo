import QtQuick 2.0
import Sailfish.Silica 1.0

import "../js/yleApi.js" as YleApi

Page {
    id: page

    property var category: ({})
    property int offset: 0
    property int limit: 25

    Component.onCompleted: {
        console.log(category)
        YleApi.getProgramsByCategoryId(category.id, limit, offset)
            .then(function(programs) {
                console.log('programs', programs)
                listView.model = programs
            })
            .catch(function(error) {
                console.log('error', error)
                listView.model = []
            })
    }

    function getPrograms() {
        YleApi.getProgramsByCategoryId(category.id, limit, offset)
            .then(function(programs) {
                console.log('programs', programs)
                listView.model = programs
            })
            .catch(function(error) {
                console.log('error', error)
                listView.model = []
            })
    }

    // The effective value will be restricted by ApplicationWindow.allowedOrientations
    allowedOrientations: Orientation.All

    SilicaListView {
        id: listView
        model: []
        anchors.fill: parent
        header: PageHeader {
            title: qsTr("Programs")
        }

        PullDownMenu {
            MenuItem {
                text: qsTr("Previous page")
                enabled: offset > 0
                onClicked: {
                    console.log("Previous page")
                    offset -= limit;
                    getPrograms();
                }
            }
        }

        PushUpMenu {
            MenuItem {
                text: qsTr("Next page")
                enabled: listView.count === limit
                onClicked: {
                    console.log("Next page", listView.count, offset, limit)
                    offset += limit;
                    getPrograms();
                }
            }
        }

        delegate: ListItem {
            id: listItem
            contentWidth: page.width
            contentHeight: Math.ceil(9*contentWidth/3/16)

            Item {
                height: parent.height - 2 * Theme.paddingSmall
                width: parent.width - 2 * Theme.paddingMedium
                anchors {
                    top: parent.top
                    left: parent.left
                    topMargin: Theme.paddingSmall
                    leftMargin: Theme.paddingMedium
                }

                Rectangle {
                    id: img
                    color: "black"
                    height: parent.height
                    width: Math.ceil(height*16/9)
                    Image {
                        x: 0
                        y: 0
                        opacity: 1.0
                        sourceSize.width: parent.width
                        sourceSize.height: parent.height
                        source: modelData.image && modelData.image.id && modelData.image.available
                                                    ? "http://images.cdn.yle.fi/image/upload/w_" + parent.width + ",h_" + parent.height + ",c_fit/" + modelData.image.id + ".jpg"
                                                    : null
                    }
                    anchors.left: parent.left
                }

                Label {
                    id: title
                    color: Theme.primaryColor
                    text: modelData.title
                    font.bold: true
                    font.pixelSize: Theme.fontSizeExtraSmall
                    truncationMode: TruncationMode.Fade
                    anchors {
                        left: img.right
                        right: parent.right
                        leftMargin: Theme.paddingMedium
                    }
                }
                Label {
                    id: time
                    color: Theme.primaryColor
                    text: modelData.time
                    font.pixelSize: Theme.fontSizeTiny
                    anchors {
                        bottom: img.bottom
                        left: img.right
                        leftMargin: Theme.paddingMedium
                    }
                }
                Label {
                    id: duration
                    color: Theme.primaryColor
                    text: modelData.duration
                    font.pixelSize: Theme.fontSizeTiny
                    anchors {
                        right: parent.right
                        baseline: time.baseline
                    }
                }
            }

            onClicked: pageStack.push(Qt.resolvedUrl("PlayerPage.qml"), {
                                          "program": modelData
                                      })
        }
        VerticalScrollDecorator {}
    }
}
