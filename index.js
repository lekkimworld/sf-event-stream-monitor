const jsforce = require("jsforce");
const dotenv = require("dotenv");
const format = require("string-format");

dotenv.config();

let alldone = undefined;
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

const conn = new jsforce.Connection();
conn.login(process.env.SF_USERNAME, `${process.env.SF_PASSWORD}${process.env.SF_SECURITY_TOKEN}`).then(userinfo => {
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
        const obj = (() => {
            if (typeof streams[key] === "object") return streams[key];
            return {
                "replayId": -1,
                "pattern": `At {payload.EventDate} {payload.Username} ({payload.UserId}) did something that caused an event in ${key}`
            }
        })()
        conn.streaming.createClient([
            new jsforce.StreamingExtension.Replay(key, obj.replayId)
        ]).subscribe(key, msg => {
            console.log(format(obj.pattern, msg));
        })
    })
    
}).catch(err => {
    alldone = err;
})

