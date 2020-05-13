const DOM_EVENTS_ELEMENT_ID = "ws_events";
let isPlaying = false;
let eventsAll = [];
let eventsShowing = [];

const fetchStoredEvents = (eventName, limit = 100) => {
    return fetch(`/api/stored-events/${eventName}/${limit}`, {
        "method": "get",
        "headers": {
            "Content-Type": "application/json",
            "Accepts": "application/json"
        }
    }).then(resp => resp.json());
}

const mapStoredEvents = events => {
    if (!events.data || !events.data || !events.data.records.length) return [];
    const data = events.data.records.map((record, idx) => {
        return {
            "msg": `${record.attributes.type} - ${record.Username} - ${record.EventDate}`,
            "index": record.EventIdentifier,
            "expandable": true,
            "attributes": events.fields.sort().map(f => `${f} = ${record[f]}`).join("\n")
        }
    })
    return data;
}

const htmlExpandableElement = obj => {
    const mainBody = `<div class="fluid-container p-2 mt-1 event-container" id="event_${obj.index}" expandable="${obj.expandable ? "true" : "false"}">
<div class="row pl-2">
    <div class="col-sm-10">
        ${obj.msg}
    </div>
    <div class="col-sm-2">
        ${obj.expandable ? `<a href="javascript:void(0)" id="event_link_${obj.index}" class="btn btn-primary float-right" data-toggle="collapse">Expand</a>`: ""}
    </div>
    <div id="event_details_${obj.index}" class="event-expandable collapse">
        <div class="ml-2 mr-3 mt-2 row clearfix event-details">
            <pre class="col-sm-12"><code>${obj.hasOwnProperty("attributes") ? obj.attributes : attributes}</code></pre>
        </div>
    </div>
</div>
</div>`;
    return mainBody;
}

const htmlExpandableElements = objs => {
    // build ui representation
    const uiHTML = objs.filter(obj => undefined !== obj).reduce((buffer, ev) => {
        return buffer + htmlExpandableElement(ev);
    }, "");
    return uiHTML;
}

const rebuildExpandableElementsFromData = (data) => {
    // build ui representation
    const uiHTML = htmlExpandableElements(data);

    // set html
    document.querySelector(`#${DOM_EVENTS_ELEMENT_ID}`).innerHTML = uiHTML;
}

const addExpandableElementsClickHandler = () => {
    // add click handler to handle expand/collapse
    document.querySelector(`#${DOM_EVENTS_ELEMENT_ID}`).addEventListener("click", (ev) => {
        let id = ev.target.id;
        let elem = ev.target;
        while (!id) {
            id = elem.parentNode.id;
            elem = elem.parentNode;
        }
        if (!id) return;
        id = id.substr(id.lastIndexOf("_")+1);
        console.log(`Detected click for ID: ${id}`);

        const elemMain = $(`#event_${id}`);
        const expandable = elemMain.attr("expandable");
        if (expandable && expandable.charAt(0) == "t") {
            
        } else {
            console.log("Clicked non-expandable - returning...");
            return;
        }

        const elemDetails = $(`#event_details_${id}`);
        if (elemDetails.hasClass("expand")) {
            console.log(`Collapsing ID ${id}`);
            elemDetails.removeClass("expand").addClass("collapse");
            $(`#event_link_${id}`).text("Expand");
        } else {
            console.log(`Expanding ID ${id}`);
            elemDetails.removeClass("collapse").addClass("expand");
            $(`#event_link_${id}`).text("Collapse");
        }
    })
}

const rebuildEventList = () => {
    rebuildExpandableElementsFromData(eventsShowing);
}

const setDisplayState = (state) => {
    isPlaying = (state === "play");
    if (!isPlaying) eventsShowing = Array.from(eventsAll);
    console.log(`State is now isPlaying: ${isPlaying}`);
}

const clearEvents = () => {
    eventsAll = [];
    eventsShowing = [];
    rebuildEventList();
}

const listenToWebSocket = function(domid) {
    const appendEvent = (data) => {
        // add to array
        const obj = Object.assign({
            "expandable": data.hasOwnProperty("attributes"),
            "isExpanded": false
        }, data);
        if (obj.hasOwnProperty("attributes")) {
            obj.attributes = Object.keys(obj.attributes).sort().reduce((buffer, key) => {
                const txt = key + " = " + obj.attributes[key] + "\n";
                buffer = buffer + txt;
                return buffer;
            }, "")
        } else {
            obj.attributes = "";
        }
        
        eventsAll.unshift(obj);
        eventsAll.length = 25;
        if (isPlaying) {
            eventsShowing = eventsAll;

            // rebuild ui
            rebuildEventList();
        }
    }
    const appendStatus = (txt) => {
        appendEvent({
            "msg": txt,
            "expandable": false
        });
    }

    appendStatus('... Opening Connection ...')
    appendStatus('... Waiting for events stream (please have patience) ...')
    fetch(`/api/events`, {
        'credentials': 'same-origin',
        'headers': {
            'Content-Type': 'application/json'
        }
    }).then(resp => {
        return resp.json()
    }).then(obj => {
        // see if success
        if (obj.hasOwnProperty("success") && !obj.success) {
            // not success
            appendStatus(`... Unable to initiate build: ${obj.message}`)
            appendStatus('... Done ...')
            return
        }

        // et build id and initiate websocket
        let buildId =  obj.buildId
        console.log(`Connected to server - opening websocket`)
        let url = `${document.location.hostname === 'localhost' ? 'ws' : 'wss'}://${document.location.hostname}:${document.location.port}/`
        let ws = new WebSocket(url)
        ws.addEventListener('open', (event) => {
            console.log("Websocket open");
        })
        ws.addEventListener('message', (event) => {
            // get data
            let data = event.data
            let obj = JSON.parse(data)

            // append status
            appendEvent(obj);
        })
    })

    addExpandableElementsClickHandler();
}
