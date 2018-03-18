import QtQuick 2.0
import Sailfish.Silica 1.0

import "../js/yleApi.js" as YleApi

Page {
    id: page

    Component.onCompleted: {
        YleApi.getCategories()
            .then(function(categories) {
                console.log('categories', JSON.stringify(categories))
                listView.model = categories;
            })
            .catch(function(error) {
                console.log('error', error)
            })
    }

    // The effective value will be restricted by ApplicationWindow.allowedOrientations
    allowedOrientations: Orientation.All

    SilicaListView {
        id: listView
        model: []
        anchors.fill: parent
        header: PageHeader {
            title: qsTr("Categories")
        }
        delegate: BackgroundItem {
            id: delegate

            Label {
                anchors.verticalCenter: parent.verticalCenter
                x: Theme.horizontalPageMargin
                text: modelData.title
            }
            onClicked: pageStack.push(Qt.resolvedUrl("ProgramsPage.qml"), {
                                          "category": modelData
                                      })
        }
        VerticalScrollDecorator {}
    }
}
