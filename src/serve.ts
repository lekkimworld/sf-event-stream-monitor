import express from "express";
import passport from "passport";
//@ts-ignore
import {Strategy} from "passport-salesforce-oauth2";
import * as dotenv from "dotenv";
import exphbs from "express-handlebars";
import ensureLogin from "connect-ensure-login";
import session from "express-session";
import bodyParser from "body-parser";
import * as path from 'path';
import http from "http";
//@ts-ignore
import * as websocket from "./websocket.js";
import * as jsforce from "jsforce";
import uuid from "uuid/v1";
import * as stringFormat from "string-format";
import {defaultEvents, SalesforceEvent, getEventPayload} from "./salesforce-events";

const sessionConnections = new Map<string,jsforce.Connection>();
const supportedStoredEvents : any = {
    "LoginEvent": ["ApiType", "Application", "City", "Country", "Browser", "LoginType", "TlsProtocol", "Id", "LoginUrl"],
    "LogoutEvent": ["LoginKey", "SessionLevel", "SourceIp"],
    "ListViewEvent": ["RowsProcessed", "AppName", "ColumnHeaders", "DeveloperName", "FilterCriteria", "ListViewId", "Records"],
    "ApiEvent": [],
    "CredentialStuffingEventStore": [],
    "IdentityVerificationEvent": [],
    "LoginAsEvent": [],
    "ReportAnomalyEventStore": [],
    "ReportEvent": [],
    "SessionHijackingEventStore": [],
    "UriEvent": []
}

// read env variables from .env
dotenv.config();

// extend stering with formatting
stringFormat.extend(String.prototype, {});

// create app
const app = express();
app.use(session({
    secret: process.env.SESSION_SECRET || 'keyboard cat', 
    resave: true, 
    saveUninitialized: true
}));
app.use(bodyParser.urlencoded({
    extended: true
}))
app.use(express.static(path.join(__dirname, "..", "public")))

// configure express for authentication using salesforce
app.use(passport.initialize());
passport.use(new Strategy({
    "clientID": process.env.SF_CLIENT_ID,
    "clientSecret": process.env.SF_CLIENT_SECRET,
    "callbackURL": process.env.SF_CALLBACK_URL,
    "authorizationURL": (function() {
        if (process.env.SF_MYDOMAIN) return `https://${process.env.SF_MYDOMAIN}.my.salesforce.com/services/oauth2/authorize`;
        if (process.env.SF_SANDBOX) return `https://test.salesforce.com/services/oauth2/authorize`;
        return `https://login.salesforce.com/services/oauth2/authorize`;
    })(),
    "tokenURL": (function() {
        if (process.env.SF_MYDOMAIN) return `https://${process.env.SF_MYDOMAIN}.my.salesforce.com/services/oauth2/token`;
        if (process.env.SF_SANDBOX) return `https://test.salesforce.com/services/oauth2/token`;
        return `https://login.salesforce.com/services/oauth2/token`;
    })()
}, (accessToken : string, refreshToken : string, profile : object, done : (err:Error|undefined, profile:object|undefined) => {}) => {
	//@ts-ignore
	profile.oauth = {
		"accessToken": accessToken
	}
    done(undefined, profile);
}));
passport.serializeUser((user, cb) => {
    cb(null, user);
});
passport.deserializeUser((obj, cb) => {
    cb(null, obj);
});
app.use(passport.session());

// configure handlebars
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

// send to tls is production
if (process.env.NODE_ENV === "production") {
    app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https') {
            res.redirect(`https://${req.header('host')}${req.url}`);
        } else {
            next();
        }
    })
}

// handle connection back to salesforce
app.use((req, res, next) => {
    //@ts-ignore
    if (req.user && req.session && !sessionConnections.has(req.session.id)) {
        //@ts-ignore
        const connection = new jsforce.Connection({
            //@ts-ignore
            "accessToken": req.user.oauth.accessToken,
            "instanceUrl": process.env.SF_INSTANCE_URL,
            "version": "48.0"
        });
        sessionConnections.set(req.session.id, connection);
    }
    next();
})


app.get('/login', passport.authenticate('salesforce'));

app.get('/logout', (req, res) => {
    const callback = (err:Error|undefined) => {

    }
    if (req.session) {
        req.session.destroy(callback);
    }
    res.redirect("/");
});

app.get("/oauth/callback", passport.authenticate('salesforce', { failureRedirect: '/login' }), (req, res) => {
	res.redirect('/home');
});

app.get("/", (req, res) => {
    return res.render("root");
});

app.get("/home", ensureLogin.ensureLoggedIn(), (req, res) => {
    return res.render("home", {"user": req.user});
});

app.get("/streaming-events", ensureLogin.ensureLoggedIn(), (req, res) => {
    return res.render("streaming-events", {"user": req.user});
});

app.get("/stored-events", ensureLogin.ensureLoggedIn(), (req, res) => {
    return res.render("stored-events", {"user": req.user});
});

app.get("/about", ensureLogin.ensureLoggedIn(), (req, res) => {
    return res.render("about", {"user": req.user});
});

app.get("/api/subscribe/:topic", ensureLogin.ensureLoggedIn(), (req, res) => {
    const topic = Buffer.from(req.params.topic, "base64").toString();

    // get websocket and initialize stream
	const wsController = websocket.getInstance();
    const stream = wsController.getOrInitializeStream();
    //@ts-ignore
    const conn = sessionConnections.get(req.session.id);
    //@ts-ignore
    conn.streaming.topic(topic).subscribe((msg:jsforce.StreamingMessage) => {
        //@ts-ignore
        const txt = `At ${msg.payload.CreatedDate} we detected a ${topic} event`;
        //@ts-ignore
        stream.write({"index": uuid(), "msg": txt, "attributes": msg.payload});
    })
    res.type("json").send({"status": "ok"});
})

app.get("/api/events", ensureLogin.ensureLoggedIn(), (req, res) => {
	// get websocket and initialize stream
	const wsController = websocket.getInstance();
    const stream = wsController.getOrInitializeStream();
    //@ts-ignore
    const conn = sessionConnections.get(req.session.id);

	// listen to topic and stream data to websocket
	Object.keys(defaultEvents).forEach(key => {
		const obj = getEventPayload(key);
		
		//@ts-ignore
		conn.streaming.topic(key).subscribe((msg:jsforce.StreamingMessage) => {
            //@ts-ignore
			stream.write({"index": uuid(), "msg": obj.pattern.format(msg), "attributes": msg.payload});
        })
    })

	// return to caller
	res.type("json");
	return res.send({"status": "success"});
})

app.get("/api/stored-events", ensureLogin.ensureLoggedIn(), (req, res) => {
    res.type("json").send(Object.keys(supportedStoredEvents));
})

app.get("/api/stored-events/:eventName/:limit?", ensureLogin.ensureLoggedIn(), (req, res) => {
    // get params
    const eventName = req.params.eventName;
    const limit = req.params.limit || 100; 

    const conn = sessionConnections.get(req.session!.id);
    new Promise((resolve, reject) => {
        if (!Object.keys(supportedStoredEvents).includes(eventName)) return reject(Error(`Unsupported eventName <${eventName}>`));

        const fields : Array<string> = supportedStoredEvents[eventName];
        ["EventIdentifier", "EventDate", "UserId", "Username"].forEach(f => {
            if (!fields.includes(f)) fields.push(f);
        })
        
        resolve({
            fields,
            "query": `SELECT ${fields.join(",")} FROM ${eventName} ORDER BY EventDate DESC LIMIT ${limit}`
        })

    }).then((queryObj : any) => {
        
        conn!.query(queryObj.query, undefined, (err : Error, result : any) => {
            if (err) return res.type("json").status(500).send({"error": true, "query": queryObj.query, "message": err.message});
            queryObj.data = result;
            res.type("json").send(queryObj);
        })

    }).catch(err => {
        res.type("json").status(500).send({"error": true, "message": err.message});
    })
})


app.get("/api/describe/:eventName", ensureLogin.ensureLoggedIn(), (req, res) => {
    // get params
    const eventName = req.params.eventName;

    const conn = sessionConnections.get(req.session!.id);
    conn!.describe(eventName).then(data => {
        res.type("json").send(data);
    })
})

app.get("/api/user", ensureLogin.ensureLoggedIn(), (req, res) => {
    res.type("json").send(req.user);
})

// listen
const port = process.env.PORT || 8080;
const httpServer = http.createServer(app);
websocket.createInstance(httpServer);
httpServer.listen(port);
console.log(`Listening on port ${port}`);
