import * as jsforce from "jsforce";
import * as dotenv from "dotenv";
import * as stringFormat from "string-format";
import {defaultEvents, SalesforceEvent, getEventPayload} from "./salesforce-events";

// read config from .env file
dotenv.config();
stringFormat.extend(String.prototype, {});

// ensure we run until we are done
let alldone : any = undefined;
global.setInterval(() => {
    if (alldone) {
        if (typeof alldone === "boolean") {
            return process.exit(0);
        } else {
            console.log(alldone);
            return process.exit(1);
        }
    }
}, 1000);

// create username/password connection to Salesforce
const conn = new jsforce.Connection({});
conn.login(process.env.SF_USERNAME as string, `${process.env.SF_PASSWORD}${process.env.SF_SECURITY_TOKEN}`).then(userinfo => {
    // log info
    console.log(`Logged into org as user (${userinfo.id}, ${userinfo.organizationId})...`);
    
    // subscribe to default events
    Object.keys(defaultEvents).forEach(key => {
        const obj = getEventPayload(key);

        console.log(`Subscribing to event ${key} with replayId ${obj.replayId}`);
        //@ts-ignore
        conn.streaming.topic(key).subscribe((msg:jsforce.StreamingMessage) => {
            //@ts-ignore
			console.log(obj.pattern.format(msg));
        })
    })
    
}).catch(err => {
    alldone = err;
})
