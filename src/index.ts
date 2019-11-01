import * as jsforce from "jsforce";
import * as dotenv from "dotenv";
import * as stringFormat from "string-format";

dotenv.config();
stringFormat.extend(String.prototype, {});

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

const conn = new jsforce.Connection({});
conn.login(process.env.SF_USERNAME as string, `${process.env.SF_PASSWORD}${process.env.SF_SECURITY_TOKEN}`).then(userinfo => {
    console.log(conn)
    console.log(`Logged into org as user (${userinfo.id})...`);
    const streams = {
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
    }
    Object.keys(streams).forEach(key => {
        const obj : object = (() => {
            if (typeof streams[key] === "object") return streams[key];
            return {
                "replayId": -1,
                "pattern": `At {payload.EventDate} {payload.Username} ({payload.UserId}) did something that caused an event in ${key}`
            }
        })()
        //@ts-ignore
        conn.streaming.createClient([
            //@ts-ignore
            new jsforce.StreamingExtension.Replay(key, obj.replayId)
        ]).subscribe((key:string, msg:any) => {
            console.log(key);
            console.log(msg);
            //@ts-ignore
            console.log(obj.pattern.format(msg));
        })
    })
    
}).catch(err => {
    alldone = err;
})

