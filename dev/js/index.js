const DOM_EVENTS_ELEMENT_ID = "ws_events";
let isPlaying = false;
let eventsAll = [];
let eventsShowing = [];

const setDisplayState = (state) => {
    isPlaying = (state === "play");
    if (!isPlaying) eventsShowing = Array.from(eventsAll);
    console.log(`State is now isPlaying: ${isPlaying}`);
}

const handleEventClick = (id) => {
    eventsShowing.filter(ev => undefined !== ev).forEach(ev => {
        if (id === `event_${ev.index}`) {
            ev.isExpanded = !ev.isExpanded;
        }
    })
    rebuildEventList();
}

const rebuildEventList = () => {
    const buildUIRepresentation = (obj) => {
        const attributes = obj.hasOwnProperty("attributes") ? Object.keys(obj.attributes).sort().reduce((buffer, key) => {
            const txt = key + " = " + obj.attributes[key] + "\n";
            buffer = buffer + txt;
            return buffer;
        }, "") : "";
        const mainBody = `<div class="fluid-container p-2 mt-1 event-container">
    <div class="row pl-2">
        <div class="col-sm-10">
            ${obj.msg}
        </div>
        <div class="col-sm-2">
            ${obj.expandable ? "<a href=\"#event_" + obj.index + "\" id=\"event_" + obj.index + "\" class=\"btn btn-primary float-right\" data-toggle=\"collapse\">" + (obj.isExpanded ? "Collapse": "Expand") + "</a>" : ""}
        </div>
        <div id="event${obj.index}" class="event-expandable ${obj.isExpanded ? "expand" : "collapse"}">
            <div class="ml-2 mr-3 mt-2 row clearfix event-details">
                <pre class="col-sm-12"><code>${attributes}</code></pre>
            </div>
        </div>
    </div>
</div>`;
        return mainBody;
    }

    // build ui representation
    const uiHTML = eventsShowing.filter(obj => undefined !== obj).reduce((buffer, ev) => {
        return buffer + buildUIRepresentation(ev);
    }, "");

    // show
    document.querySelector(`#${DOM_EVENTS_ELEMENT_ID}`).innerHTML = uiHTML;
}

const listenToWebSocket = function(domid) {
    const appendEvent = (data) => {
        // add to array
        const obj = Object.assign({
            "expandable": data.hasOwnProperty("attributes"),
            "isExpanded": false
        }, data);
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
}