.import "http.js" as HTTP
.import "crypto.js" as CryptoJS
.import "promise.js" as Promise

var apiUrl = "https://external.api.yle.fi/v1";

// .env -> qmake -> DEFINES -> setContextProperty
var credentials = "app_id=" + appId + "&app_key=" + appKey;

var programsUrl = "/programs/items.json?" + credentials;
var categoriesUrl = "/programs/categories.json?" + credentials;
var programDetailsUrl = "/programs/items/1-820561.json" + "?" + credentials;
var mediaUrl = "/media/playouts.json?"+ credentials;
var trackingUrl = "/tracking/streamstart?" + credentials;
var currentBroadcastUrl = "/programs/schedules/now.json?" + credentials;
var servicesUrl = "/programs/services.json?" + credentials;

var filterAvailablePrograms = function(programs) {
    return programs.reduce(function(acc, program) {
        var foundPublicationEvents = program.publicationEvent.filter(function(event) {
            return event.temporalStatus === "currently" && event.type === "OnDemandPublication";
        });
        if (foundPublicationEvents.length) {
            program.publicationEvent = foundPublicationEvents[0];
            acc.push(program);
        }
        return acc;
    }, []);
}

var zeropad = function(str, size) {
    var s = str;
    while (s.length < size) s = "0" + s;
    return s;
}

var parseDuration = function(dur) {//PT1H58M45S
    if (!dur)
        return "";
    var d = dur.substr(2);
    var hi = d.indexOf("H");
    var mi = d.indexOf("M");
    var si = d.indexOf("S");
    var h = d.substr(0, hi);
    var m = zeropad(d.substring(hi+1, mi), 2);
    var s = zeropad(d.substr(mi+1, si >= 0 ? si-mi-1 : si).substr(0, 2), 2);
    return h ? ""+h+":"+m+":"+s : ""+m+":"+s;
}

var parseTime = function(str) {//2014-01-23T21:00:07+02:00
    var s = Qt.formatDateTime(new Date(str), "ddd dd.MM hh:mm")
    console.log(str+"->"+s)
    return s;
}

function arraySearch(arr, key, sub, val) {
    for (var i = 0; i < arr.count; i++) {
        if (sub && arr.get(i)[sub] && arr.get(i)[sub][key] === val)
            return i;
        if (arr.get(i)[key] === val)
            return i;
    }
//    console.log("startTime not found")
    return -1;
}

var findPubTime = function(arr) {
    if (!arr)
        return "";
    var i = arraySearch(arr, "temporalStatus", "", "currently");
    return i >= 0 ? parseTime(arr.get(i)["startTime"]) : "";
}

var mapPrograms = function(programs) {
    return programs.map(function(program) {
        return {
            id: program.id,
            title: program.title && program.title.fi,
            description: program.description && program.description.fi,
            duration: parseDuration(program.duration),
            time: program.publicationEvent && findPubTime(program.publicationEvent),
            mediaId: program.publicationEvent && program.publicationEvent.media && program.publicationEvent.media.id,
            image: program.image,
            seasonNumber: program.partOfSeason && program.partOfSeason.seasonNumber
                          ? program.partOfSeason.seasonNumber
                          : "",
            episodeNumber: program.episodeNumber ? program.episodeNumber : "",
            seriesId: program.partOfSeason && program.partOfSeason.id,
         };
    });
}

function getProgramById(id) {
    return HTTP.get(apiUrl + "/programs/items/" + id + ".json?" + credentials)
        .then(function(program) {
            console.log(JSON.stringify(program));
            return program;
        })
        .catch(function(error) {
            console.log(JSON.stringify(error));
            return {};
        })
}

function getProgramsByCategoryId(categoryId, limit, offset) {
    var url = apiUrl + programsUrl + '&category=' + categoryId + '&availability=ondemand&mediaobject=video&offset='+offset+'&limit='+limit;
    return HTTP.get(url)
        .then(function(response) {
            return filterAvailablePrograms(response.data);
        })
        .then(mapPrograms);
}

function getCategories() {
    var url = apiUrl + categoriesUrl;
    return HTTP.get(url)
        .then(function(res) {
            return res.data.map(function(category) {
                return {
                    id: category.id,
                    title: category.title.fi,
                    key: category.key
                };
            });
        });
}

function decryptUrl(url) {
    return CryptoJS.decrypt(url, decryptKey);
}

function getMediaUrl(programId, mediaId) {
    var url = apiUrl + mediaUrl + "&program_id=" + programId + "&media_id=" + mediaId + "&protocol=HLS";
    return HTTP.get(url)
        .then(function(res) {
            return res.data[0].url;
        })
        .then(decryptUrl);
}

function search(text) {
    var url = apiUrl + programsUrl + '&availability=ondemand&mediaobject=video' + '&q=' + text;
    console.log('requesting', url);
    return HTTP.get(url)
        .then(function(response) {
            return filterAvailablePrograms(response.data);
        })
        .then(mapPrograms)
        .catch(function(error) {
            console.log('search error', error);
            throw error;
        })
}

function reportUsage(programId, mediaId) {
    var url = apiUrl + trackingUrl + "&program_id=" + programId + "&media_id=" + mediaId;
    return HTTP.get(url);
}

function getServices() {
    var tvChannelsUrl = apiUrl + servicesUrl + "&type=tvchannel";
    var onDemandServiceUrl = apiUrl + servicesUrl + "&type=ondemandservice";
    var webcastServiceUrl = apiUrl + servicesUrl + "&type=webcastservice";

    return Promise.all([
        HTTP.get(tvChannelsUrl),
        HTTP.get(onDemandServiceUrl),
        HTTP.get(webcastServiceUrl)
    ])
        .then(function(response) {
            console.log(response);
            return response.reduce(function(acc, curr) {
                return acc.concat(curr.data);
            }, [])
        })
        .then(function(response) {
            return response.map(function(service) {
                return service.id;
            });
        })
        .catch(function(error) {
            console.log(JSON.stringify(error));
            return [];
        })
}

function getCurrentBroadcasts() {
    return getServices()
        .then(function(services) {
            var url = apiUrl + currentBroadcastUrl + "&service=" + services.join(',') + "&start=0&end=0";
            return HTTP.get(url)
                .then(function(response) {
                    return response.data.map(function(res) {
                        return res.content;
                    });
                })
                .then(filterAvailablePrograms)
                .then(mapPrograms)
                .catch(function(error) {
                    console.log(JSON.stringify(error));
                    return [];
                });
        });
}
