export interface SalesforceEvent {
    replayId : number;
    pattern : string;
}

export const defaultEvents : {[key : string]: SalesforceEvent | boolean} = {
    "/event/LoginEventStream": {
        "replayId": -1,
        "pattern": "At {payload.EventDate} {payload.Username} ({payload.UserId}) logged IN with a {payload.SessionLevel} session using {payload.Browser}"
    },
    "/event/LogoutEventStream": {
        "replayId": -1,
        "pattern": "At {payload.EventDate} {payload.Username} ({payload.UserId}) logged OUT"
    },
    "/event/LightningUriEventStream": {
        "replayId": -1,
        "pattern": "At {payload.EventDate} {payload.Username} ({payload.UserId}) opened record w/ ID: {payload.RecordId}"
    },
    "/event/ListViewEventStream": true
};

export const getEventPayload = (key : string) => {
    const payload = defaultEvents[key];
    if (typeof payload === "boolean") {
        // construct default object
        return {
            "replayId": -1,
            "pattern": `At {payload.EventDate} {payload.Username} ({payload.UserId}) did something that caused an event in ${key}`
        } as SalesforceEvent;
    }
    return payload;
}
